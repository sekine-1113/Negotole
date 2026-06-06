# 本番公開に向けたログ・監査設計

**作成日**: 2026-06-07  
**対象**: Negotole プロトタイプ本番公開  
**スタック**: Vercel (Next.js) + Neon (PostgreSQL)

---

## 1. ログの目的別分類

本番公開にあたって必要なログは目的によって 3 種類に分かれる。

| 種類 | 目的 | 保存期間 | 保存先 |
|---|---|---|---|
| **法的証跡ログ** | 発信者開示請求・捜査照会への対応 | **6 ヶ月以上** | Neon DB（永続） |
| **運用監視ログ** | 障害検知・パフォーマンス把握 | 30 日程度 | Vercel + Axiom |
| **管理者監査ログ** | 誰がいつ何を変更したかの追跡 | 1 年以上 | Neon DB（永続） |

---

## 2. 法的証跡ログ（最優先）

### 2.1 現在すでに記録されているもの ✅

`post` テーブルは画面から消えた後もレコードが残るため、**すでに法的証跡として機能している**。

| テーブル | 記録内容 | 証跡として使える情報 |
|---|---|---|
| `post` | userId・content・createdAt・hiddenAt | 誰がいつ何を投稿したか |
| `app_user` | name・email・createdAt | ユーザーの登録情報 |
| `user_point` | userId・getPoint・createdAt | ポイント操作の履歴 |

**⚠️ 注意**: `post` テーブルのレコードを物理削除する実装を今後も追加しないこと。`deleted_at` による論理削除のみ行うこと。

### 2.2 追加実装が必要なもの

#### (1) ログインIPアドレスの記録

発信者情報開示請求では「投稿者のIPアドレス」の提出を求められる場合がある。  
現在の実装ではIPアドレスが保存されていない。

**実装案**:

