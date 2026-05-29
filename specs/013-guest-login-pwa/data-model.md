# Data Model: ゲストログイン限定化 & PWA対応

**Branch**: `013-guest-login-pwa` | **Date**: 2026-05-28

## 概要

既存の DB スキーマ変更は **不要**。`app_user.email` はすでに nullable（`.unique()` のみ、`.notNull()` なし）であり、PostgreSQL の unique 制約は複数の NULL を許容するため、ゲストユーザーを `email = null` で複数登録できる。

---

## 既存エンティティ（変更なし）

### app_user（`users` テーブル）

| カラム | 型 | 制約 | ゲスト時の値 |
|--------|-----|------|------------|
| id | bigint | PK, auto-increment | 自動採番 |
| name | varchar(255) | NOT NULL | "ゲスト" |
| email | varchar(255) | UNIQUE, nullable | NULL |
| role | varchar(20) | NOT NULL, default="user" | "user" |
| birth_year | integer | NOT NULL, default=0 | 0 |
| created_at | timestamp | NOT NULL | 自動設定 |

**ゲストユーザーの識別**: email = NULL かつ name = "ゲスト" で識別可能。ただし複数のゲストユーザーが同様の値を持つため、認証上は `id` のみが一意識別子。

### post（`posts` テーブル）

変更なし。ゲストユーザーは `userId` に有効なゲスト user.id を持つため投稿可能。セッション終了後も投稿レコードは残るが、新しいゲストセッションからは自分の投稿として識別できない（孤立状態）。

### user_point（`userPoints` テーブル）

変更なし。ゲストユーザーもポイント付与を受けるが、セッション終了後は別の userId となるため蓄積はリセットされる。

---

## 新規エンティティ（スキーマ外・実行時状態）

### GuestSession（NextAuth JWT トークン内）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| userId | number | DBの app_user.id |
| role | string | "user" |
| name | string | "ゲスト" |
| exp | number | セッション有効期限（NextAuth デフォルト設定） |

**ライフサイクル**: ゲストログイン → JWT 発行 → ブラウザ Cookie に保存 → ブラウザ終了 or ログアウトでセッション破棄

---

## PWA 設定エンティティ（ファイルベース）

### Web App Manifest（`app/manifest.ts`）

| フィールド | 値 |
|-----------|-----|
| name | "negotole" |
| short_name | "negotole" |
| description | "儚く消える、夜のつぶやき" |
| start_url | "/" |
| display | "standalone" |
| background_color | "#0b0f19" |
| theme_color | "#6366f1" |
| icons | [192x192, 512x512] |

### Service Worker Cache（`public/sw.js`）

| キャッシュ名 | 対象 | 戦略 |
|-------------|------|------|
| negotole-static-v1 | `/`, `/_next/static/**`, `/icons/**` | Cache-first |

キャッシュ対象外: `/api/**`、タイムラインデータ、その他動的コンテンツ

---

## スキーママイグレーション

**不要。** 既存スキーマで全要件を満たす。
