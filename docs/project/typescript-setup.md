# TypeScript 設定に関するメモ

UI5 ライブラリ `com.myorg.reuselib` の TypeScript 設定([com.myorg.reuselib/tsconfig.json](../../com.myorg.reuselib/tsconfig.json))について調査・修正した内容の記録。

## 発生した問題

1. `library.ts` で `import Lib from "sap/ui/core/Lib"` が `Cannot find module ... ts(2307)` エラーになる
2. `tsconfig.json` で 2 件の非推奨警告(`moduleResolution: "node"` と `baseUrl`)

特徴的だったのは、**プロジェクトローカルの `tsc --noEmit` は EXIT:0 で通るのに、IDE 上ではエラーが出る**という食い違い。

## 原因

### モジュール未検出（`sap/ui/core/Lib`）

修正前の `tsconfig.json` は `@sapui5/types` を `typeRoots` で参照していた:

```json
"typeRoots": ["./node_modules/@types", "./node_modules/@sapui5/types"]
```

これは誤り。`typeRoots` は「型パッケージ群を格納したディレクトリ」を指定するもの。
`@sapui5/types` はそういうディレクトリではなく、`package.json` の `types` フィールドで
`types/index.d.ts` を公開する**単一の型パッケージ**。`index.d.ts` には
`declare module "sap/ui/core/Lib"` などのアンビエントモジュール宣言が含まれる。

- プロジェクトローカルの `typescript@5.9.3` は寛容で、`typeRoots` 配下のサブフォルダ
  (`types/`)を走査して偶然 `index.d.ts` を読み込むため `tsc` は通る
- IDE 側のより新しい / 厳格な TypeScript エンジンはこの非正規な指定を解決できず、
  型定義が読み込まれず「モジュール未検出」になる

### 2 件の非推奨警告

`moduleResolution: "node"`(= `node10`)と `baseUrl` は、いずれも TypeScript 7.0 で
廃止予定。IDE のエンジンが `typescript@5.9.3` より新しいため警告として表示されていた。

## 修正内容

UI5 公式の TypeScript ガイドライン（UI5 MCP `get_typescript_conversion_guidelines`）でも
`typeRoots` / `baseUrl` は使わず `types: [...]` 配列を使う構成が推奨されている。

| 変更 | 解決した問題 |
|---|---|
| `typeRoots` を削除し `"types": ["@sapui5/types", "@types/jquery", "@types/qunit"]` を追加 | モジュール未検出。`types` 指定なら `@sapui5/types` を node_modules のパッケージとして解決し、`package.json` の `types` フィールド経由で `index.d.ts` を正しく読み込む |
| `baseUrl` を削除 | baseUrl 非推奨警告。`paths` は `baseUrl` が無くても tsconfig.json の位置を基準に解決されるため不要 |
| `moduleResolution: "node"` → `"bundler"`、`module: "es2022"` → `"esnext"` | moduleResolution 非推奨警告。`bundler` は拡張子なし相対 import と `paths` の両方に対応し、babel ベースの `ui5-tooling-transpile` ビルドに適合 |

`module` / `moduleResolution` は `tsc` の型チェック専用設定で、実ビルド
(`ui5-tooling-transpile` / babel）には影響しない。

## 教訓・注意点

- **`@sapui5/types` は `typeRoots` ではなく `types` 配列で参照する**。
  これが UI5 TypeScript プロジェクトの正しい構成。
- **`tsc` が通っても IDE のエラーが消えるとは限らない**。IDE が使う TypeScript
  エンジンのバージョン / 厳格さがプロジェクトローカルの `typescript` と異なることがある。
  検証は `tsc --noEmit` だけでなく IDE の表示も確認する。
- 設定変更後は IDE 側で **TypeScript: Restart TS Server** を実行しないと
  エラー表示が更新されないことがある。
- `@sapui5/types` のバージョンは UI5 フレームワークバージョンに合わせる
  (本プロジェクトは `1.146.0`）。存在しないバージョン（例: `1.148.0`）を
  指定するとインストールに失敗する。

## 検証コマンド

```bash
cd com.myorg.reuselib
npm run ts-typecheck   # tsc --noEmit。EXIT:0 を確認
```
