# Upstash Redis セットアップ手順

レート制限機能（`004-add-rate-limit`）は Upstash Redis を使用します。

## 1. Upstash アカウント作成

1. [Upstash Console](https://console.upstash.com/) でアカウントを作成する
2. 「Create Database」をクリック
3. 名前を入力し、リージョンを選択（例: `ap-northeast-1` — 東京）
4. 「Create」をクリック

## 2. 接続情報の取得

作成したデータベースの詳細画面で「REST API」タブを開き、以下の値をコピーする:

- **UPSTASH_REDIS_REST_URL**: `https://xxx.upstash.io`
- **UPSTASH_REDIS_REST_TOKEN**: `AxxxXXX...`

## 3. 環境変数の設定

`negotole/.env.local` に以下を追加する:

```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

## 4. 無料プランの制限

Upstash 無料プランの制限:
- 10,000 commands/day
- 256 MB storage

小規模 SNS では通常の使用量で制限に達することはない。

## 5. 開発環境でのモック（オプション）

Upstash Redis なしで開発する場合は `src/lib/ratelimit.ts` を一時的にモックするか、
環境変数を未設定のままにする（未設定の場合、レート制限チェックはスキップされる）。
