# コードレビュー結果 — `026-next-phase-features`

対象ブランチ: `026-next-phase-features`（PR #298）
レビュー日: 2026-06-27

---

## 発見一覧（重大度順）

### 🔴 CRITICAL

#### 1. `Timeline.tsx:62` — ポーリングが完全に無音で失敗する

`Buffer.from()` は Node.js 専用 API。クライアントコンポーネントの 30 秒ポーリング内で呼ばれるため、ブラウザでは `ReferenceError: Buffer is not defined` が発生する。76 行目の `try/catch` がそのエラーを握り潰すため、UI にはエラーが一切表示されず新着投稿が永遠に表示されない。

**修正:** `Buffer.from(String(sinceId)).toString('base64')` → `btoa(String(sinceId))`

---

#### 2. `post/[id]/page.tsx:104` — Server Component 内の `onClick` でコピーボタンが完全に無反応

`PostDetailPage` に `'use client'` がなく Server Component。React は関数をサーバーからクライアントへシリアライズできないため `onClick` プロップがレンダリング済み HTML から除去される。111 行目の `suppressHydrationWarning` は症状を隠蔽するだけ。

**修正:** コピーボタンを `CopyLinkButton.tsx`（`"use client"`）として切り出し、`postUrl` を props で渡す。

---

### 🟠 HIGH

#### 3. `auth.ts:43` — BAN されたゲストユーザーが新規アカウント自動生成で BAN 回避できる

`guestUserId` に対応する既存ゲストが `bannedAt ≠ null` の場合、`if (existing && !existing.bannedAt)` が `false` になり 48 行目の `INSERT` にフォールスルーして新規ゲストが生成される。`GuestPersistenceHandler` が localStorage を新 ID で上書きするため、BAN されたゲストは即座にフレッシュなアカウントを取得できる。

**修正:**
```ts
if (existing) {
  if (existing.bannedAt) return null; // BAN → ログイン拒否
  return { id: String(existing.id), ... };
}
```

---

#### 4. `api/posts/[id]/report/route.ts:7` — `VALID_REASONS` がバリデーションに使われていない

`VALID_REASONS = ['スパム', '不適切なコンテンツ', '誹謗中傷', 'その他']` は定義されているが、30 行目の検証は文字数（1〜255）しか確認しない。ブラウザ UI をバイパスした直接 API 呼び出しで任意文字列が `reason` として保存される。

**修正:** `if (!VALID_REASONS.includes(reason.trim())) return NextResponse.json({ error: '無効な通報理由' }, { status: 400 })`

---

#### 5. `api/posts/[id]/report/route.ts:44` — 同一ユーザーが同一投稿を無制限に通報できる

`(post_id, reporter_id)` に UNIQUE 制約がなくコードにも重複チェックがない。ページリロードで何度でも同じ投稿を通報でき、管理者の通報一覧が重複エントリで溢れる。

**修正:** スキーマに `uniqueIndex('report_post_reporter_uidx', [t.postId, t.reporterId])` を追加し、ルートで 409 を返すか `INSERT ... ON CONFLICT DO NOTHING` を使う。

---

#### 6. `admin/page.tsx:34` — `Promise.all` にエラーハンドリングがなくダッシュボードがクラッシュする

5 つの DB クエリのどれか 1 つでも失敗すると `Promise.all` がリジェクトし、ページ全体がエラー画面になる。

**修正:** `Promise.allSettled` に切り替え、各クエリのフォールバック値（`0`）を設定する。

---

### 🟡 MEDIUM

#### 7. `CountdownTimer.tsx:47` — `onExpire` が useEffect 依存配列に含まれタイマーが毎 render 再登録される

`Timeline.tsx:143` で `onExpire={() => handleExpire(post.id)}` を毎 render 生成している。30 秒ポーリングで `setPosts` が呼ばれるたびに全 `CountdownTimer` が `clearInterval` → `setInterval` される。

**修正:** `CountdownTimer` 内で `const onExpireRef = useRef(onExpire); onExpireRef.current = onExpire;` としてコールバックを ref でラップし、`useEffect` deps から `onExpire` を除外する。

---

#### 8. `admin/campaigns/[id]/applications/page.tsx:113` — 行番号計算が誤り

`(cursorId ?? 0) + i + 1` で行番号を算出しているが、`cursorId` は DB の主キー ID でありオフセットではない。ID に欠番があると実際の応募順番号とズレる。

**修正:** ページ内の相対番号 `i + 1` に統一するか、URL パラメータで通算オフセットを引き渡す。

---

#### 9. `admin/page.tsx:7` — `getJSTTodayBounds` が `lib/points.ts` の `getJSTDayBounds` と一字一句同一

JST 境界ロジックを変更する際に片方だけ修正されると、ダッシュボード集計とポイント付与の日付境界がズレる。また `todayEnd` が算出されるが使われていない（デッドコード）。

**修正:** `import { getJSTDayBounds } from "@/lib/points"` に置き換え、ローカル定義を削除する。

---

### 🔵 LOW

#### 10. `ResolveReportButton.tsx:13` — PATCH エラーが無音で握り潰される

