# Karma テスト設定に関するメモ

UI5 ライブラリ `com.myorg.reuselib` の QUnit / Karma テスト
（`npm run test` = `karma start --browsers=ChromeHeadless --singleRun=true`）について
調査・修正した内容の記録。

## 発生した問題

`npm run test` が失敗していた。出力:

```
Chrome Headless 148.0.0.0  Could not resolve any testpages! FAILED
Chrome Headless 148.0.0.0: Executed 1 of 1 (1 FAILED) (0.001 secs / 0 secs)
Chrome Headless 148.0.0.0 ERROR
  Some of your tests did a full page reload!
```

実は **2 つの別々の原因** が重なっていた。

## 原因 1: `Could not resolve any testpages!`（テスト未登録）

karma-ui5 のクライアント
([browser.cjs:145-148](../../com.myorg.reuselib/node_modules/karma-ui5/lib/client/browser.cjs#L145))
は testsuite ([testsuite.qunit.ts](../../com.myorg.reuselib/test/com/myorg/reuselib/qunit/testsuite.qunit.ts))
を解決し、その `tests` オブジェクトを走査してテストページ一覧を作る。

```js
window.findTests(config.testpage).then(function(testpages) {
    if (!testpages || testpages.length === 0) {
        reportSetupFailure("Could not resolve any testpages!");
        return;
    }
    ...
```

修正前は `tests: {}` が空だった（コミット `3e3e47f` で Example のコントロール／テストを
削除し、ライブラリは [library.ts](../../com.myorg.reuselib/src/com/myorg/reuselib/library.ts)
のみの空スキャフォルド状態だったため）。テストページが 0 件 → setup 失敗 → FAILED。

つまり設定バグではなく「テストが 1 つも無い」のが原因。

## 原因 2: `Some of your tests did a full page reload!`（誤検知）

karma-ui5 は testsuite ページから個別テストページへ **意図的にページ遷移** して
QUnit スイートを実行する。一方 Karma のクライアントは予期しないリロードを検出するため
`onbeforeunload` ハンドラを登録しており、これがこの意図的な遷移にも反応してしまう。

結果、テスト自体は `1 SUCCESS` でも `full page reload` の ERROR が表示される
（典型的な karma-ui5 の偽陽性）。

> 注: この ERROR が出ても Karma の終了コードは `0`。ただし出力が紛らわしいため抑制した。

## 修正内容

| 変更 | ファイル | 解決した問題 |
|---|---|---|
| ライブラリ初期化を検証する QUnit スモークテストを新規追加 | [test/.../library.qunit.ts](../../com.myorg.reuselib/test/com/myorg/reuselib/qunit/library.qunit.ts) | テスト未登録。`Lib.isLoaded("com.myorg.reuselib")` でライブラリ登録を確認する実体のあるテスト |
| `tests` に `"library"` エントリを登録 | [test/.../testsuite.qunit.ts](../../com.myorg.reuselib/test/com/myorg/reuselib/qunit/testsuite.qunit.ts) | テスト未登録。`module: "./{name}.qunit"` の規約により `"library"` → `./library.qunit` に解決 |
| `customContextFile` を指定 | [karma.conf.js](../../com.myorg.reuselib/karma.conf.js) | `full page reload` 偽陽性 |
| カスタム実行コンテキストを新規追加 | [test/karma-context.html](../../com.myorg.reuselib/test/karma-context.html) | 同上 |

### スモークテストの内容

ライブラリにはまだコントロールが無いため、テスト対象は「ライブラリ自体が正しく
初期化・登録されること」。testsuite は `bootCore: true` かつ
`ui5.libs: "sap.ui.core,com.myorg.reuselib"` で起動するので、テスト実行時には
ライブラリがロード済み。`sap/ui/core/Lib` の静的メソッド `isLoaded()` で検証する。

### `customContextFile` による偽陽性の抑制

Karma 標準の実行コンテキスト HTML（`node_modules/karma/static/context.html`）を
ベースに、`setupContext` をラップして `onbeforeunload` を直後に無効化する
[test/karma-context.html](../../com.myorg.reuselib/test/karma-context.html) を用意し、
`karma.conf.js` で指定する:

```js
config.set({
    frameworks: ["ui5"],
    browsers: ["Chrome"],
    customContextFile: "test/karma-context.html"
});
```

`customContextFile` のパスは basePath（既定で `karma.conf.js` のあるディレクトリ）基準。
HTML 内では Karma が置換するプレースホルダ `%CLIENT_CONFIG%` / `%MAPPINGS%` /
`%SCRIPTS%` をそのまま残す必要がある。

## 教訓・注意点

- **`Could not resolve any testpages!` は「設定が壊れている」ではなく「テストが無い」
  ことが多い**。testsuite の `tests` が空でないか最初に確認する。
- **`Some of your tests did a full page reload!` には 2 系統の原因がある**。
  今回は karma-ui5 のページ遷移を Karma が誤検知したケース（偽陽性）。
  別系統として、テストコード側で実際にリロードが起きている／`fetch` の
  `Response` ボディを二重読みしてハングする、といったケースもあるので混同しない。
- ライブラリにコントロールを追加したら、対応する `*.qunit.ts` を作成し
  [testsuite.qunit.ts](../../com.myorg.reuselib/test/com/myorg/reuselib/qunit/testsuite.qunit.ts)
  の `tests` に登録していく。

## 検証コマンド

```bash
cd com.myorg.reuselib
npm run test   # TOTAL: 1 SUCCESS、full page reload エラーなし、EXIT:0 を確認
```
