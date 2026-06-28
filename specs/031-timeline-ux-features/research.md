# Research: タイムライン UX 機能群

## ランダムタイムライン

**Decision**: PostgreSQL `ORDER BY RANDOM()` をサーバー側で使用（Drizzle ORM: `sql\`RANDOM()\``）

**Rationale**: Next.js API Route 内で実行するため DB 側でランダムが最もシンプル。クライアント側シャッフルは「全件取得 → シャッフル」が必要でページネーションが破綻する。

**Alternatives considered**:
- クライアント側シャッフル: 全件ロード必須でページネーションが機能しない
- シード付き RANDOM: 再現性が出てしまい体験の意図に反する

**Cursor pagination with RANDOM**: ORDER BY RANDOM() は実行毎に変わるためカーソルが機能しない。「もっと見る」で OFFSET 的に次の 20 件を取得するが、重複が起きうる（スペックの Assumptions に許容と明記）。実装上は `cursorId` パラメータが来ても、ランダムモードでは `ORDER BY RANDOM() LIMIT 20` のみとし、cursorId によるフィルタリングは行わない。

**Polling with RANDOM**: `topPostIdRef` は表示順の最初の ID ではなく、取得した投稿の最大 ID を追跡するよう変更する。これにより `?since=<maxId>` での新着ポーリングが正しく機能する。

---

## アクティブ投稿数バナー

**Decision**: `fetchPosts` 内で `SELECT COUNT(*)` を並列実行し、`totalActive` として結果に含める

**Rationale**: 既存の fetchPosts 1 回の呼び出しでカウントも取得できる。Drizzle の `.execute()` や Promise.all で並列化可能。

**Alternatives considered**:
- 別 API エンドポイント `/api/posts/count`: 呼び出し回数が増える
- タイムラインのレスポンス posts.length のみ使用: ページネーション分しか分からず全体数が取れない

---

## 深夜フィルター（夜の寝言）

**Decision**: クライアント側 `applyFilter` 関数を拡張、`createdAt` の JST 時刻 (hour) で判定

**Rationale**: 既存の残り時間フィルター（soon/medium/later）と同じアーキテクチャ層で統一。DB クエリ変更が不要。

**JST 変換**: `(new Date(createdAt).getUTCHours() + 9) % 24` で UTC から JST の時（hour）を求め、`hour >= 22 || hour < 5` の条件で深夜帯判定する。

**Alternatives considered**:
- API クエリ条件追加: サーバー側実装が増え、ページネーション済みデータへの後付けフィルター（クライアント側）と二重管理になる

---

## 揺らぎアニメーション

**Decision**: CSS `@keyframes wobble` を `globals.css` に追加、`CountdownTimer` に `onNearExpiry` callback を追加

**Animation style**: `translateX(0.8px) translateY(-0.8px)` の微細振動。2.4 秒ループで有機的な揺らぎを演出。

```css
@keyframes wobble {
  0%, 100% { transform: translateX(0) translateY(0); }
  20%       { transform: translateX(0.8px) translateY(-0.6px); }
  40%       { transform: translateX(-0.6px) translateY(0.8px); }
  60%       { transform: translateX(0.6px) translateY(0.4px); }
  80%       { transform: translateX(-0.8px) translateY(-0.4px); }
}
```

**CountdownTimer 拡張**: 残り時間が 300,000ms (5分) 以下になった瞬間に `onNearExpiry?.()` を一度だけ呼ぶ。`nearExpiredRef` で重複呼び出しを防ぐ。

**PostCard での `isNearExpiry` 初期値**: マウント時に `new Date(hiddenAt).getTime() - Date.now() <= 300_000` で既に閾値以下なら `true` で初期化する（既に期限切れ近い投稿にアニメーションが即時適用されるよう）。

---

## ブラインドポスト

**Decision**: 実装変更なし。API が `userId` を返さないことを確認するのみ。

**Verification**: `fetchPosts` が返す `PostRow` 型は `{ id, content, hiddenAt, createdAt }` で `userId` は含まれない。タイムライン API レスポンス JSON に userId フィールドは存在しない。PostCard は受け取った post オブジェクトをそのまま表示し、ユーザー識別情報を一切使用しない。

**Rationale**: 既存実装がスペック要件（FR-008, FR-009）を既に満たしているため追加実装不要。
