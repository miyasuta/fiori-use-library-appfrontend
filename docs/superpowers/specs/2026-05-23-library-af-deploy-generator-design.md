# Design: `generator-ui5-library-af-deploy` (Yeoman Generator MVP)

UI5 ライブラリ プロジェクトに対して Application Frontend service への
デプロイ設定を自動生成する Yeoman ジェネレータの設計書。

- 発端のアイディアメモ: [library-deployment-generator-idea.md](../../project/library-deployment-generator-idea.md)
- 手動構築のリファレンス: [library-deployment.md](../../project/library-deployment.md)

## 1. 背景・動機

`fiori add deploy-config` は UI5 ライブラリ プロジェクトに対しては ABAP デプロイ
の選択肢しか出さず、Cloud Foundry / Application Frontend へのデプロイを支援しない。
ライブラリ デプロイ設定は consumer アプリのものを流用 + 数箇所の手動調整という
パターンが明確で、自動化に向いている。

`fiori add deploy-config` がライブラリ + CF をサポートし始めたら本ジェネレータは
陳腐化するが、当面は手作業を肩代わりする実用価値がある。

## 2. スコープ (MVP)

### 対象

- **対象プロジェクト**: `ui5.yaml` で `type: library` の UI5 プロジェクト
- **デプロイ先**: Application Frontend service のみ
- **認証タイプ**: `ias` のみ (`xs-app.json` の `authenticationType: "ias"` 固定)
- **distribution**: 独立した npm パッケージ `generator-ui5-library-af-deploy`
  (スコープなし)

### 対象外 (将来検討)

- HTML5 Application Repository (従来の App Router 経由) へのデプロイ
- consumer アプリ側の `xs-app.json` への reuse ルート追加
- ABAP デプロイ
- `xsuaa` / `none` 等、`ias` 以外の認証タイプ
- 既存 `app-front` インスタンス共用シナリオ

## 3. 主要な決定事項

| 項目 | 決定 | 理由 |
|---|---|---|
| 配置 | 同一リポジトリ (`generator-ui5-library-af-deploy/`) | 検証対象 (ライブラリ) と並走しイテレーション速度を最大化。npm publish は `files` で限定 |
| 言語 | TypeScript | ライブラリ プロジェクトと一貫、`@sap-ux/ui5-config` 等の型を活用 |
| ベース | Yeoman (`yeoman-generator` v7 + `mem-fs-editor`) | テンプレート展開と既存ファイル安全更新 (`extendJSON`) が標準で揃う |
| テスト | スナップショット + ブランチ diff 検証 | 手動構築 (`main`) と完全等価かを担保 |
| 再実行時の挙動 | Yeoman 標準の上書き確認に任せる | 学習コストゼロ、JSON にコメント不可なのでマーカー方式は不採用 |
| パッケージ名 | `generator-ui5-library-af-deploy` (スコープなし) | ユーザの既存 npm publish 慣習に合わせる。固有名で衝突リスク低 |
| CLI コマンド | `yo ui5-library-af-deploy` | Yeoman の規約 |
| ユーザー対話 | 必要時 1 プロンプトのみ (namespace 書き換え確認) | 自動検出を優先、不一致時のみ確認 |
| in-code 文字列 | 英語 | 公開予定 npm パッケージとして自然な選択 |

## 4. ブランチ構成

ジェネレータ開発と検証を成立させるため、以下のブランチを使う。

| ブランチ | 内容 | 役割 |
|---|---|---|
| `feature/library-af-deploy-generator` | 開発ブランチ。ジェネレータ実装 + 既存ファイル | ここで開発。完了後 `main` へマージ |
| `main` | ライブラリ + consumer + 手動デプロイ設定 | **統合テストの期待出力リファレンス**。ジェネレータをマージしても `com.myorg.reuselib/` 配下の deploy 設定ファイルは変更しない |
| `library-pre-deploy-config` | デプロイ設定追加前のライブラリ + consumer | **統合テストの入力リファレンス**。ジェネレータが処理する "before" 状態 |
| `library-initial-state` | Easy-UI5 ジェネレータ の素の出力 | 履歴アーカイブ。本ジェネレータ開発では使わない |

