# TODO

* トライアル期間はゲストユーザも投稿が可能。（すべてのユーザが共通のアカウントを用いる。ポイントは無限大表示）
* セキュリティの実装。（レートリミット、CORSなどの設定）
* ログ・監査対応
*

## claud

  ---
  セキュリティ

  🔴 高リスク

  1. ~~POST /api/posts に競合状態（Race Condition）~~（対応済み: specs/003-fix-post-race-condition）
  ~~getPointBalance() でチェック → consumeOnePoint()
  が別クエリで非アトミック。並列リクエストでポイントが負になりえます。~~

  ~~→ user_point の SUM をサブクエリで取得しながら INSERT する1クエリか、DB
  トランザクションで解決が必要。~~

  2. ~~投稿作成のトランザクション欠如~~（対応済み: specs/003-fix-post-race-condition）
  ~~→ db.transaction() で括る必要があります。~~

  3. ~~レート制限なし~~（対応済み: specs/004-add-rate-limit）
  ~~ログイン試行・POST /api/posts・管理者 API に一切レート制限がありません。→ Upstash Ratelimit や Vercel Edge Middleware での IP 制限が必要。~~

  ---
  🟡 中リスク

  4. ~~セキュリティヘッダー未設定~~（対応済み: specs/005-add-security-headers）
  ~~next.config.ts に X-Frame-Options・X-Content-Type-Options・Referrer-Policy・Permissions-Policy
  などが未設定。Next.js はデフォルトで一部を設定しますが、Content-Security-Policy
  は自分で定義する必要があります。~~

  ~~5. cursor パラメータの検証が甘い~~（対応済み: specs/006-fix-cursor-validation）
  ~~const cursorId = cursor ? Number(Buffer.from(cursor, "base64").toString()) : null;~~
  ~~// NaN のままクエリに渡される可能性~~
  ~~→ Number.isInteger() チェックが必要。~~

  ~~6. 環境変数の起動時バリデーションなし~~（対応済み: specs/007-add-env-validation）
  ~~AUTH_SECRET 等が未設定でもサーバーは起動します。Zod で env.ts を作成して起動時に検証すべきです。~~

  ---
  ログ・可観測性

  7. 構造化ログがない
  console.error("[auth] daily point grant failed:", e)
  のみ。本番環境でのログ集約・検索ができません。Pino や Winston の導入、または Vercel Log Drains
  との連携が必要。

  8. 管理者操作の監査ログなし
  キャンペーン作成・削除などの管理者操作が記録されません。誰がいつ何を変更したかが追跡不可能。

  9. エラートラッキング未導入
  Sentry 等の統合がなく、本番で発生した例外を把握できません。

  ---
  データベース・整合性

  10. 外部キー制約なし
  // user_point.userId → app_user.id の FK が未定義
  userId: bigint("user_id", { mode: "number" }).notNull(),
  // → app_user を削除しても user_point が残り続ける
  Drizzle では .references(() => users.id) で定義できます。

  11. インデックスなし
  頻繁にクエリされるカラムにインデックスがありません：

  ┌─────────────────────────────┬────────────────────────────────┐
  │           カラム            │              用途              │
  ├─────────────────────────────┼────────────────────────────────┤
  │ user_point.user_id          │ 全ポイント集計クエリで毎回使用 │
  ├─────────────────────────────┼────────────────────────────────┤
  │ user_point.expires_at       │ 有効期限フィルタで毎回使用     │
  ├─────────────────────────────┼────────────────────────────────┤
  │ post.hidden_at              │ タイムライン取得で毎回使用     │
  ├─────────────────────────────┼────────────────────────────────┤
  │ campaign.starts_at, ends_at │ アクティブキャンペーン判定     │
  └─────────────────────────────┴────────────────────────────────┘

  ユーザー数が増えると顕著に遅くなります。

  12. 期限切れレコードのクリーンアップなし
  user_point の expires_at が過去のレコードは論理的に無効ですが、永久に蓄積されます。定期的な
  DELETE バッチ（Vercel Cron Jobs など）が必要。

  ---
  キャッシュ戦略

  13. Header のポイント表示がページ全体と同期されない
  revalidatePath("/") は / ページ全体を再検証しますが、他のページ（例：/admin/campaigns）からの遷
  移後はヘッダーのポイントが古いまま。revalidateTag("user-points")
  でタグベースの細粒度無効化が適切。

  14. タイムライン投稿の Cache-Control 未設定
  GET /api/posts のレスポンスに Cache-Control ヘッダーがなく、ブラウザや CDN
  がデフォルトの挙動をとります。Cache-Control: no-store または max-age を明示すべきです。

  ---
  可用性

  15. ヘルスチェックエンドポイントなし
  /api/health が存在せず、外部監視サービスや Kubernetes の liveness probe が使えません。

  ~~16. DB 接続エラー時の縮退動作なし~~（対応済み: specs/008-fix-server-render-error）
  ~~Neon
  の接続が切れると全ページがエラーになります。投稿一覧は空表示にするなどフォールバックが必要。~~
  （補足: Server Component の HTTP 自己フェッチ（NEXTAUTH_URL）も同時に修正済み）

  17. GET /api/admin/campaigns にページネーションなし
  全キャンペーンを一括取得しており、運用が長くなると遅くなります。

  ---
  テスト

  18. API ルートのテストなし
  points.ts の単体テストのみで、認証フロー・API ルート・ミドルウェアのテストがありません。pnpm
  test が通っても API の動作保証がない状態。

  19. E2E テストなし
  Playwright 等による「ログイン → 投稿 →
  ポイント減少確認」の自動確認がなく、リグレッションを手動でしか検出できません。