`catch` ブロックが空で `finally` はローディング状態をリセットするだけ。PATCH が 4xx/5xx を返しても管理者にエラーフィードバックがなく、未解決のまま放置される可能性がある。

**修正:** `res.ok` チェックを追加し、エラー時に `setError('解決に失敗しました')` を表示する。

---

#### 11. `GuestLoginButton.tsx:6` / `GuestPersistenceHandler.tsx:5` — `GUEST_ID_KEY` 定数が重複

`"negotole_guest_id"` という文字列リテラルが 2 ファイルに重複している。片方だけ変更するとゲスト永続化が壊れる。

**修正:** `lib/constants.ts` 等に `export const GUEST_ID_KEY = "negotole_guest_id"` として切り出す。

---

#### 12. `admin/reports/page.tsx:71` — ページ内件数（最大 50）を総通報数として表示

`items.length` は常に最大 50。通報が 300 件ある状態でも各ページのヘッダーは「50 件」と表示され、管理者がキューの深さを把握しにくい。

**修正:** 件数表示を「このページの件数」と明記するか、別途 `COUNT(*)` クエリを実行して総数を表示する。

---

#### 13. `admin/page.tsx:4` — 未使用インポート `lt`

`import { ..., lt, ... } from "drizzle-orm"` の `lt` はどこでも使われていない。

**修正:** インポートから削除する。

---

#### 14. `lib/posts.ts` — `sinceId` と `cursorId` の同時指定をガードしない

両方指定されると `WHERE id > sinceId AND id < cursorId` という矛盾条件になり、`sinceId >= cursorId` の場合は常に空集合を返す。

**修正:** `fetchPosts` の先頭で排他チェックを追加するか、API ルートで両パラメータ同時送信を 400 で弾く。

---

#### 15. `post/[id]/page.tsx:17` — `generateMetadata` と `PostDetailPage` が同一クエリで DB を 2 回叩く

リクエストごとに同一 `WHERE` 条件の `SELECT` が 2 回実行される。

**修正:** `React.cache()` でラップした共通フェッチ関数を両方から呼び出す。

---

---

## 設計変更決定事項

### ゲストアカウント永続化を削除する

`GuestLoginButton` / `GuestPersistenceHandler` / `auth.ts` の `guestUserId` 対応は**削除する**。

**理由:** `guestUserId` は連番 BigInt のため列挙可能。ID を知っていれば他人のゲストセッションに成り済まし可能（ポイント横取り・投稿成り済ましのリスク）。トークン検証で修正する案もあるが、そもそもゲスト永続化は不要と判断。

**削除対象:**
- `negotole/src/components/GuestLoginButton.tsx`
- `negotole/src/components/GuestPersistenceHandler.tsx`
- `negotole/src/lib/actions.ts`（`guestSignIn` のみ使用している場合）
- `negotole/src/app/(app)/layout.tsx` — `GuestPersistenceHandler` の呼び出し
- `negotole/src/components/Header.tsx` — `GuestLoginButton` → 元の Server Component インラインフォームに戻す
- `negotole/src/lib/auth.ts` — `guestUserId` 受け取りロジック・`isGuest` フラグ（不要になる場合）
- `negotole/src/types/next-auth.d.ts` — `isGuest` 型定義（不要になる場合）

---

## 修正優先度サマリー

| # | 重大度 | ファイル | 行 | 概要 |
|---|--------|----------|----|------|
| 1 | 🔴 CRITICAL | `Timeline.tsx` | 62 | ポーリング完全無効（Buffer） |
| 2 | 🔴 CRITICAL | `post/[id]/page.tsx` | 104 | コピーボタン無反応（Server Component onclick） |
| 3 | 🟠 HIGH | `auth.ts` | 43 | BAN ゲストが BAN 回避 |
| 4 | 🟠 HIGH | `report/route.ts` | 7 | `VALID_REASONS` 未バリデーション |
| 5 | 🟠 HIGH | `report/route.ts` | 44 | 重複通報制限なし |
| 6 | 🟠 HIGH | `admin/page.tsx` | 34 | `Promise.all` エラーなし |
| 7 | 🟡 MEDIUM | `CountdownTimer.tsx` | 47 | タイマー毎 render 再登録 |
| 8 | 🟡 MEDIUM | `applications/page.tsx` | 113 | 行番号計算誤り |
| 9 | 🟡 MEDIUM | `admin/page.tsx` | 7 | JST ロジック重複・`todayEnd` デッドコード |
| 10 | 🔵 LOW | `ResolveReportButton.tsx` | 13 | エラー無音 |
| 11 | 🔵 LOW | `GuestLoginButton.tsx` / `GuestPersistenceHandler.tsx` | 6/5 | `GUEST_ID_KEY` 重複 |
| 12 | 🔵 LOW | `admin/reports/page.tsx` | 71 | 件数表示が不正確 |
| 13 | 🔵 LOW | `admin/page.tsx` | 4 | 未使用 `lt` インポート |
| 14 | 🔵 LOW | `lib/posts.ts` | — | `sinceId` + `cursorId` 同時指定非ガード |
| 15 | 🔵 LOW | `post/[id]/page.tsx` | 17 | DB を 2 回クエリ（`React.cache` で統合可） |
