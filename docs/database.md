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

`user`
|column|type|not null|primary key|comment|
|id|bigint|yes|yes|serial|
|name|string|yes|no||
|birth_year|integer|yes|no|>1900|

`user_point`
|column|type|not null|primary key|comment|
|id|bigint|yes|yes|serial|
|user_id|bigint|yes|no||
|get_point|integer|yes|no||
|expires_at|timestamp|no|no|null=恒久ポイント。デイリーポイントは付与当日の 23:59:59 を設定|

`post`
|column|type|not null|primary key|comment|
|id|bigint|yes|yes|serial|
|user_id|bigint|yes|no||
|content|varchar(255)|yes|no||
|hidden_at|timestamp|yes|no|投稿を非表示にする時間。投稿者が選択した制限時間を created_at に加算してセット|
