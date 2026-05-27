# Research: デイリーポイント付与バグ修正

## 根本原因調査

### Decision: バグの根本原因は `jwt` コールバックの発火タイミング

**Rationale**:

`auth.ts` のデイリーポイント付与ロジックは next-auth v5 の `jwt` コールバック内に置かれている。

```
async jwt({ token, profile }) {
  // ...
  if (token.userId) {
    const alreadyGranted = await hasDailyPointToday(Number(token.userId));
    if (!alreadyGranted) await grantDailyPoints(Number(token.userId));
  }
}
```

next-auth v5（JWT 戦略）では、`jwt` コールバックは以下のタイミングのみ発火する:
1. **OAuth サインイン時**（`profile` が渡される）
2. **トークンリフレッシュ時**（`updateAge` の設定に依存。デフォルト 24 時間ごと）

Server Component から `auth()` を呼ぶだけでは `jwt` コールバックは発火しない。
このため:
- ユーザーが Day 1 にログイン → ポイント付与 ✓（サインイン時に jwt 発火）
- ユーザーが Day 2 にページ訪問（セッション継続）→ jwt 発火なし → ポイント未付与 ✗
- ユーザーが Day 2 に再ログイン → jwt 発火 → `hasDailyPointToday` が当日 Day 1 の付与を参照して true を返す → 付与なし ✗（同日中の再ログイン場合。翌日再ログインなら false になるはずだが、セッションが残っている場合の挙動に依存）

既存の `hasDailyPointToday()` と `grantDailyPoints()` のロジック自体は正しい。問題はこれらを呼び出す**タイミング（トリガー）**にある。

**Alternatives considered**:
- `jwt` コールバックの `updateAge` を短縮（毎時リフレッシュ）: セッション Cookie の頻繁な更新によりパフォーマンスと帯域幅に影響、根本解決にならない
- `session` コールバックに移動: `session` コールバックも `jwt` と同様に発火しない場合がある
- Middleware での対応: Edge Runtime の制約でデータベースアクセスが難しい

---

## 修正アプローチ

### Decision: `Header.tsx`（Server Component）に日次ポイント付与チェックを追加

**Rationale**:

`Header.tsx` はすべてのページでレンダリングされる Server Component であり、すでに `auth()` と `getPointBalance()` を呼び出している。ここにデイリーポイントチェックを追加することで:
- 再ログイン・セッション継続の両方で確実に発火する
- 既存の DB アクセスに 1 クエリを追加するだけ（`hasDailyPointToday`）
- ポイントを付与した場合も `getPointBalance` が正確な残高を返す

さらに、`auth.ts` の `jwt` コールバックのポイント付与は**残したまま**にする:
- サインイン直後にも即座にポイントが付与される（UX 向上）
- `Header.tsx` でのチェックが二重チェックになるが、`hasDailyPointToday` がガード役を果たすため重複付与されない

**Alternatives considered**:
- `page.tsx`（トップページ）のみに追加: 管理画面などへ直接アクセスした場合に付与されない
- 専用 API エンドポイント `/api/points/daily-check` をクライアントから非同期呼び出し: ネットワーク往復が増加し、付与タイミングがページ描画後になる
- `page.tsx` + `post/new/page.tsx` など複数ページに追加: 重複コードが増加

---

## 副次バグ調査

### Decision: `getPointBalance` の `dailyRows` クエリに軽微な集計ロジック不整合があるが、今回の修正範囲外

**Rationale**:

`points.ts` の `getPointBalance` の `dailyRows` クエリは:
```
lt(userPoints.expiresAt, todayEnd)   // expiresAt < todayEnd (strictly less than)
```

`grantDailyPoints` は `expiresAt = todayEnd` で INSERT するため、`lt(expiresAt, todayEnd)` = false となり `daily` カウントが 0 になる。ただし `total` は正しく計算されるため、ユーザー表示（`残 Npt`）には影響しない。`daily` フィールドは現在 UI で使用されていないため、実害なし。今回の修正スコープ外とする。

---

## 変更対象ファイル

| ファイル | 変更内容 | 優先度 |
|----------|----------|--------|
| `negotole/src/components/Header.tsx` | デイリーポイントチェック追加（`hasDailyPointToday` + `grantDailyPoints`） | US1/US2 (P1) |
| `negotole/src/lib/auth.ts` | `jwt` コールバックのポイント付与ロジックは**維持**（サインイン時のファーストグラント保証） | 変更なし |
