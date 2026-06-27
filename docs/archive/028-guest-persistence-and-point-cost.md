# 028 ゲスト永続化・時間連動ポイント消費・引継ぎコード

## 概要

| 機能 | 内容 |
|------|------|
| ゲスト永続化 | `guest_user` テーブルで仮 ID を管理し、localStorage に UUID を保存 |
| 時間連動ポイント消費 | 投稿の表示時間（duration）に応じてポイント消費量を変動 |
| 引継ぎコード | ゲスト→正式アカウント時にポイントを引き継ぐ 8 桁コード |

---

## 実装方針

### 1. guest_user テーブル

現状のゲストログインは `app_user` テーブルに `email=null` のレコードを作り、
その `id` を localStorage に保存していた。デバイス間での復元不可、管理不能という問題があった。

**変更後:**
- `guest_user` テーブルを新設
- `guest_id` は `crypto.randomUUID()` から生成した 32 桁 hex
- localStorage には `negotole_guest_token` (= `guest_id`) を保存
- `app_user` レコードは引き続き作成するが、`guest_user` テーブルで管理

```
guest_user
  id                      BIGINT PK
  guest_id                VARCHAR(64) UNIQUE    -- 32桁hex（localStorage保存値）
  app_user_id             BIGINT FK → app_user  -- セッション管理用の紐付け
  transfer_code           VARCHAR(8)            -- 引継ぎコード（英大文字+数字）
  transfer_code_expires_at TIMESTAMP            -- 発行から24時間
  transferred_at          TIMESTAMP             -- 引継ぎ完了日時
  transferred_to_user_id  BIGINT FK → app_user  -- 引継ぎ先の正式ユーザー
  created_at              TIMESTAMP NOT NULL
  updated_at              TIMESTAMP
```

### 2. 投稿ポイント消費（時間連動）

| 表示時間 | 消費ポイント |
|----------|------------|
| 1h (60分) | 1 pt |
| 3h (180分) | 2 pt |
| 6h (360分) | 3 pt |
| 12h (720分) | 5 pt |
| 24h (1440分) | 8 pt |

`src/lib/constants.ts` に `POST_COST_BY_DURATION` を定義し、API と UI で共有。
API は残高チェック・ポイント消費を `cost` 分で行う。

### 3. 引継ぎコード

**ゲスト側（コード発行）:**
1. `POST /api/guest/transfer-code` を叩く
2. 8桁英数字コード（大文字A-Z + 0-9）を生成
3. `guest_user.transfer_code` + `transfer_code_expires_at (=NOW()+24h)` に保存
4. コードをフロントに返す → マイページで表示

**正式ユーザー側（コード入力・引継ぎ）:**
1. `POST /api/transfer/claim` に `{ code: "ABCD1234" }` を送信
2. `guest_user` テーブルで `transfer_code` を検索
3. 有効（期限内 & 未引継ぎ & 引継ぎ先アカウントがゲストでない）なら:
   - `user_point` の `user_id` をゲストの `app_user_id` → 現ユーザー id に UPDATE
   - `guest_user.transferred_at = NOW()`, `transferred_to_user_id = 現ユーザーid` を設定
4. ポイントキャッシュを revalidate

---

## ファイル構成

```
src/
  lib/
    constants.ts               POST_COST_BY_DURATION 追加
    db/schema.ts               guestUsers テーブル追加
    auth.ts                    Credentials provider を guestToken ベースに変更
  types/next-auth.d.ts         guestToken を JWT/Session に追加
  components/
    GuestLoginButton.tsx       guestToken ベースに変更
    GuestPersistenceHandler.tsx guestToken を localStorage に保存
    PostForm.tsx               duration 連動のコスト表示・チェック
    TransferCodeSection.tsx    ゲスト：コード発行 UI
    ClaimTransferSection.tsx   正式ユーザー：コード入力 UI
  app/
    api/
      posts/route.ts           可変コスト対応
      guest/transfer-code/route.ts  コード発行 API
      transfer/claim/route.ts  引継ぎ実行 API
    (app)/mypage/page.tsx      引継ぎ UI を追加
drizzle/
  0009_guest_user.sql          Migration
docs/
  028-guest-persistence-and-point-cost.md  本ドキュメント
```

---

## 実装経過

### Step 1: Schema 追加・Migration 生成 ✅
### Step 2: constants.ts に POST_COST_BY_DURATION 追加 ✅
### Step 3: auth.ts の Credentials provider を guest_user ベースに変更 ✅
### Step 4: GuestLoginButton / GuestPersistenceHandler 更新 ✅
### Step 5: posts API に可変コスト対応 ✅
### Step 6: PostForm のコスト表示更新 ✅
### Step 7: 引継ぎコード API (発行・引継ぎ) 追加 ✅
### Step 8: TransferCodeSection / ClaimTransferSection UI 追加 ✅
### Step 9: マイページに引継ぎ UI 組み込み ✅
### Step 10: 型チェック・Lint ✅

---

## 注意事項

- 引継ぎ対象は **ポイント（user_point）のみ**。投稿はゲスト app_user に帰属したまま。
- 引継ぎコードは **1回限り・24時間有効**。再発行で古いコードは上書き（新しい有効期限）。
- 引継ぎ先がゲストユーザーの場合はエラー（正式アカウントのみ引継ぎ可能）。
- 旧 localStorage キー `negotole_guest_id` は `negotole_guest_token` に変更。
  旧セッションのユーザーは初回アクセス時に新規ゲストとして扱われる（破壊的変更だが許容範囲）。
