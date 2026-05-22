# 利用側アプリ (consumerapp) でライブラリを使用するための設定

UI5 ライブラリ [com.myorg.reuselib](../../com.myorg.reuselib/) を利用側の UI5 アプリ
[consumerapp](../../consumerapp/) から使うために必要だった設定の記録。ローカル開発、
TypeScript 型解決、本番デプロイ後の Application Frontend ルーティング、SAP Build
Work Zone への iFrame 統合まで、一連の設定をまとめている。

姉妹ドキュメント: ライブラリ側のデプロイ設定は
[library-deployment.md](library-deployment.md) を参照。

## 全体像

| 種別 | 対象 | 変更内容 |
|---|---|---|
| 更新 | [tsconfig.json](../../consumerapp/tsconfig.json) | `typeRoots` → `types` に変更、`files` に library の型を追加 |
| 更新 | [webapp/manifest.json](../../consumerapp/webapp/manifest.json) | `dependencies.libs` に `com.myorg.reuselib` 追加 |
| 更新 | [webapp/index.html](../../consumerapp/webapp/index.html) | `data-sap-ui-resource-roots` に library namespace を追加 |
| 更新 | [ui5.yaml](../../consumerapp/ui5.yaml) | `fiori-tools-servestatic` でローカルの library dist を配信 |
| 更新 | [ui5-local.yaml](../../consumerapp/ui5-local.yaml) | 同上(ローカルプレビュー用) |
| 更新 | [xs-app.json](../../consumerapp/xs-app.json) | `application:` ルートで library application にフォワード |
| 設定 | BTP Cockpit | Trusted Domain に Work Zone ドメインを追加 (iFrame 表示時) |

## 設定の詳細とつまずきポイント

### 1. `tsconfig.json` — `@sapui5/types` の読み込み方

```diff
-    "typeRoots": [
-      "./node_modules/@types",
-      "./node_modules/@sapui5/types"
-    ]
+    "types": [
+      "@sapui5/types",
+      "qunit"
+    ]
   },
   "include": [
     "./webapp/**/*"
+  ],
+  "files": [
+    "../com.myorg.reuselib/dist/index.d.ts"
   ]
```

**状況**: Fiori Tools が生成した初期 `tsconfig.json` には `typeRoots` で `@sapui5/types`
が指定されていたが、`Cannot find module 'sap/ui/core/mvc/Controller'` の TypeScript
エラーが VSCode 上でだけ発生していた (`tsc --noEmit` は通る)。

**原因**: `@sapui5/types` パッケージは `package.json` の `"types": "types/index.d.ts"`
で **通常の npm パッケージ形式** のエントリポイントを持つ。`typeRoots` は
`@types/*` 流儀(サブディレクトリ = 1 パッケージ)を期待する設定で噛み合わせが悪く、
`tsc` CLI では動いても VSCode の TypeScript Server で型解決に失敗する。

**対応**: `types: ["@sapui5/types", "qunit"]` に変更。`types` は **allowlist** なので、
テストコードが `QUnit` グローバルを使うなら `qunit` も明示的に列挙する必要がある。

**ライブラリの型の取り込み**: `files` に library の `dist/index.d.ts` を追加することで、
`MyDialogHandler` 等のクラス型と `MyDialogHandler$SubmitEvent` のような UI5 イベント型
が解決できるようになる。

### 2. `webapp/manifest.json` — library を依存に宣言

```diff
     "dependencies": {
       "minUI5Version": "1.148.0",
       "libs": {
         "sap.m": {},
-        "sap.ui.core": {}
+        "sap.ui.core": {},
+        "com.myorg.reuselib": {
+          "lazy": false
+        }
       }
     },
```

`libs` に library の `sap.app.id` を追加することで、UI5 はアプリ起動時に
`library.js` / `library-preload.js` を自動的にロードする。

`lazy: false` は起動時に即ロード。lazy ロードしたい場合は `lazy: true` にする。

### 3. `webapp/index.html` — resourceRoots の登録

