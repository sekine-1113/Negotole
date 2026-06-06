# Research: キャンペーンポイント適用ロジック

## 現状の実装の問題点

### 問題1: キャンペーンポイントが新規ユーザーのみに付与されている

`auth.ts` の JWT コールバックで `token.isNewUser === true` の場合のみ `grantCampaignPoints()` を呼ぶ実装になっている。
既存ユーザーがキャンペーン期間中にログインしてもポイントが付与されない。

### 問題2: 重複付与を防ぐ仕組みがない

`campaign_application` テーブルが存在しないため、同一ユーザーへの同一キャンペーンの重複付与を DB レベルで保証できない。
現状は「新規ユーザーは1度しかログイン時のキャンペーン付与が走らない」という副作用で回避されているが、脆弱な設計。

### 問題3: キャンペーンポイントが常に恒久扱い

`grantCampaignPoints()` が `expiresAt: null`（無期限）で固定されている。
キャンペーン作成時に「期間限定」「恒久」を選択する仕組みがない。

---

## 設計決定

### 重複付与防止: `campaign_application` テーブルの新設

**Decision**: `campaign_application` テーブルを新設し、`(campaignId, userId)` に UNIQUE 制約を設ける。

**Rationale**:
- DB レベルの制約で重複付与を確実に防げる（アプリ層の `hasApplied()` チェックと二重防衛）
- ユーザーごとのキャンペーン適用履歴が監査・デバッグに活用できる
- Drizzle ORM の `.references()` + `uniqueIndex` で実装可能

**Alternatives considered**:
- `isNewUser` フラグの拡張: キャンペーンが複数ある場合に対応不可
- `user_point` テーブルのクエリで判定: JOIN が複雑になりパフォーマンスに影響

---

### ポイント種別: `campaign.pointsType` カラム追加

**Decision**: `campaign` テーブルに `pointsType varchar(20) NOT NULL DEFAULT 'permanent'` を追加する。値は `'permanent'`（恒久）または `'limited'`（期間限定）。

**Rationale**:
- 既存キャンペーンとの後方互換性を保ちながら新機能を追加できる（DEFAULT で既存レコードに `'permanent'` が適用される）
- `'limited'` の場合は `user_point.expiresAt` にキャンペーンの `endsAt` を設定する
- 将来的にカスタム期限が必要になった場合も同カラムを拡張しやすい

**Alternatives considered**:
- `boolean isPermanent`: 意味が逆転しやすい
- `expiresAt` を `campaign` テーブルに持つ: `startsAt`/`endsAt` との混同が生じる

---

### ログイン時のキャンペーンポイント付与タイミング

**Decision**: `auth.ts` の JWT コールバックで、`token.userId` が確定した直後にキャンペーンポイント付与を試みる（新規/既存ユーザー問わず）。

**Rationale**:
- 既存の `hasDailyPointToday()` / `grantDailyPoints()` と同じパターン
- `campaign_application` テーブルの UNIQUE 制約で、並列ログインによる重複付与を防ぐ
- 失敗してもサイレントエラーでログイン自体は成功する（現在の仕様を踏襲）

**変更箇所**:
- `isNewUser === true` の条件を削除
- 全ユーザーに対して `hasCampaignApplied(userId, campaignId)` をチェックし、未適用なら付与

---

### 既存フォーム UI の更新

**Decision**: キャンペーン新規作成フォーム（`new/page.tsx`）と編集フォーム（`[id]/edit/page.tsx`）に `pointsType` のラジオボタンを追加する。

**Rationale**:
- 両フォームとも Client Component で `fetch` を使う構成なので、フィールド追加のみで対応可能
- API（`POST /api/admin/campaigns`・`PATCH /api/admin/campaigns/[id]`）の `pointsType` バリデーションも追加する

---

## 変更ファイル一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `negotole/src/lib/db/schema.ts` | 更新 | `campaign.pointsType` カラム追加、`campaignApplications` テーブル追加 |
| `negotole/drizzle/` | 自動生成 | マイグレーション SQL |
| `negotole/src/lib/points.ts` | 更新 | `hasCampaignApplied()`・`grantCampaignPoints()` 更新 |
| `negotole/src/lib/auth.ts` | 更新 | JWT コールバックのキャンペーン付与ロジックを修正 |
| `negotole/src/app/api/admin/campaigns/route.ts` | 更新 | `POST` で `pointsType` バリデーション追加 |
| `negotole/src/app/api/admin/campaigns/[id]/route.ts` | 更新 | `PATCH` で `pointsType` バリデーション追加 |
| `negotole/src/app/admin/campaigns/new/page.tsx` | 更新 | `pointsType` フィールド追加 |
| `negotole/src/app/admin/campaigns/[id]/edit/page.tsx` | 更新 | `pointsType` フィールド追加・表示 |
