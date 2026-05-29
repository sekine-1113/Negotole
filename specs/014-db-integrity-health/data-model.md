# Data Model: DB整合性改善・ヘルスチェック

**Feature**: 014-db-integrity-health
**Date**: 2026-05-30

## 変更概要

スキーマ変更のみ。新規テーブルなし。既存テーブルに FK 制約とインデックスを追加する。

---

## app_user（変更なし）

| カラム | 型 | 制約 |
|--------|-----|------|
| id | bigint | PK, GENERATED ALWAYS AS IDENTITY |
| name | varchar(255) | NOT NULL |
| email | varchar(255) | UNIQUE (nullable) |
| role | varchar(20) | NOT NULL, DEFAULT 'user' |
| birth_year | integer | NOT NULL, DEFAULT 0 |
| created_at | timestamp | NOT NULL, DEFAULT NOW() |
| updated_at | timestamp | |
| deleted_at | timestamp | |

---

## user_point（FK + インデックス追加）

| カラム | 型 | 制約 | 変更 |
|--------|-----|------|------|
| id | bigint | PK | — |
| user_id | bigint | NOT NULL, **FK → app_user.id ON DELETE CASCADE** | **追加** |
| get_point | integer | NOT NULL | — |
| expires_at | timestamp | | — |
| created_at | timestamp | NOT NULL | — |
| updated_at | timestamp | | — |
| deleted_at | timestamp | | — |

**追加インデックス**:
- `user_point_user_id_idx` ON `user_id`
- `user_point_expires_at_idx` ON `expires_at`

---

## post（FK + インデックス追加）

| カラム | 型 | 制約 | 変更 |
|--------|-----|------|------|
| id | bigint | PK | — |
| user_id | bigint | NOT NULL, **FK → app_user.id ON DELETE CASCADE** | **追加** |
| content | varchar(255) | NOT NULL | — |
| hidden_at | timestamp | NOT NULL | — |
| created_at | timestamp | NOT NULL | — |
| updated_at | timestamp | | — |
| deleted_at | timestamp | | — |

**追加インデックス**:
- `post_hidden_at_idx` ON `hidden_at`

---

## campaign（インデックス追加）

| カラム | 型 | 制約 | 変更 |
|--------|-----|------|------|
| id | bigint | PK | — |
| name | varchar(255) | NOT NULL | — |
| description | text | | — |
| starts_at | timestamp | NOT NULL | — |
| ends_at | timestamp | NOT NULL | — |
| bonus_points | integer | NOT NULL, DEFAULT 100 | — |
| created_at | timestamp | NOT NULL | — |
| updated_at | timestamp | | — |
| deleted_at | timestamp | | — |

**追加インデックス**:
- `campaign_starts_ends_idx` ON `(starts_at, ends_at)` ← 複合インデックス

---

## ヘルスチェック API レスポンス型

DB テーブルではなく API レスポンスの型定義。

```
GET /api/health

200 OK:
{
  "status": "ok",
  "db": "ok"
}

503 Service Unavailable (DB 接続エラー時):
{
  "status": "error",
  "db": "error"
}
```