```diff
         data-sap-ui-resource-roots='{
-            "miyasuta.consumerapp": "./"
+            "miyasuta.consumerapp": "./",
+            "com.myorg.reuselib": "./resources/com/myorg/reuselib"
         }'
```

UI5 に対して `com.myorg.reuselib` namespace のリソースが `/resources/com/myorg/reuselib`
配下にあると教える。`com/myorg/reuselib` のスラッシュ区切りパスがそのまま URL に
反映される。

### 4. ローカル開発 — `ui5.yaml` / `ui5-local.yaml` で library dist を静的配信

```yaml
    - name: fiori-tools-servestatic
      beforeMiddleware: fiori-tools-proxy
      configuration:
        paths:
          - path: /resources/com/myorg/reuselib
            src: ../com.myorg.reuselib/dist/resources/com/myorg/reuselib
            fallthrough: false
```

**状況**: ローカルで `npm start` した時、`/resources/com/myorg/reuselib/library.js`
等のリクエストは普通だと UI5 CDN (`https://ui5.sap.com`) にフォワードされて 404 になる。

**原因**: `fiori-tools-proxy` のデフォルトは `/resources` を UI5 CDN にプロキシする。
ローカル開発時はビルド済みの library を直接配信する必要がある。

**対応**: `fiori-tools-servestatic` を `fiori-tools-proxy` より **前** (`beforeMiddleware`)
に置き、`/resources/com/myorg/reuselib` 配下を library の `dist/resources/com/myorg/reuselib/`
から配信する。`fallthrough: false` で、該当パスに対しては必ずローカルを使う。

**前提**: 事前に library 側で `npm run build` (または `ui5 build`) を実行し、
`dist/resources/com/myorg/reuselib/` 配下にビルド成果物がある必要がある。

`ui5.yaml` (本番ビルド時) と `ui5-local.yaml` (ローカルプレビュー時) の両方に同じ
設定を入れる。

### 5. 本番ルーティング — `xs-app.json` の `application:` ルート

```diff
   "routes": [
+    {
+      "source": "^/resources/com/myorg/reuselib/(.*)$",
+      "target": "/$1",
+      "application": "com.myorg.reuselib@1.0.0"
+    },
     {
       "source": "^/resources/(.*)$",
       ...
```

**状況**: デプロイ後、Application Frontend 上で consumerapp を開くと
`/resources/com/myorg/reuselib/library.js` が 404 になる。

**原因**: Application Frontend では、別の deployed application のリソースに
アクセスするには xs-app.json で **明示的に `application:` ルート** を書く必要が
ある (同一サブアカウント内であっても自動解決はされない)。

**対応**: library application 名 (`<sap.app.id>@<version>`) を指定したルートを
追加する。

**つまずきポイント (重要):**

- **`target` は必ず `/` で始める**。`target: "$1"` (スラッシュなし) では転送先での
  パスが不正となり 404 になる。`target: "/$1"` のように先頭スラッシュ必須。
- **ルート順序**: reusable application を指すルートは consuming app 自身の静的リソース
  ルート (`^/resources/(.*)$` 等) より **前** に置く必要がある (ブログ要件)。