```typescript
// login_log テーブルを新設
export const loginLogs = pgTable("login_log", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id),
  ipAddress: varchar("ip_address", { length: 45 }),  // IPv6 対応
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

```typescript
// auth.ts の JWT コールバックで記録
// x-forwarded-for ヘッダーから IP を取得（Vercel 経由）
```

**保存期間**: 6 ヶ月以上（プライバシーポリシーに明記）

#### (2) 投稿削除ログ

管理者が投稿を削除した際の記録（誰が・いつ・何を削除したか）。  
現在は論理削除のみで削除者情報が記録されていない。

→ 後述の `admin_audit_log` テーブルで対応する（§3.1）

---

## 3. 管理者監査ログ

### 3.1 `admin_audit_log` テーブルの新設

```sql
CREATE TABLE admin_audit_log (
  id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  admin_id    BIGINT NOT NULL REFERENCES app_user(id),
  action      VARCHAR(50) NOT NULL,
  target_type VARCHAR(30),           -- 'campaign', 'post', 'user', etc.
  target_id   BIGINT,
  payload     JSONB,                  -- 変更前後のスナップショット
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 3.2 記録すべき管理者操作

| action | 対象 | 記録タイミング |
|---|---|---|
| `campaign.create` | campaign | POST /api/admin/campaigns 成功時 |
| `campaign.update` | campaign | PATCH /api/admin/campaigns/[id] 成功時 |
| `campaign.delete` | campaign | DELETE /api/admin/campaigns/[id] 成功時 |
| `post.delete` | post | 管理者が投稿を削除したとき（現在未実装） |
| `user.freeze` | user | アカウント凍結機能を実装した際 |

---

## 4. 運用監視ログ

### 4.1 構造化ログの実装（`src/lib/logger.ts`）

現在は `console.error("[auth] ...")` のような非構造化ログのみ。  
JSON 形式に統一することで Vercel ダッシュボードでの検索・フィルタが可能になる。

```typescript
// src/lib/logger.ts
type LogLevel = "info" | "warn" | "error";

export function log(level: LogLevel, event: string, data?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...data,
  };
  console[level](JSON.stringify(entry));
}
```

### 4.2 記録すべきイベント一覧

| イベント名 | 記録する情報 | 優先度 |
|---|---|---|
| `auth.login.success` | userId, provider（google/guest） | 高 |
| `auth.login.failed` | provider, reason | 高 |
| `auth.daily_points_granted` | userId, points | 中 |
| `auth.campaign_points_granted` | userId, campaignId, points | 中 |
| `post.created` | userId, postId, duration | 高 |
| `post.insufficient_points` | userId | 中 |
| `api.error` | path, status, error | 高 |
| `ratelimit.triggered` | path, ip（ハッシュ化推奨） | 中 |

### 4.3 Vercel Log Drains + Axiom の設定

Vercel の標準ログは **7 日間**しか保存されない。法的証跡として 6 ヶ月保存するために外部サービスに流す。

**推奨構成（無料枠）**:

```
Vercel Log Drains → Axiom（月 50 GB 無料）
```

**設定手順**:
1. [Axiom](https://axiom.co) でアカウント作成（無料）
2. Vercel ダッシュボード → Log Drains → Axiom を選択
3. Axiom のデータセットと API キーを設定

**代替サービス**: BetterStack Logs（無料 1 GB/月）、Logtail

---

## 5. エラートラッキング

### 5.1 Sentry（オプション・無料枠あり）

本番で発生した未処理例外を自動収集する。Vercel のログだけでは「エラーが起きたこと」しかわからないが、Sentry は「どのコード行で・どのような状態で」失敗したかがわかる。

**無料枠**: 月 5,000 エラーまで無料

プロトタイプ初期は後回しでよい。ユーザーが増えてエラーが追いきれなくなってから導入でも問題ない。

---

## 6. プライバシーポリシーへの記載要件

ログを保持する以上、以下の内容をプライバシーポリシーに明記する必要がある（個人情報保護法）。

### 取得する情報
- アクセスログ（URL・タイムスタンプ）
- 投稿ログ（投稿日時・内容・ユーザーID）
- ログイン情報（ログイン日時・IPアドレス）
- 利用端末情報（User-Agent）

### 利用目的
- 不正アクセスの防止・検知
- 荒らし・誹謗中傷行為への対応
- 法令に基づく開示請求・捜査照会への対応

### 保存期間
- 投稿ログ：投稿が画面から消えた後も **6 ヶ月間**保持する
- アクセスログ：**6 ヶ月間**保持する
- 管理者操作ログ：**1 年間**保持する

### 利用規約への追記
> 「画面上から消去された投稿であっても、法令遵守およびトラブル解決の目的で、運営側が一定期間ログを保持する場合があります。」

---

## 7. 実装優先順位とコスト

### フェーズ 1：公開前に必須（コストゼロ）

- [ ] `src/lib/logger.ts` を作成し、`console.error` を構造化ログに置き換える
- [ ] `post` テーブルを物理削除しないルールをコードコメントで明記する
- [ ] Vercel Log Drains → Axiom を設定してログ保持を 6 ヶ月に延長する

### フェーズ 2：公開後できるだけ早く（小規模実装）

- [ ] `admin_audit_log` テーブルを作成し、キャンペーン操作を記録する（#8）
- [ ] `login_log` テーブルを作成し、ログイン時の IP を記録する
- [ ] 管理者用の投稿削除機能を実装し、削除ログを記録する

### フェーズ 3：ユーザーが増えてから（任意）

- [ ] Sentry を統合してエラートラッキングを導入する（#9）
- [ ] ログの自動削除バッチ（保持期間超過分）を実装する

---

## 8. 法的対応フロー（運用ルール）

### 発信者情報開示請求が届いた場合

1. 書面を受け取る（弁護士名・事務所・依頼内容を確認）
2. `post` テーブル・`login_log` テーブルから対象投稿の情報を抽出
3. プロバイダ責任制限法に基づき、任意開示または裁判所命令を待つかを判断
4. 対応期限（通常 2 週間程度）内に回答する

### 警察・検察からの照会が届いた場合

1. 「捜査関係事項照会書」または「令状」の種別を確認
2. 令状がある場合は原則として提供義務あり
3. 照会書の場合は任意提供（弁護士への相談推奨）
4. 提供するデータ：投稿内容・日時・userId・IPアドレス・User-Agent

---

## 9. 現状の充足度チェック

| 項目 | 状態 | 備考 |
|---|---|---|
| 投稿の証跡保持 | ✅ 対応済み | `post` テーブルに全件残存 |
| HTTPS 化 | ✅ Vercel デフォルト | カスタムドメイン設定時に確認 |
| レート制限 | ✅ 対応済み | specs/004 |
| セキュリティヘッダー | ✅ 対応済み | specs/005 |
| 構造化ログ | ❌ 未実装 | `console.error` のみ |
| ログ保持延長（6ヶ月） | ❌ 未実装 | Vercel のデフォルトは 7 日 |
| ログインIP記録 | ❌ 未実装 | テーブル追加が必要 |
| 管理者監査ログ | ❌ 未実装 | テーブル追加が必要 |
| エラートラッキング | ❌ 未実装 | Sentry 等の統合が必要 |
| 利用規約ページ | ❌ 未実装 | 公開前必須 |
| プライバシーポリシーページ | ❌ 未実装 | 公開前必須 |
| 問い合わせ・通報フォーム | ❌ 未実装 | 公開前必須 |
| 管理者用削除・凍結機能 | ❌ 未実装 | 公開後できるだけ早く |