### リネーム前の状態 (記録)

- 旧 `main` (04dd4fa) → `library-pre-deploy-config` にリネーム
- 旧 `deploy-config-manual` (9dc924d) → `main` にリネーム

remote 未設定の状態でのローカル rename のため安全に実施可能。

## 5. ディレクトリ構造

```
fiori-use-library-appfrontend/
├── com.myorg.reuselib/                          # 既存ライブラリ (変更なし)
├── consumerapp/                                  # 既存 consumer app (変更なし)
├── docs/
│   ├── project/library-deployment.md             # 既存 (リファレンス)
│   ├── project/library-deployment-generator-idea.md  # 既存 (発端のメモ)
│   └── superpowers/specs/
│       └── 2026-05-23-library-af-deploy-generator-design.md  # 本書
└── generator-ui5-library-af-deploy/             # ★新規パッケージ
    ├── package.json
    ├── tsconfig.json
    ├── README.md
    ├── .gitignore                                # dist/, node_modules/
    ├── src/
    │   └── app/
    │       ├── index.ts                          # Generator サブクラス
    │       ├── detect.ts                         # namespace / version 検出
    │       └── templates/
    │           ├── mta.yaml.ejs
    │           ├── ui5-deploy.yaml.ejs
    │           ├── xs-app.json                   # 完全に静的
    │           └── xs-security.json.ejs
    ├── dist/                                     # tsc 出力 + templates のコピー
    │   └── app/
    │       ├── index.js
    │       ├── detect.js
    │       └── templates/
    └── test/
        ├── fixtures/
        │   └── library-namespace-form/           # ui5.yaml / package.json / library.ts の最小セット
        ├── snapshots/                            # 期待出力 (git 管理)
        ├── unit.test.ts                          # スナップショット比較
        └── integration.test.ts                   # library-pre-deploy-config → main 比較
```

## 6. ジェネレータ本体 (`src/app/index.ts`)

`yeoman-generator` のライフサイクル 3 フェーズ (`initializing` → `prompting` → `writing`) を使用。

```typescript
import Generator from "yeoman-generator";
import { detect, Context } from "./detect.js";

export default class extends Generator {
    private ctx!: Context;
    private needsUi5YamlUpdate = false;
    private currentMetadataName = "";

    async initializing(): Promise<void> {
        const result = await detect(this.destinationPath());
        this.ctx = result.context;
        this.needsUi5YamlUpdate = result.needsUi5YamlUpdate;
        this.currentMetadataName = result.currentMetadataName;
    }

    async prompting(): Promise<void> {
        if (!this.needsUi5YamlUpdate) return;

        const { updateNamespace } = await this.prompt<{ updateNamespace: boolean }>([{
            type: "confirm",
            name: "updateNamespace",
            message:
                `ui5.yaml metadata.name is "${this.currentMetadataName}". ` +
                `Update it to "${this.ctx.libraryNamespace}" (detected from src/ structure)?`,
            default: true,
        }]);

        if (!updateNamespace) {
            this.env.error(
                "Aborted: metadata.name must match the src/ directory structure to deploy properly."
            );
        }
    }

    writing(): void {
        // 4 new files
        this.fs.copyTpl(
            this.templatePath("mta.yaml.ejs"),
            this.destinationPath("mta.yaml"),
            this.ctx
        );
        this.fs.copyTpl(
            this.templatePath("ui5-deploy.yaml.ejs"),
            this.destinationPath("ui5-deploy.yaml"),
            this.ctx
        );
        this.fs.copy(
            this.templatePath("xs-app.json"),
            this.destinationPath("xs-app.json")
        );
        this.fs.copyTpl(
            this.templatePath("xs-security.json.ejs"),
            this.destinationPath("xs-security.json"),
            this.ctx
        );

        // ui5.yaml metadata.name update (only if needed)
        if (this.needsUi5YamlUpdate) {
            this.updateUi5YamlMetadataName();
        }

        // package.json scripts / devDependencies update
        this.fs.extendJSON(this.destinationPath("package.json"), {
            scripts: {
                "build:cf": "ui5 build --clean-dest --config ui5-deploy.yaml --dest dist",
                "build:mta": "rimraf resources mta_archives && mbt build",
                deploy: "fiori cfDeploy"
            },
            devDependencies: {
                "ui5-task-zipper": "^3.6.0",
                mbt: "^1.2.49",
                rimraf: "^6.1.3"
            }
        });
    }

    private updateUi5YamlMetadataName(): void {
        const path = this.destinationPath("ui5.yaml");
        const content = this.fs.read(path);
        const updated = content.replace(
            /^(\s*name:\s*)["']?[^"'\n]+["']?(\s*$)/m,
            `$1${this.ctx.libraryNamespace}$2`
        );
        this.fs.write(path, updated);
    }
}
```

