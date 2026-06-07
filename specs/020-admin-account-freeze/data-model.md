# Data Model: 管理者用アカウント凍結機能

## 変更エンティティ

### users (app_user) — カラム追加

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| id | bigint PK | No | — | 既存 |
| name | varchar(255) | No | — | 既存 |
| email | varchar(255) | Yes | — | 既存 |
| role | varchar(20) | No | "user" | 既存 |
| **banned_at** | **timestamp** | **Yes** | **null** | **新規: 凍結日時。null=有効、not null=凍結中** |
| created_at | timestamp | No | now() | 既存 |
| updated_at | timestamp | Yes | — | 既存 |
| deleted_at | timestamp | Yes | — | 既存 |

**状態遷移**:
- `banned_at = null` → 有効（通常利用可）
- `banned_at = <timestamp>` → 凍結中（ログイン拒否・既存セッション無効）
- 凍結 → 解除: `banned_at = null` に戻す

---

## 既存エンティティ（変更なし）

### admin_audit_log — 凍結操作の記録に使用

| action 値 | targetType | payload 内容 | 説明 |
|---|---|---|---|
| `user.freeze` | `user` | `{ userId, reason }` | アカウント凍結 |
| `user.unfreeze` | `user` | `{ userId }` | 凍結解除 |

---

## Next.js キャッシュタグ（新規）

| タグ名 | 用途 | 無効化タイミング |
|---|---|---|
| `user-frozen-{userId}` | 凍結状態キャッシュ | 管理者が freeze/unfreeze 実行時 |

`unstable_cache` で DB クエリ結果をキャッシュし、`revalidateTag` で即時無効化する。

---

## 型定義追加（next-auth.d.ts）

```ts
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      isFrozen?: boolean;  // 追加
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: number;
    role?: string;
    isFrozen?: boolean;  // 追加
  }
}
```
