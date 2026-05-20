# UI5 ライブラリ デプロイ用 Yeoman ジェネレータ構想

[library-deployment.md](library-deployment.md) で文書化した「UI5 ライブラリ を Application Frontend
service にデプロイするための手動構築」を、Yeoman ジェネレータで自動化するアイディアの記録。

実装はまだ着手していない段階。要件と設計方針のメモ。

## 背景・動機

- `fiori add deploy-config` は UI5 ライブラリ プロジェクトに対して ABAP デプロイの選択肢しか出さず、
  Cloud Foundry / Application Frontend へのデプロイを支援しない
- Fiori Tools のライブラリ系ジェネレータ全般は近年ほとんど更新がなく、SAP が本件に取り組む気配は薄い
- ライブラリのデプロイ設定は consumerapp(Fiori アプリ)のものを流用 + 数箇所の手動調整 という
  パターンが明確で、自動化に向いている

## スコープ

### MVP の対象

- **対象プロジェクト**: `type: library` の UI5 プロジェクト(`ui5.yaml` から判定)
- **デプロイ先**: Application Frontend service のみ
- **認証タイプ**: `ias` のみ(`xs-app.json` の `authenticationType: "ias"` 固定)
  - これは「Application Frontend を使う」という前提と等価
- **distribution**: 独立した npm パッケージ(`generator-*`)として公開

### 対象外(初期スコープでは扱わない)

- HTML5 Application Repository(従来の App Router 経由)へのデプロイ
- consumer アプリ側の `xs-app.json` への reuse ルート追加
- ABAP デプロイ
- `xsuaa` / `none` 等、`ias` 以外の認証タイプ
- 既存の `app-front` インスタンス共用シナリオ(常に新規作成する想定)

## 生成・更新するファイル

### 新規作成(4ファイル)

| ファイル | 内容 | テンプレート変数 |
|---|---|---|
| `mta.yaml` | MTA 定義 | `mtaId`, `version`, `moduleName`, `serviceNames` |
| `ui5-deploy.yaml` | デプロイ用 UI5 設定 | `libraryName`, `sapui5Version`, `frameworkLibraries`, `archiveName` |
| `xs-app.json` | アプリルーティング | (ほぼ静的、`destination: ui5` 等は固定) |
| `xs-security.json` | XSUAA 設定 | `xsappname` |

### 既存ファイル更新(2ファイル)

- **`ui5.yaml`**: `metadata.name` が namespace 形式(ドット区切り)になっていなければ修正
- **`package.json`**:
  - `scripts`: `build:cf`, `build:mta`, `deploy`(あるいは既存 `deploy` を上書き)を追加
  - `devDependencies`: `ui5-task-zipper`, `mbt`, `rimraf` を追加

## 自動検出する値(プロンプト不要)

前提として、ジェネレータは**ライブラリプロジェクトのルートディレクトリ上から実行する**。
ライブラリのソース(`ui5.yaml` / `package.json`)から取得できる情報はすべてプロンプトを出さず、
自動的に決定する。

| 値 | 取得元 |
|---|---|
| ライブラリ ID(`com.myorg.reuselib`) | `ui5.yaml` の `metadata.name` |
| アーカイブ短縮名(`commyorgreuselib`) | ライブラリ ID からドットを除去して導出 |
| `xsappname` | アーカイブ短縮名と同一 |
| SAPUI5 バージョン | `ui5.yaml` の `framework.version` |
| `framework.libraries`(`sap.ui.core` 等) | `ui5.yaml` の同セクションを `ui5-deploy.yaml` に複製 |
| MTA ID / モジュール名 / サービス名 | アーカイブ短縮名から導出 |

## ユーザ入力(プロンプト)

MVP のスコープでは**ユーザに尋ねる項目はない**(認証タイプ `ias` 固定、新規 `app-front`
インスタンス固定、自動検出値で十分なため)。

唯一の対話は Yeoman 標準の **既存ファイル上書き確認** のみ。

## 依存ライブラリ(実装時に活用したいもの)

- `yeoman-generator` — ジェネレータ基盤
- `@sap-ux/ui5-config` — `ui5.yaml` の programmatic 読み書き
- `@sap-ux/project-access` — UI5 プロジェクトの検出 / ファイル探索
- `mem-fs-editor`(Yeoman 付属) — 既存ファイルの安全な更新

これらを使えばテンプレート展開と既存ファイルへの追記を堅牢に書ける。

## 想定する利用フロー

```bash
cd com.myorg.reuselib                                # ライブラリプロジェクトのルートで実行
yo @<scope>/ui5-library-af-deploy                    # 設定ファイル群を生成

# ui5.yaml / package.json から必要な値を読み取り、プロンプトなしで以下を生成:
#   create  mta.yaml
#   create  ui5-deploy.yaml
#   create  xs-app.json
#   create  xs-security.json
#   update  ui5.yaml          (metadata.name が namespace 形式でなければ修正)
#   update  package.json      (scripts / devDependencies を追記)
# 既存ファイルがある場合のみ Yeoman 標準の上書き確認が走る

# 生成完了後:
npm install                                          # 追加された devDeps を解決
npm run build:cf && npm run build:mta && npm run deploy
```

## 段階的な拡張アイディア(MVP 後)

- 既存の `app-front` インスタンス共用モード(プロンプトで切替)
- consumer アプリ側の `xs-app.json` に reuse ルートを追加する付随コマンド
  (`yo @<scope>/ui5-library-af-deploy:consumer-route`)
- HTML5 App Repository 経由のデプロイ対応(別ターゲットとして)
- `afctl` との連携で、生成直後にデプロイ確認まで一気通貫
- 3つの reuse パターン(Reusable Application / Application Extension / UI Mashup)
  それぞれに合わせたテンプレート

## 留意点

1. **mta / xs-app.json スキーマ変化への追従**
   schema-version などのスキーマ進化に対するメンテナンス負荷を考慮。
   テンプレート内の構造部分と可変値部分を明確に分離しておく。

2. **SAP 公式対応の動向監視**
   `fiori add deploy-config` がライブラリ + CF をサポートし始めたら本ジェネレータは陳腐化する。
   その時点で内部実装の置き換えか、deprecation を検討。

3. **テスト戦略**
   - 単体: 生成ファイルのスナップショット比較
   - 結合: 生成されたプロジェクトが実際に `mbt build` できることを検証
   - 可能なら BTP のサンドボックスに対する deploy までを E2E に含める

## 次の検討事項(着手前に詰めるべきこと)

- npm スコープ / パッケージ名の決定
- 既存ファイルが「ジェネレータ生成済み」か「ユーザ手作業の改変」かを判別する仕組み
  (二度目以降の実行で安全に再生成できるか)
- 認証タイプ `ias` 固定が将来の選択肢拡張時にどう影響するか(ファイル単位で書き換えやすい形に)
- 内部状態をローカルファイル(`.yo-rc.json`)に残すかどうか