### 設計判断

- `prompting` で出すのは 1 プロンプトのみ。`ui5.yaml` の `metadata.name` が
  `src/` 構造から導出した namespace と一致していれば、プロンプトなしで完了
- `ui5.yaml` の更新は YAML を re-dump するとコメントや空行が失われるため、
  `metadata.name` 1 行のみを regex でピンポイント置換
- `package.json` は `extendJSON` でディープマージ。既存 scripts/devDependencies を温存

## 7. 検出ロジック (`src/app/detect.ts`)

`ui5.yaml` から framework version とライブラリ一覧を読み、`src/**/library.{ts,js}`
からネームスペースを導出する。

```typescript
import { readFile } from "node:fs/promises";
import { load as parseYaml } from "js-yaml";
import { glob } from "glob";

interface Ui5Yaml {
    metadata: { name: string };
    framework?: {
        version?: string;
        libraries?: Array<{ name: string }>;
    };
}

export interface Context {
    libraryNamespace: string;      // "com.myorg.reuselib"
    archiveName: string;           // "commyorgreuselib"
    sapui5Version: string;         // "1.146.0"
    frameworkLibraries: string[];  // ["sap.ui.core", "themelib_sap_fiori_3"]
}

export interface DetectResult {
    context: Context;
    needsUi5YamlUpdate: boolean;
    currentMetadataName: string;
}

export async function detect(projectRoot: string): Promise<DetectResult> {
    const raw = await readFile(`${projectRoot}/ui5.yaml`, "utf8");
    const parsed = parseYaml(raw) as Ui5Yaml;

    const currentName = parsed.metadata?.name;
    if (!currentName) throw new Error("ui5.yaml: metadata.name is required");

    const detectedNamespace = await detectNamespaceFromSrc(projectRoot);
    const needsUi5YamlUpdate = currentName !== detectedNamespace;

    const version = parsed.framework?.version;
    if (!version) throw new Error("ui5.yaml: framework.version is required");

    const libraries = (parsed.framework?.libraries ?? []).map(l => l.name);
    if (libraries.length === 0) {
        throw new Error("ui5.yaml: framework.libraries must contain at least one library");
    }

    return {
        context: {
            libraryNamespace: detectedNamespace,
            archiveName: detectedNamespace.replace(/\./g, ""),
            sapui5Version: version,
            frameworkLibraries: libraries,
        },
        needsUi5YamlUpdate,
        currentMetadataName: currentName,
    };
}

async function detectNamespaceFromSrc(projectRoot: string): Promise<string> {
    const matches = await glob("src/**/library.{ts,js}", { cwd: projectRoot });
    if (matches.length === 0) {
        throw new Error("Cannot detect namespace: no src/**/library.{ts,js} found");
    }
    if (matches.length > 1) {
        throw new Error(
            `Cannot detect namespace: multiple library files found: ${matches.join(", ")}`
        );
    }
    return matches[0]
        .replace(/^src\//, "")
        .replace(/\/library\.(ts|js)$/, "")
        .replace(/\//g, ".");
}
```

### 設計判断

- ネームスペースの真の出所は **`src/` のディレクトリ構造**。`ui5.yaml` の
  `metadata.name` はそれと一致すべき派生情報
- `library.{ts,js}` は UI5 ライブラリのエントリポイント (`sap.ui.getCore().initLibrary()`
  を呼ぶファイル) で、ライブラリのルート namespace を確実に示す
