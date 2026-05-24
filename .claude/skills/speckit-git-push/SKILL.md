---
name: speckit-git-push
description: Close completed GitHub issues, push branch, and create a pull request
compatibility: Requires git repository with GitHub remote and gh CLI installed
metadata:
  author: sekine-1113
---

# Push & Pull Request

実装完了後に GitHub issues をクローズし、ブランチを push して PR を作成する。

## User Input

```text
$ARGUMENTS
```

引数がある場合は PR タイトルや説明のヒントとして使用する。

## Outline

### Step 1: 前提確認

以下を順番に確認する。失敗した場合はエラーを表示して中断する。

1. `git rev-parse --is-inside-work-tree 2>/dev/null` で Git リポジトリか確認する
2. `gh auth status 2>/dev/null` で GitHub CLI の認証状態を確認する
3. `git remote get-url origin 2>/dev/null` でリモートが GitHub URL か確認する
   - URL が `github.com` を含まない場合は中断する
4. リモートのリポジトリ名を `gh repo view --json nameWithOwner -q .nameWithOwner` で取得する

### Step 2: 現在のブランチと変更状況の確認

```bash
git branch --show-current
git status --short
git log --oneline origin/main..HEAD 2>/dev/null || git log --oneline -5
```

- ブランチ名・未コミットの変更・main との差分コミット数を把握する
- `main` または `master` ブランチで直接実行している場合は警告を表示するが続行は許可する

### Step 3: 未コミットの変更をコミット（あれば）

`git status --short` の出力が空でない場合のみ実行する。

1. `git add -A` でステージング
2. 変更内容を確認してコミットメッセージを生成する（形式: `feat: <変更内容の要約>`）
3. `git commit -m "<message>\n\nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"` でコミット

### Step 4: GitHub issues のクローズ

#### タスク完了状況の確認

`specs/` 配下の `tasks.md` を探して読み込む:

```bash
find . -name "tasks.md" -path "*/specs/*" | head -1
```

tasks.md が存在する場合:
- `- [x]` または `- [X]` の行数（完了タスク）を数える
- `- [ ]` の行数（未完了タスク）を数える
- **未完了タスクが 1 件でもある場合**: 「未完了タスクが N 件あります。issues をクローズしてよいですか？」と確認を求める

#### OPEN な issues のクローズ

```bash
gh issue list --state open --limit 100 --json number,title
```

OPEN な issues が存在する場合、各 issue を以下でクローズする:

```bash
gh issue close <number> --comment "実装完了。このタスクに対応するコードがコミットされました。"
```

issues が 0 件の場合はスキップしてメッセージを表示する。

### Step 5: PR テンプレートの作成（存在しない場合のみ）

`.github/pull_request_template.md` が存在するか確認:

```bash
test -f .github/pull_request_template.md && echo "EXISTS" || echo "MISSING"
```

**存在しない場合のみ**、以下の内容で `.github/pull_request_template.md` を作成する:

```markdown
## 概要

<!-- このPRで何を実装・修正したか、1〜3行で説明してください -->

## 変更内容

<!-- 主な変更点を箇条書きで -->

- 

## 関連 Issue

<!-- 例: Closes #1, Closes #2 -->

Closes #

## 動作確認

- [ ] `pnpm build` が通る（または該当するビルドコマンドが通る）
- [ ] 主要な機能が意図通りに動作する
- [ ] エラーハンドリングが適切に動作する
- [ ] モバイル/レスポンシブ表示が崩れていない（UI変更の場合）

## スクリーンショット（任意）

<!-- UI変更がある場合は before/after を貼ってください -->

## 備考

<!-- レビュアーへの補足・注意事項など -->
```

テンプレートを作成した場合は `git add .github/pull_request_template.md` してコミットする:

```bash
git commit -m "Add GitHub PR template

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

### Step 6: ブランチを push

```bash
git push -u origin <current-branch>
```

push 済みの場合は `git push` のみ実行する。エラーが出た場合は内容を表示して中断する。

### Step 7: PR の作成

#### PR タイトルの生成

以下の情報から PR タイトルを生成する（70文字以内）:
- ユーザーの引数（あれば）
- ブランチ名から推測した機能名
- tasks.md の feature 名（plan.md の Feature Name があれば使用）

#### PR 本文の生成

`git log origin/main..HEAD --oneline` または `git log -5 --oneline` でコミット一覧を確認し、変更内容のサマリーを作成する。

また、クローズした issues の番号を `Closes #N` 形式で列挙する。

#### PR 作成コマンド

```bash
gh pr create \
  --title "<生成したタイトル>" \
  --body "$(cat <<'EOF'
## 概要

<1〜3行の概要>

## 変更内容

<コミット一覧を基にした箇条書き>

## 関連 Issue

<クローズした issues の Closes #N リスト（なければ省略）>

## 動作確認

- [ ] ビルドが通ることを確認済み
- [ ] 主要な機能の動作を確認済み

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

PR が正常に作成されたら URL を表示する。

**すでに PR が存在する場合**（`gh pr view` でチェック）: 既存 PR の URL を表示してスキップする。

### Step 8: 完了報告

以下をまとめて報告する:
- クローズした issues の件数と番号
- PR テンプレートの作成有無
- push したブランチ名
- 作成した PR の URL

## Graceful Degradation

- `gh` CLI が未インストールまたは未認証の場合: GitHub 操作をスキップし、`git push` のみ実行して URL を手動で作成するよう案内する
- 未コミットの変更がない場合: Step 3 をスキップ
- OPEN な issues が 0 件の場合: Step 4 のクローズをスキップ
- PR テンプレートが既存の場合: Step 5 をスキップ
- 既に PR が存在する場合: Step 7 をスキップして既存 PR URL を表示
