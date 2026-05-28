# Research: キャッシュ戦略修正

**Branch**: `011-fix-cache-strategy` | **Date**: 2026-05-28

## 調査項目と結論

---

### 1. Issue 13: Header ポイント表示がページ全体と同期されない

#### 根本原因

`Header.tsx` は `getPointBalance()` を直接 DB クエリで呼び出しており、**現時点ではキャッシュされていない**。しかし `route.ts` の POST ハンドラーが `revalidatePath("/")` を呼んでいるのは、Next.js App Router の Full Route Cache（または RSC ペイロードキャッシュ）を "/" 以外のパスに対して無効化できていないことを示す。

Route Handler からの `revalidatePath` の挙動（Next.js 16 公式ドキュメントより）:
> "Route Handlers: Marks the path for revalidation. The revalidation is done on the next visit to the specified path."

つまり `revalidatePath("/")` は "/" のキャッシュしか無効化しない。`/admin/campaigns` 等のページで Header が表示されるとき、そのページの RSC ペイロードは再検証されない。

#### 決定: `unstable_cache` + `revalidateTag` アプローチ

- **Decision**: `unstable_cache` で `getPointBalance` をユーザー別タグ付きキャッシュ化し、ポイント変動時に `revalidateTag` で全ページ横断的に無効化する
- **Rationale**: `cacheComponents: true` が未設定なため `use cache` / `cacheTag` は使えない。`unstable_cache` が Next.js 16 非 `cacheComponents` 環境での公式対応手段
- **Alternatives considered**:
  - `revalidatePath` の対象パス列挙: `/`, `/post/new`, `/admin/campaigns` など全パスを列挙するのは保守困難
  - `cacheComponents: true` を有効化して `use cache` に移行: 将来的には推奨だが今回のスコープ外

#### タグ粒度の設計

| 案 | タグ名 | メリット | デメリット |
|----|--------|----------|------------|
| A (採用) | `user-points-${userId}` | ユーザー別に無効化、他ユーザーへの影響ゼロ | revalidateTag 呼び出し時に userId が必要 |
| B | `user-points` | シンプル | ポイント変動時に全ユーザーのキャッシュが無効化される |

案 A を採用。POST ハンドラーはセッションから `userId` を取得済みのため問題なし。

#### `grantDailyPoints` 後の整合性

`Header.tsx` が同一リクエスト内で `grantDailyPoints` → `getPointBalance` の順で呼ぶ。`unstable_cache` はリクエスト間をまたいだキャッシュのため、同一リクエスト内では初回アクセス時にキャッシュミスが発生し、常に DB から最新値を取得する。問題なし。

---

### 2. Issue 14: タイムライン投稿の Cache-Control 未設定

#### 根本原因

GET `/api/posts` の Route Handler が `NextResponse.json(result)` を返しており、`Cache-Control` ヘッダーが未設定。ブラウザおよび CDN はレスポンスをデフォルトの挙動でキャッシュする可能性がある。

#### 決定: `Cache-Control: no-store` を明示

- **Decision**: `NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })` を返す
- **Rationale**: 投稿一覧はリアルタイム性が重要であり、いかなるキャッシュも許容しない。`no-store` はブラウザ・CDN 双方に対してキャッシュ禁止を指示する最も明確な指示
- **Alternatives considered**:
  - `export const dynamic = 'force-dynamic'`: ルートセグメント全体を動的化するが、POST ハンドラーへの影響が不明確
  - `max-age=0, must-revalidate`: 技術的には同等だが意図が不明確

---

### 3. `revalidatePath` の削除可否

現在 POST ハンドラーに `revalidatePath("/")` と `revalidatePath("/post/new")` がある。`revalidateTag` 導入後はこれらは冗長になる。

- **Decision**: `revalidatePath` は削除し、`revalidateTag(\`user-points-${userId}\`, "max")` に完全置換
- **Rationale**: `revalidatePath` は `"/"` のみを無効化するため不十分。`revalidateTag` で全ページのユーザーポイントキャッシュを横断的に無効化できる

---

### 4. Next.js 16 `unstable_cache` の注意事項

ドキュメントより:
- `unstable_cache` の `revalidate` オプションを省略または `false` にすると、`revalidateTag` または `revalidatePath` が呼ばれるまで永続キャッシュ
- `tags` は静的な文字列配列でのみ指定可能（関数不可）
- `keyParts`（第 2 引数）にユーザー ID を含めてユーザー別キャッシュエントリを作成する

```ts
// 正しい実装パターン
function getCachedPointBalance(userId: number) {
  return unstable_cache(
    () => getPointBalance(userId),
    [`point-balance-${userId}`],  // ユーザー別キャッシュキー
    {
      tags: [`user-points-${userId}`],  // ユーザー別タグ
      revalidate: false,               // revalidateTag まで永続
    }
  )();
}
```

---

### 5. `revalidateTag` の第 2 引数について

Next.js 16 の revalidateTag ドキュメントより:
> "The single-argument form revalidateTag(tag) is deprecated."

- **Decision**: `revalidateTag(\`user-points-${userId}\`, "max")` の 2 引数形式を使用
- `"max"` は stale-while-revalidate セマンティクスを提供し、推奨される動作

---

## 未解決事項

なし。すべての調査項目が解決済み。
