# UI5 ライブラリの Application Frontend デプロイ設定

UI5 ライブラリ [com.myorg.reuselib](../../com.myorg.reuselib/) を SAP BTP の Application Frontend
service にデプロイ可能にするまでに必要だった設定の記録。

`fiori add deploy-config` コマンドは Cloud Foundry / Application Frontend 向けのデプロイ設定を
**ライブラリ プロジェクトには生成してくれず**(ターゲット選択肢に ABAP しか出ない)、
すべて手動で構築する必要があった。consumerapp(Fiori アプリ)用の設定を雛形にして、
ライブラリ特有の事情に合わせて調整している。

## 全体像

| 種別 | 対象 | 変更内容 |
|---|---|---|
| 新規 | [mta.yaml](../../com.myorg.reuselib/mta.yaml) | consumerapp からコピー、ID とリソース名を `commyorgreuselib` に置換 |
| 新規 | [ui5-deploy.yaml](../../com.myorg.reuselib/ui5-deploy.yaml) | consumerapp からコピー、`type: library` 化と `framework` 追加 |
| 新規 | [xs-app.json](../../com.myorg.reuselib/xs-app.json) | consumerapp からコピー、`^/index.html$` ルートを削除 |
| 新規 | [xs-security.json](../../com.myorg.reuselib/xs-security.json) | consumerapp からコピー、`xsappname` を `commyorgreuselib` に |
| 更新 | [ui5.yaml](../../com.myorg.reuselib/ui5.yaml) | `metadata.name` を `"reuselib"` → `com.myorg.reuselib` に |
| 更新 | [package.json](../../com.myorg.reuselib/package.json) | `build:cf` / `build:mta` 追加、`deploy` を `fiori cfDeploy` に、`ui5-task-zipper` を devDependencies に |

## 設定の詳細とつまずきポイント

### 1. `ui5.yaml` の `metadata.name`

```diff
 metadata:
-  name: "reuselib"
+  name: com.myorg.reuselib
```

**状況**: そのままだと `ui5 build` の出力が `dist/resources/reuselib/...` というパスになり、
ライブラリのリソース解決パス `com/myorg/reuselib/` で配信できない。

**原因**: `ui5 build` は `metadata.name` をそのままリソースの namespace パスに使う。
ライブラリの実 namespace と一致させる必要がある。

### 2. `ui5-deploy.yaml` — `framework` セクションの追加

`ui5.yaml` からコピーするだけでなく、framework セクションも必ず複製する:

```yaml
framework:
  name: SAPUI5
  version: 1.146.0
  libraries:
    - name: sap.ui.core
    - name: themelib_sap_fiori_3
```

**状況**: framework セクションなしでビルドすると `buildThemes` タスクが
`Could not find file at path '/resources/sap/ui/core/themes/.../base.less'`
で失敗する。

**原因**: ライブラリ の theme `.less` ファイルが `@import "/resources/sap/ui/core/themes/.../base.less"`
を書いている。これを解決するには `sap.ui.core` と `themelib_sap_fiori_3` がビルドの依存に含まれて
いる必要がある。consumerapp は `type: application` なので独自 `.less` をビルドせず、
この依存がなくても通っていた。ライブラリでは必須。

### 3. `ui5-deploy.yaml` — `ui5-task-zipper` の `afterTask` を `buildThemes` に

consumerapp の `ui5-deploy.yaml` をコピーしたままだと:

```
Could not find task generateCachebusterInfo, referenced by custom task ui5-task-zipper,
to be scheduled for project com.myorg.reuselib
```

というエラーになる。

**原因**: `generateCachebusterInfo` は `type: application` のビルドタスク。
ライブラリビルドではスケジュールされない。ライブラリビルドの最後に実行されるタスクは
`buildThemes` なので、これを `afterTask` に指定する。

```yaml
- name: ui5-task-zipper
  afterTask: buildThemes  # For libraries, generateCachebusterInfo is not executed
  configuration:
    archiveName: commyorgreuselib
    relativePaths: true
    additionalFiles:
      - xs-app.json
```

### 4. `--output-style flat` は使わない

ライブラリの `ui5 build` 出力は `dist/resources/com/myorg/reuselib/...` というネスト構造になる。
これをフラット化したくて `--output-style flat` を CLI に渡すと、zip 自体が生成されなくなる
(警告だけが出る):

```
warn ProjectBuilder Omitting /commyorgreuselib.zip from build result.
                    File is not within project namespace 'com/myorg/reuselib'.
```

**原因**: `--output-style flat` はビルド成果物をプロジェクト namespace 内のものだけに絞り込む。
`ui5-task-zipper` は仮想 FS のルートに zip を書き出すので「namespace 外」と判定されて捨てられる。

