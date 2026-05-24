# Data Model: 投稿作成の競合状態・整合性バグ修正

**Date**: 2026-05-25

スキーマ変更なし。既存テーブルをそのまま使用する。

---

## 関連エンティティ

### `post`

| カラム | 型 | 説明 |
|---|---|---|
| id | bigint (serial PK) | 投稿 ID |
| user_id | bigint | 投稿者 ID（`app_user.id` 参照） |
| content | varchar(255) | 投稿本文（1〜255文字） |
| hidden_at | timestamp | 非表示になる時刻（`NOW() + duration`） |
| created_at | timestamp | 作成日時 |
| updated_at | timestamp | 更新日時 |
| deleted_at | timestamp | 論理削除日時（NULL = 有効） |

### `user_point`

| カラム | 型 | 説明 |
|---|---|---|
| id | bigint (serial PK) | レコード ID |
| user_id | bigint | ユーザー ID |
| get_point | integer | ポイント変動量（正 = 付与、負 = 消費） |
| expires_at | timestamp | 有効期限（NULL = 恒久） |
| created_at | timestamp | 作成日時 |
| deleted_at | timestamp | 論理削除日時 |

---

## トランザクション内の操作シーケンス

```
BEGIN;

-- 1. 残高チェック（行ロック取得）
SELECT COALESCE(SUM(get_point), 0) AS total
FROM user_point
WHERE user_id = :userId
  AND deleted_at IS NULL
  AND (expires_at IS NULL OR expires_at > NOW())
FOR UPDATE;

-- total < 1 → ROLLBACK, return 402

-- 2. 投稿レコード作成
INSERT INTO post (user_id, content, hidden_at)
VALUES (:userId, :content, NOW() + :duration)
RETURNING *;

-- 3. ポイント消費レコード挿入
INSERT INTO user_point (user_id, get_point, expires_at)
VALUES (:userId, -1, NULL);

COMMIT;
```

**不変条件**:
- `SUM(get_point) >= 0`（残高がマイナスにならない）
- `post` と `user_point(-1)` は必ずペアで存在する（片方だけ残らない）
