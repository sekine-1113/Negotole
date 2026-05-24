# Database

## Using

Vercel Neon（Serverless PostgreSQL）  
接続には `DATABASE_URL`（接続プール）と `DATABASE_URL_UNPOOLED`（マイグレーション用）を使い分ける。

## schema

all tables needs
|column|type|not null|primary key|comment|
|created_at|timestamp|yes|no||
|updated_at|timestamp|no|no|on update|
|deleted_at|timestamp|no|no||

`app_user`（旧 `user`。PostgreSQL システムテーブルとの競合を避けるためリネーム済み）
|column|type|not null|primary key|comment|
|id|bigint|yes|yes|serial|
|name|string|yes|no||
|email|varchar(255)|no|no|unique|
|role|varchar(20)|yes|no|デフォルト `user`。管理者は `admin`|
|birth_year|integer|yes|no|>1900|

`user_point`
|column|type|not null|primary key|comment|
|id|bigint|yes|yes|serial|
|user_id|bigint|yes|no||
|get_point|integer|yes|no||
|expires_at|timestamp|no|no|null=恒久ポイント。デイリーポイントは付与当日の JST 23:59:59 を UTC で設定|

`post`
|column|type|not null|primary key|comment|
|id|bigint|yes|yes|serial|
|user_id|bigint|yes|no||
|content|varchar(255)|yes|no||
|hidden_at|timestamp|yes|no|投稿を非表示にする時間。投稿者が選択した制限時間を created_at に加算してセット|

`campaign`
|column|type|not null|primary key|comment|
|id|bigint|yes|yes|serial|
|name|varchar(255)|yes|no|キャンペーン名|
|description|text|no|no|説明（任意）|
|starts_at|timestamp|yes|no|開始日時|
|ends_at|timestamp|yes|no|終了日時|
|bonus_points|integer|yes|no|付与ポイント数（デフォルト 100）|

## トランザクション方針

投稿作成（`POST /api/posts`）は以下の 2 操作を単一トランザクションで実行する。

1. `post` テーブルへのレコード作成
2. `user_point` テーブルへのポイント消費レコード挿入（`get_point = -1`）

どちらか一方が失敗した場合は両方ロールバックされる。

ポイント残高チェック（`SUM(get_point)`）もトランザクション内で行い、チェックと消費の間に他リクエストが割り込めないよう排他的に実行する。