**対応**: `--output-style flat` を使わない。`dist/` 自体はネスト構造のままで構わない。
zip の中身は `ui5-task-zipper` の `relativePaths: true` 設定によって自動的にフラットになる
(namespace プレフィックスが取り除かれ、`manifest.json` が zip ルートに来る)。

つまり [package.json](../../com.myorg.reuselib/package.json) の `build:cf` は次のとおりでよい:

```json
"build:cf": "ui5 build --clean-dest --config ui5-deploy.yaml --dest dist"
```

### 5. `xs-app.json` — `^/index.html$` と `^/logout-page.html$` ルートの削除

consumerapp(アプリ)には `index.html` と `logout-page.html` を直接配信するルートがあるが、
ライブラリにはいずれの HTML ファイルも存在しないため削除する。ライブラリは consumer アプリ側の
`^/resources/com/myorg/reuselib/(.*)$` ルート経由で配信される静的リソース集合であり、
エンドユーザーがライブラリの URL に直接アクセスすることはない:

```diff
 {
   "source": "^/test-resources/(.*)$",
   ...
 },
-{
-  "source": "^/logout-page.html$",
-  "service": "app-front",
-  "authenticationType": "none"
-},
-{
-  "source": "^/index.html$",
-  "service": "app-front",
-  "cacheControl": "no-cache, no-store, must-revalidate"
-},
 {
   "source": "^(.*)$",
   ...
 }
```

### 6. `xs-security.json` — `xsappname` のみカスタマイズ

```json
{
  "xsappname": "commyorgreuselib",
  "tenant-mode": "dedicated",
  "description": "Security profile of called application",
  "scopes": [],
  "role-templates": []
}
```

その他のフィールドはテンプレートのまま。

### 7. `mta.yaml` — モジュール / リソース名を置換

consumerapp の `mta.yaml` をコピーし、`miyasutaconsumerapp` を `commyorgreuselib` に
すべて置換するだけでよい。`html5` モジュールの build コマンドはそのまま
`npm install && npm run build:cf` で OK。

### 8. `package.json` — スクリプトと依存関係

```diff
 "scripts": {
+  "build:cf": "ui5 build --clean-dest --config ui5-deploy.yaml --dest dist",
+  "build:mta": "rimraf resources mta_archives && mbt build",
-  "deploy": "fiori verify",
+  "deploy": "fiori cfDeploy",
   ...
 },
 "devDependencies": {
+  "ui5-task-zipper": "^3.6.0",
   ...
 }
```

**`fiori verify` の罠**: ライブラリ プロジェクト初期化時点では `deploy` スクリプトが
`fiori verify` になっており、これは**プロジェクト設定の検証だけ**で実際にデプロイしない。
consumerapp と同じ `fiori cfDeploy` に置き換える。

**未追加の依存(要対応)**: `build:mta` は内部で `rimraf` と `mbt` を使うが、
ライブラリの `devDependencies` には追加されていない。グローバル インストールや親ディレクトリの
`node_modules` から解決できれば動くが、リポジトリ単体で再現するなら明示的に追加する:

```bash
cd com.myorg.reuselib
npm install --save-dev mbt rimraf
```

## デプロイ手順

すべての設定が整ったあとの実行手順:

```bash
cd com.myorg.reuselib

# 1. ライブラリをビルドして dist/commyorgreuselib.zip を生成
npm run build:cf

# 2. mtar アーカイブを生成
npm run build:mta

# 3. Cloud Foundry にデプロイ
npm run deploy

# 4. デプロイ結果を Application Frontend service で確認
afctl list
```

## 確認方法

`afctl list` の出力に `com.myorg.reuselib` が表示されればデプロイ成功。

zip の中身を事前確認したい場合:

```bash
unzip -l com.myorg.reuselib/dist/commyorgreuselib.zip
```

`manifest.json` と `xs-app.json` が **zip ルート直下**にあること、`library.js` /
`library-preload.js` などのライブラリ本体ファイルもルート直下にあることが必須要件。

## 参考リンク

- [Application Frontend — Minimal Requirements for Applications](https://help.sap.com/docs/APPLICATION_FRONTEND/9affcc2d6aca4f9d9a5414c13e5ea894/d3f8b4884bd4477ab0cd770b6db5d6a7.html)
- [Application Frontend — Reusing Application Resources](https://help.sap.com/docs/APPLICATION_FRONTEND/9affcc2d6aca4f9d9a5414c13e5ea894/5aa6d1d47335413bbe6bef5b723f2c86.html)
- [`ui5-task-zipper` npm](https://www.npmjs.com/package/ui5-task-zipper)