- **パスのプレフィックス除去**: library 側 zip はルート直下に `library.js` 等が
  置かれる (`ui5-task-zipper` の `relativePaths: true` 設定による) ため、
  consumer 側で `/resources/com/myorg/reuselib/` プレフィックスを `target: /$1` で
  剥がす必要がある。詳細は [library-deployment.md §4](library-deployment.md#4---output-style-flat-は使わない) を参照。

**検証方法**:

ライブラリ単体 URL で 200 が返れば配信は正常:

```
https://commyorgreuselib-xxxxx.<region>.appfront.cloud.sap/library.js  → 200
```

逆にネームスペース付きパスは 404 になる(これは正しい挙動):

```
https://commyorgreuselib-xxxxx.<region>.appfront.cloud.sap/resources/com/myorg/reuselib/library.js  → 404
```

consumer 経由でアクセスして 200 が返れば成功:

```
https://<consumer>.<region>.appfront.cloud.sap/resources/com/myorg/reuselib/library.js  → 200
```

### 6. SAP Build Work Zone への iFrame 統合

In Place (iFrame 埋め込み) で Work Zone から consumerapp を開く場合、BTP Cockpit
で Work Zone のドメインを Trusted Domain として登録する必要がある。新しいタブで
開く設定なら不要。

**手順**:

1. BTP Cockpit → 対象のサブアカウント → **Security** → **Settings**
2. **Trusted Domains** タブで **Add** をクリック
3. Work Zone launchpad の URL を **スキーム+ホスト名のみ** で登録
   (例: `https://ebdf948dtrial.launchpad.cfapps.us10.hana.ondemand.com`)
4. **【必須】consumerapp を再起動** する:
   ```bash
   afctl stop miyasuta.consumerapp
   afctl start miyasuta.consumerapp
   ```
5. Work Zone Content Manager で App の設定:
   - Open App: **In Place**
   - App UI Technology: URL
   - URL: consumerapp の本番 URL

**つまずきポイント (重要)**:

- **Trusted Domain 追加だけでは効かない**: Application Frontend のアプリインスタンスは
  起動時に Trusted Domain リストを読み込んでキャッシュするため、追加後は必ず
  `afctl stop` → `afctl start` で再起動する。再起動しないと iFrame で
  「接続が拒否されました」が継続する。
- **権限**: Security Administrator ロールが必要。
- **`xs-app.json` / `mta.yaml` の変更は不要**(Cockpit UI 操作のみ)。

**切り分け方法**:

iFrame で開いた時のブラウザ DevTools Network タブで、`index.html` のリクエストの
レスポンスヘッダーを確認:

- レスポンスヘッダーが空 (Provisional headers のみ) → Application Frontend が
  接続自体を拒否している。Trusted Domain 未登録か、再起動忘れの可能性。
- `X-Frame-Options: SAMEORIGIN` のみ返っている → Trusted Domain が
  反映されていない。再起動を確認。

#### 6-2. iFrame は開いたがボタンが押せない場合 (UI5 frame-options)

iFrame でアプリが表示されるが **ボタンや入力欄が反応しない** (視覚的にはアプリが
表示されているのに操作だけ効かない) 場合、UI5 のクライアント側クリックジャック
保護が iFrame 内の操作をブロックしている。別タブで開いた時は問題なく動くのが
特徴。

**Console エラー** (アプリ起動時に出る):

```
Embedding blocked because the allowlist or the allowlist service is not
configured correctly - sap/ui/security/FrameOptions
```

**原因**: Fiori Tools が生成した [index.html](../../consumerapp/webapp/index.html)
の bootstrap 属性に `data-sap-ui-frame-options="trusted"` が初期値で入っている。
これは cross-origin の iFrame では allowlist サービス側で trusted 判定されない
限り操作をブロックする仕様。UI5 公式ドキュメントによると、`"deny"` / `"trusted"`
モードは **invisible block layer** をページ上に被せて event propagation を止める
(表示はそのまま)。

**対応**: `data-sap-ui-frame-options="trusted"` → `"allow"` に変更。

```diff
         data-sap-ui-async="true"
-        data-sap-ui-frame-options="trusted"
+        data-sap-ui-frame-options="allow"
     ></script>
```

**`allow` で安全か?**: UI5 のクライアント側保護を外しても、以下のサーバー側 2 層で
多層防御は維持される:

1. Application Frontend が常時返す HTTP `X-Frame-Options: SAMEORIGIN`
   (cross-origin の iFrame をブラウザレベルで拒否)
2. BTP Cockpit の **Trusted Domains** に登録したドメインだけ例外的に許可
   (§6 で設定した内容)

最後の 1 層 (UI5 client-side) を外すだけで、HTTP レイヤーと Trusted Domains の
2 層は変わらず効いている。SAP 自身も UI5 ドキュメントで「`frame-options` の
クライアント側保護は古い手法で、サーバー側の CSP `frame-ancestors` がより優れる」
と述べている。

**試したが NG だった方針 (`whitelistService` 連携)**:

Application Frontend の `xs-app.json` には `whitelistService` プロパティが存在
する。標準 Approuter ではこれを有効化すると `endpoint` で指定したパスに allowlist
判定 API が公開されて、UI5 から `data-sap-ui-allowlist-service` 経由で参照
できる仕組み。BTP Cockpit の Trusted Domains と組み合わせれば、`frame-options`
を `"trusted"` のまま使えるはずだった。

しかし実際に有効化してデプロイし、認証済みブラウザで
`/whitelist/service?parentOrigin=...` を叩いたところ **空ボディ** が返り、UI5 が
期待する `{"framing": true, ...}` JSON は返らなかった (2026-05-23 検証)。
Application Frontend が `whitelistService` をどう実装しているかは公式ドキュメント
に明記が無く、現状では `"trusted"` モードでの allowlist 連携は実用的でない。
よって `"allow"` への切り替えを採用した。

## 利用例

[View1.controller.ts](../../consumerapp/webapp/controller/View1.controller.ts):

```typescript
import Controller from "sap/ui/core/mvc/Controller";
import MyDialogHandler, { MyDialogHandler$SubmitEvent } from "com/myorg/reuselib/controller/MyDialogHandler";
import MessageToast from "sap/m/MessageToast";

export default class View1 extends Controller {
    public onOpenDialog(): void {
        const dialogHandler = new MyDialogHandler();
        dialogHandler.attachSubmit((event: MyDialogHandler$SubmitEvent) => {
            const message = event.getParameter("message");
            MessageToast.show(`Dialog submitted with message: ${message}`);
        });
        dialogHandler.open();
    }
}
```

UI5 標準コントロールと同じ感覚で library のクラスを import して使える。
型 (`MyDialogHandler$SubmitEvent` 等) も解決される。

## 検証手順 (ローカル & 本番)

### ローカル開発

```bash
# 1. library をビルド (consumer がローカル dist を参照するため必須)
cd com.myorg.reuselib
npm run build

# 2. consumer を起動
cd ../consumerapp
npm start
```

ブラウザで http://localhost:8080/index.html?sap-ui-xx-viewCache=false を開き、
Press Me ボタン → ダイアログが表示されれば OK。

Network タブで `/resources/com/myorg/reuselib/library.js` が 200 で返ることを確認。

### 本番デプロイ

```bash
# 1. library をデプロイ (先に必要)
cd com.myorg.reuselib
npm run build:cf && npm run build:mta && npm run deploy

# 2. consumer をデプロイ
cd ../consumerapp
npm run build:cf && npm run build:mta && npm run deploy

# 3. デプロイ状態確認
afctl list
```

`afctl list` の出力に library と consumer の両方が `started` で表示されれば OK。

### Work Zone 統合

1. BTP Cockpit で Trusted Domain を登録 (上記 §6)
2. `afctl stop/start` で consumer を再起動
3. Work Zone Site Manager → Content Manager で URL App を登録
4. Work Zone のサイトから In Place でアプリを開く

## 参考リンク

- [Application Frontend — Reusing Application Resources](https://help.sap.com/docs/APPLICATION_FRONTEND/9affcc2d6aca4f9d9a5414c13e5ea894/5aa6d1d47335413bbe6bef5b723f2c86.html)
- [Application Frontend — Integrating Applications with SAP Build Work Zone](https://help.sap.com/docs/APPLICATION_FRONTEND/9affcc2d6aca4f9d9a5414c13e5ea894/67e307adc0ae48ecbd0c41bd38d19a95.html)
- [Application Frontend — Configure SAP Build Work Zone as a Trusted Domain](https://help.sap.com/docs/APPLICATION_FRONTEND/9affcc2d6aca4f9d9a5414c13e5ea894/0d5deba630e44656b96777e78a010365.html)
- [Application Frontend — Security Best Practices](https://help.sap.com/docs/APPLICATION_FRONTEND/9affcc2d6aca4f9d9a5414c13e5ea894/a435753a53524c8d942f4e03d6bc1646.html)
- [Application Frontend — xs-app.json Configuration](https://help.sap.com/docs/APPLICATION_FRONTEND/9affcc2d6aca4f9d9a5414c13e5ea894/561b140cd1054fe5827d666f08677de1.html)
