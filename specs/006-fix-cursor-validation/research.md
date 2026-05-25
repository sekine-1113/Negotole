# Research: cursor パラメータの入力検証強化

**Date**: 2026-05-25
**Feature**: cursor パラメータの検証が甘い問題の修正

## 問題の分析

### 現在のコード

```typescript
// negotole/src/app/api/posts/route.ts:15
const cursorId = cursor ? Number(Buffer.from(cursor, "base64").toString()) : null;
```

### 問題点

| ケース | 入力例 (cursor) | デコード結果 | `Number()` 変換後 | DB への影響 |
|--------|----------------|-------------|------------------|------------|
| 不正 base64 | `"!!!"` | `""` (空) | `NaN` | クエリエラーまたは全件取得 |
| 非数値 base64 | `btoa("abc")` | `"abc"` | `NaN` | 同上 |
| 浮動小数 | `btoa("1.5")` | `"1.5"` | `1.5` | `lt(posts.id, 1.5)` → 不定動作 |
| 0 | `btoa("0")` | `"0"` | `0` | 意味のないカーソル |
| 負数 | `btoa("-1")` | `"-1"` | `-1` | 全件マッチの可能性 |

## 検証方針の決定

### Decision
`Number.isInteger(n) && n > 0` による同期検証。不正な場合は即座に 400 を返す。

### Rationale
- `Number.isInteger()` は `NaN`、`Infinity`、浮動小数をすべて除外
- `n > 0` は投稿 ID が正の整数であることを保証（DB の SERIAL / BIGINT は 1 以上）
- 追加ライブラリ不要、1〜2行の変更で完結

### Alternatives Considered

| 選択肢 | 評価 | 却下理由 |
|--------|------|---------|
| Zod スキーマ検証 | 過剰 | 1フィールドの検証に依存を増やす必要なし |
| try-catch のみ | 不十分 | `Number(NaN)` は例外を投げないため無効 |
| 正規表現 `/^\d+$/` | 可 | `Number.isInteger()` の方が意図が明確 |

## 実装方針

```typescript
// 変更前
const cursorId = cursor ? Number(Buffer.from(cursor, "base64").toString()) : null;

// 変更後
let cursorId: number | null = null;
if (cursor) {
  const decoded = Number(Buffer.from(cursor, "base64").toString());
  if (!Number.isSafeInteger(decoded) || decoded <= 0) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }
  cursorId = decoded;
}
```

## テスト方針

Vitest で `route.ts` の GET ハンドラを対象にユニットテストを追加。
テストケース:
1. 不正 base64 → 400
2. base64("abc") → 400（非数値）
3. base64("1.5") → 400（浮動小数）
4. base64("0") → 400（0以下）
5. base64("-1") → 400（負数）
6. cursor なし → 200（正常）
7. base64("1") → 200（正常な正の整数）
