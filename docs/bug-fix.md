# Bug Fix

作成日: 2026-06-09

---

## Bug 1: 消費レコードの `expiresAt` が常に `null`（重要）

**ファイル**: `negotole/src/app/api/posts/route.ts:88-90`

### 現象

投稿 API のポイント消費レコードが `expiresAt: null`（恒久扱い）で挿入されている。
`getPointBalance()` はデイリー（`expiresAt > NOW()`）と恒久（`expiresAt IS NULL`）を別々に集計するため、
デイリーポイントのみのユーザーが投稿すると恒久ポイントの表示がマイナスになる。

また `points.ts` に定義されている `consumeOnePoint()` は `expiresAt: todayEnd` で設定しており、
投稿 API の実装と矛盾している。`consumeOnePoint()` 自体は未使用のデッドコードになっている。

### 再現シナリオ

1. デイリーポイントのみ 10pt を持つユーザーが投稿する
2. ポイント内訳: デイリー 10pt、恒久 -1pt、合計 9pt（恒久がマイナス表示）
3. 翌日にデイリー 10pt が付与されると: デイリー 10pt、恒久 -1pt、合計 9pt（恒久のマイナスが積み上がる）

### 原因

```typescript
// api/posts/route.ts（現状）
await tx.insert(userPoints).values({
  userId,
  getPoint: -1,
  expiresAt: null,  // 常に恒久扱い
});

// points.ts の consumeOnePoint()（未使用）
await db.insert(userPoints).values({
  userId,
  getPoint: -1,
  expiresAt: todayEnd,  // デイリーと同じ期限
});
```

### 修正方針

- 投稿 API でデイリーポイントが残っている場合は `expiresAt: todayEnd` で消費レコードを作成する
- 恒久ポイントのみから消費する場合は `expiresAt: null` のまま
- トランザクション内で残高内訳を取得し、デイリー残高に応じて `expiresAt` を決定する
- `consumeOnePoint()` は削除するか、上記ロジックを持つ形に統合する

---

## Bug 2: `Timeline.loadMore()` でエラーハンドリングがない

**ファイル**: `negotole/src/components/Timeline.tsx:29-31`

### 現象

「もっと見る」ボタン押下時に API がエラーを返すと（ネットワーク断・レートリミット等）、
`data.posts` が `undefined` になり `...undefined` で TypeError がスローされる。
ユーザーには何も表示されず無言でクラッシュする。

### 原因

```typescript
async function loadMore() {
  // ...
  const res = await fetch(`/api/posts?cursor=${nextCursor}`);
  const data = await res.json();
  setPosts((prev) => [...prev, ...data.posts]);  // res.ok チェックなし
  setNextCursor(data.nextCursor);
  // ...
}
```

### 修正方針

```typescript
if (!res.ok) {
  // エラー状態を state に持たせてユーザーに表示する
  setError("読み込みに失敗しました");
  return;
}
```

---

## Bug 3: デイリーポイント付与の TOCTOU 競合

**ファイル**: `negotole/src/components/Header.tsx:12-18` / `negotole/src/lib/auth.ts:130-137`

### 現象

同一ユーザーへのリクエストが並行して来た場合、デイリーポイントが二重付与される可能性がある。

### 原因

`hasDailyPointToday()` → `grantDailyPoints()` という非アトミックな check-then-act になっており、
2リクエストが `hasDailyPointToday()` を同時に通過すると両方が INSERT を実行する。
さらに `Header.tsx` が `auth()` を呼ぶと `jwt` コールバックも走るため、
1リクエスト中で同じチェックが最大2回走る構造になっている。

```
[リクエスト A] hasDailyPointToday() → false
[リクエスト B] hasDailyPointToday() → false  ← A の INSERT 前に読んでしまう
[リクエスト A] grantDailyPoints() → INSERT
[リクエスト B] grantDailyPoints() → INSERT   ← 二重付与
```

### 修正方針

- `Header.tsx` からデイリーポイント付与ロジックを削除し、`auth.ts` の `jwt` コールバックに一本化する
- 根本対策として `user_point` テーブルに `(user_id, DATE(created_at))` の UNIQUE 制約またはアドバイザリロックを追加し、DB レベルで重複挿入を防ぐ

---

## Bug 4: キャンペーン編集ページが21件目以降を編集不可

**ファイル**: `negotole/src/app/(app)/admin/campaigns/[id]/edit/page.tsx:26-37`

### 現象

キャンペーン編集ページが `/api/admin/campaigns`（ページネーション付きリスト、デフォルト20件）を全件フェッチしてフロント側で `find()` している。
キャンペーンが21件以上存在すると、21件目以降のキャンペーンは `find()` で見つからず「キャンペーンが見つかりません。」エラーになり編集できない。

### 原因

```typescript
useEffect(() => {
  fetch("/api/admin/campaigns")          // ← 最初の20件しか返らない
    .then((r) => r.json())
    .then((data) => {
      const found = data.campaigns?.find((c: Campaign) => String(c.id) === id);
      if (found) {
        setCampaign(found);
      } else {
        setError("キャンペーンが見つかりません。");  // ← 21件目以降はここに来る
      }
    });
}, [id]);
```

`/api/admin/campaigns/${id}` の `GET` エンドポイントが未実装で、個別取得する手段がない。

### 修正方針

- `/api/admin/campaigns/[id]/route.ts` に `GET` ハンドラを追加して単件取得を実装する
- 編集ページは `fetch("/api/admin/campaigns/${id}")` で直接取得するよう変更する

---

## Bug 5: キャンペーン新規作成フォームの日時がタイムゾーンなしでサーバーに送られる

**ファイル**: `negotole/src/app/(app)/admin/campaigns/new/page.tsx:21-22`

### 現象

`datetime-local` input の value（`"2026-06-09T14:30"` のようなタイムゾーン情報なし文字列）をそのままAPIに送信している。
Node.js（V8）は ECMAScript の仕様に従い、タイムゾーン指定のない日時文字列を **UTC** として解析する。
JST（UTC+9）のブラウザで入力した `14:30` が UTC `14:30`（= JST `23:30`）として保存される。

### 原因

```typescript
// new/page.tsx（バグあり）
startsAt: (form.elements.namedItem("startsAt") as HTMLInputElement).value,
// → "2026-06-09T14:30" をそのまま送信、サーバーが UTC として解析

// edit/page.tsx（正しい）
startsAt: new Date((form.elements.namedItem("startsAt") as HTMLInputElement).value).toISOString(),
// → ブラウザのローカル時刻として Date に変換してから UTC ISO 文字列で送信
```

`edit/page.tsx` は正しく `toISOString()` 変換しているが、`new/page.tsx` だけ対応が漏れている。

### 修正方針

`new/page.tsx` の `startsAt` / `endsAt` を `edit/page.tsx` と同様に `new Date(...).toISOString()` で変換してから送信する。