- 複数マッチ時は ambiguous としてエラー (テンプレート構造でないライブラリは
  MVP の対象外)

## 8. テンプレート

### `mta.yaml.ejs`

consumerapp の `mta.yaml` を雛形にして `miyasutaconsumerapp` を
`<%= archiveName %>` に置換。

### `ui5-deploy.yaml.ejs`

ライブラリ専用の調整 (アイディアメモ §2, §3 参照) を含む:
- `framework.version` と `framework.libraries` を埋め込み (theme ビルドで必要)
- `ui5-task-zipper` の `afterTask` を `buildThemes` に (library では
  `generateCachebusterInfo` が存在しないため)
- `archiveName` を埋め込み

### `xs-app.json` (静的)

consumerapp の `xs-app.json` から `^/index.html$` ルートを削除したもの。
テンプレート変数なし。

### `xs-security.json.ejs`

```json
{
  "xsappname": "<%= archiveName %>",
  "tenant-mode": "dedicated",
  "description": "Security profile of called application",
  "scopes": [],
  "role-templates": []
}
```

## 9. テスト戦略

### 9.1 単体スナップショットテスト (`test/unit.test.ts`)

ジェネレータを一時ディレクトリで実行し、生成された 4 + 2 ファイルの内容を
fixture のスナップショットと比較。

- ランナー: `node:test` (追加依存最小、プロジェクト方針に合わせ jest 不使用)
- ジェネレータ実行ヘルパー: `yeoman-test`
- スナップショットは git 管理。更新は明示的に手で

### 9.2 統合 (ブランチ diff) テスト (`test/integration.test.ts`)

`library-pre-deploy-config` ブランチの `com.myorg.reuselib/` 状態にジェネレータを
実行し、結果が `main` ブランチと一致することを検証。

- `git show <branch>:<path>` で他ブランチのファイルを直接取り出してファイル単位で比較
- これが **手動構築と完全に等価か** を担保する真の合格基準
- 比較方法の使い分け:
  - `mta.yaml` / `ui5-deploy.yaml` / `xs-app.json` / `xs-security.json` / `ui5.yaml`:
    **文字列完全一致** (改行を含めバイト等価)
  - `package.json`: **JSON パース後、`scripts` と `devDependencies` を個別アサート**
    - 順序とインデントは `extendJSON` の挙動で変わりうるため文字列比較は不可
    - ジェネレータが追加した key (`build:cf`, `build:mta`, `deploy`,
      `ui5-task-zipper`, `mbt`, `rimraf`) について値が `main` と一致することを検証
    - main にあってジェネレータが触らない既存 key は検証しない

### 9.3 npm scripts

```json
{
  "scripts": {
    "build": "tsc && cp -r src/app/templates dist/app/",
    "test": "npm run build && node --test --experimental-strip-types \"test/**/*.test.ts\"",
    "test:unit": "npm run build && node --test --experimental-strip-types test/unit.test.ts",
    "test:integration": "npm run build && node --test --experimental-strip-types test/integration.test.ts",
    "prepublishOnly": "npm run build && npm test"
  }
}
```

## 10. 開発時の動作確認ワークフロー

### A. git worktree 方式 (反復実行向け、推奨)

```bash
# === 一度だけ実行 ===
git worktree add ../fiori-test-pre-deploy library-pre-deploy-config

cd generator-ui5-library-af-deploy
npm install && npm run build && npm link
npm install -g yo   # 初回のみ

# === 開発ループ ===
cd ../../fiori-test-pre-deploy/com.myorg.reuselib
yo ui5-library-af-deploy

# 結果確認
git diff               # ローカル diff (生成物の概観)
git diff main -- .     # 期待出力 (main) との一致を目視確認

# リセット
git restore .
git clean -fd
```

ジェネレータ側を更新したら `npm run build` で再ビルド。`npm link` で繋がっている
ため、次の `yo` 実行は最新コードを使う。

### B. /tmp 経由 (一回きりの確認向け)

```bash
rm -rf /tmp/lib-test && mkdir /tmp/lib-test
git archive library-pre-deploy-config com.myorg.reuselib | tar -x -C /tmp/lib-test
cd /tmp/lib-test/com.myorg.reuselib
yo ui5-library-af-deploy
```

git の状態を一切汚さない。リセットは `rm -rf /tmp/lib-test` のみ。

## 11. ジェネレータの `package.json` と build 設定

### `package.json`

```json
{
  "name": "generator-ui5-library-af-deploy",
  "version": "0.1.0",
  "description": "Yeoman generator to add Application Frontend deployment configuration to a UI5 library project",
  "type": "module",
  "files": ["dist/", "README.md"],
  "keywords": ["yeoman-generator", "ui5", "sap", "application-frontend"],
  "scripts": {
    "build": "tsc && cp -r src/app/templates dist/app/",
    "test": "npm run build && node --test --experimental-strip-types \"test/**/*.test.ts\"",
    "test:unit": "npm run build && node --test --experimental-strip-types test/unit.test.ts",
    "test:integration": "npm run build && node --test --experimental-strip-types test/integration.test.ts",
    "prepublishOnly": "npm run build && npm test"
  },
  "dependencies": {
    "yeoman-generator": "^7.0.0",
    "js-yaml": "^4.1.0",
    "glob": "^11.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/js-yaml": "^4.0.9",
    "@types/yeoman-generator": "^5.2.14",
    "typescript": "^5.9.3",
    "yeoman-test": "^10.0.0"
  },
  "peerDependencies": { "yo": ">=5.0.0" },
  "engines": { "node": ">=20.0.0" }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "sourceMap": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

## 12. リスクと留意点

| リスク | 対応 |
|---|---|
| `fiori add deploy-config` が将来ライブラリ + CF をサポートした場合、本ジェネレータは陳腐化 | アイディアメモにある通り、その時点で deprecation を検討 |
| `xs-app.json` / `mta.yaml` のスキーマバージョン変化 | テンプレートに schema-version を明示。変化時は手動更新が必要 |
| `metadata.name` の自動書き換えがユーザの意図と異なる場合 | プロンプトで確認、拒否時は中断 |
| `extendJSON` のキー順が手書きと異なる | 統合テストでは package.json は順序非依存比較に限定 |
| ライブラリ ID と `xsappname` が完全に同じになる前提が崩れる場合 | MVP の前提として固定。将来オプション化を検討 |
| テンプレート埋め込みの版指定が古くなる | 後述「依存バージョンの管理ポリシー」参照。`main` の値と同期する運用で対処 |

## 12.1 依存バージョンの管理ポリシー

ジェネレータ が consumer の `package.json` に追記する版指定 (`ui5-task-zipper`,
`mbt`, `rimraf`) は **テンプレートにハードコード** する。Yeoman の慣例的な方式。

- 起点となる版は `main` ブランチの `com.myorg.reuselib/package.json` と一致させる
  - 現時点: `ui5-task-zipper: ^3.6.0`, `mbt: ^1.2.49`, `rimraf: ^6.1.3`
  - 統合テストが完全等価比較で検証する前提
- 更新手順:
  1. `main` で `npm update <pkg>` を実行
  2. 新しい版がコミットされたら、ジェネレータのテンプレートにも同じ版を反映
  3. 統合テストが緑になることを確認
- consumer 側の `npm install` 時には `^` セマンティクスでパッチ / マイナーが
  最新化されるため、ジェネレータの版が数ヶ月遅れていても大きな問題は起きにくい

## 13. 将来の拡張アイディア (MVP 対象外)

- 既存 `app-front` インスタンス共用モード (プロンプトで切替)
- consumer アプリ側の `xs-app.json` に reuse ルートを追加する sub-generator
  (`yo ui5-library-af-deploy:consumer-route`)
- HTML5 App Repository 経由のデプロイ対応 (別ターゲットとして)
- `afctl` 連携で生成直後にデプロイ確認まで一気通貫
- 3つの reuse パターン (Reusable Application / Application Extension /
  UI Mashup) それぞれに合わせたテンプレート
- `.yo-rc.json` への状態保存で再実行時の振る舞い改善
