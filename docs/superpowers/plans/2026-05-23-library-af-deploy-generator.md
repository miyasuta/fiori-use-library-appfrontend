# Library AF Deploy Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a Yeoman generator `generator-ui5-library-af-deploy` that adds Application Frontend deployment configuration to a UI5 library project, with the integration test verifying its output matches the manually-constructed reference on `main`.

**Architecture:** Yeoman v7 generator written in TypeScript. Generator detects library namespace from `src/**/library.{ts,js}`, reads `ui5.yaml` for framework version and libraries, then writes 4 deploy config files via EJS templates plus updates `package.json` via `extendJSON`. Tests use `node --test` with `yeoman-test` helpers; integration test compares output against the `main` branch via `git show`.

**Tech Stack:** TypeScript 5.9+, Node.js 22+, Yeoman v7 (`yeoman-generator`, `yeoman-test`), `js-yaml`, `glob`, `mem-fs-editor` (bundled with Yeoman), `node:test` runner.

**Spec:** [docs/superpowers/specs/2026-05-23-library-af-deploy-generator-design.md](../specs/2026-05-23-library-af-deploy-generator-design.md)

---

## Task 1: Scaffold the generator package

**Files:**
- Create: `generator-ui5-library-af-deploy/package.json`
- Create: `generator-ui5-library-af-deploy/tsconfig.json`
- Create: `generator-ui5-library-af-deploy/.gitignore`
- Create: `generator-ui5-library-af-deploy/README.md`
- Create: `generator-ui5-library-af-deploy/src/app/index.ts` (placeholder)

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p generator-ui5-library-af-deploy/src/app/templates
mkdir -p generator-ui5-library-af-deploy/test/fixtures
mkdir -p generator-ui5-library-af-deploy/test/snapshots
cd generator-ui5-library-af-deploy
```

- [ ] **Step 2: Write `package.json`**

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

- [ ] **Step 3: Write `tsconfig.json`**

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

- [ ] **Step 4: Write `.gitignore`**

```
node_modules/
dist/
*.log
```

- [ ] **Step 5: Write `README.md`**

```markdown
# generator-ui5-library-af-deploy

Yeoman generator that adds SAP BTP Application Frontend deployment configuration to a UI5 library project.

## Usage

```bash
cd path/to/your-library
npm install -g yo generator-ui5-library-af-deploy
yo ui5-library-af-deploy
```

The generator reads `ui5.yaml` and the `src/` directory structure, then creates `mta.yaml`, `ui5-deploy.yaml`, `xs-app.json`, `xs-security.json`, and updates `package.json`.

## Requirements

- UI5 library project (`type: library` in `ui5.yaml`)
- A `src/<namespace-path>/library.{ts,js}` entry point
- `framework.version` and `framework.libraries` set in `ui5.yaml`

## Design

See [docs/superpowers/specs/2026-05-23-library-af-deploy-generator-design.md](../docs/superpowers/specs/2026-05-23-library-af-deploy-generator-design.md).
```

- [ ] **Step 6: Write `src/app/index.ts` placeholder**

```typescript
import Generator from "yeoman-generator";

export default class extends Generator {}
```

- [ ] **Step 7: Install dependencies**

Run: `npm install`
Expected: completes without errors (warnings OK).

- [ ] **Step 8: Verify build passes**

Run: `npm run build`
Expected: `dist/app/index.js` exists, no tsc errors.

- [ ] **Step 9: Commit**

```bash
cd ..
git add generator-ui5-library-af-deploy/
git commit -m "Scaffold generator-ui5-library-af-deploy package"
```

---

## Task 2: Create test fixtures

**Files:**
- Create: `generator-ui5-library-af-deploy/test/fixtures/library-namespace-form/ui5.yaml`
- Create: `generator-ui5-library-af-deploy/test/fixtures/library-namespace-form/package.json`
- Create: `generator-ui5-library-af-deploy/test/fixtures/library-namespace-form/src/com/myorg/reuselib/library.ts`
- Create: `generator-ui5-library-af-deploy/test/fixtures/library-not-namespace-form/ui5.yaml`
- Create: `generator-ui5-library-af-deploy/test/fixtures/library-not-namespace-form/package.json`
- Create: `generator-ui5-library-af-deploy/test/fixtures/library-not-namespace-form/src/com/myorg/reuselib/library.ts`

These are the minimum inputs needed to exercise the generator in unit tests.

- [ ] **Step 1: Write `fixtures/library-namespace-form/ui5.yaml`** (namespace already in dotted form, no prompt expected)

```yaml
specVersion: '2.2'
metadata:
  name: com.myorg.reuselib
type: library
framework:
  name: SAPUI5
  version: 1.146.0
  libraries:
    - name: sap.ui.core
    - name: themelib_sap_fiori_3
```

- [ ] **Step 2: Write `fixtures/library-namespace-form/package.json`**

```json
{
  "name": "reuselib",
  "version": "1.0.0",
  "devDependencies": {
    "@ui5/cli": "^4.0.33",
    "typescript": "^5.9.3"
  },
  "scripts": {
    "build": "ui5 build --config=ui5.yaml --clean-dest --dest dist"
  }
}
```

- [ ] **Step 3: Write `fixtures/library-namespace-form/src/com/myorg/reuselib/library.ts`** (marker file for namespace detection)

```typescript
// Library entry point — content unimportant for tests, only the file path matters.
export default {};
```

- [ ] **Step 4: Write `fixtures/library-not-namespace-form/ui5.yaml`** (short name, prompt expected)

```yaml
specVersion: '2.2'
metadata:
  name: "reuselib"
type: library
framework:
  name: SAPUI5
  version: 1.146.0
  libraries:
    - name: sap.ui.core
    - name: themelib_sap_fiori_3
```

- [ ] **Step 5: Write `fixtures/library-not-namespace-form/package.json`** (same as Step 2)

```json
{
  "name": "reuselib",
  "version": "1.0.0",
  "devDependencies": {
    "@ui5/cli": "^4.0.33",
    "typescript": "^5.9.3"
  },
  "scripts": {
    "build": "ui5 build --config=ui5.yaml --clean-dest --dest dist"
  }
}
```

- [ ] **Step 6: Write `fixtures/library-not-namespace-form/src/com/myorg/reuselib/library.ts`** (same content as Step 3)

```typescript
export default {};
```

- [ ] **Step 7: Commit**

```bash
git add generator-ui5-library-af-deploy/test/fixtures/
git commit -m "Add test fixtures for namespace-form and short-name libraries"
```

---

## Task 3: Implement `detectNamespaceFromSrc` (TDD)

**Files:**
- Create: `generator-ui5-library-af-deploy/test/unit.test.ts`
- Create: `generator-ui5-library-af-deploy/src/app/detect.ts`

- [ ] **Step 1: Write the failing test**

In `test/unit.test.ts`:

```typescript
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { detect } from "../dist/app/detect.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = (name: string) => join(__dirname, "fixtures", name);

describe("detect()", () => {
    it("derives namespace from src/<path>/library.ts directory structure", async () => {
        const result = await detect(fixtureDir("library-namespace-form"));
        assert.equal(result.context.libraryNamespace, "com.myorg.reuselib");
        assert.equal(result.context.archiveName, "commyorgreuselib");
    });
});
```

- [ ] **Step 2: Run the test, expect failure**

Run: `cd generator-ui5-library-af-deploy && npm test 2>&1 | tail -20`
Expected: FAIL — `Cannot find module '../dist/app/detect.js'` or similar.

- [ ] **Step 3: Implement minimal `detect.ts`**

In `src/app/detect.ts`:

```typescript
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { load as parseYaml } from "js-yaml";
import { glob } from "glob";

interface Ui5Yaml {
    metadata?: { name?: string };
    framework?: {
        version?: string;
        libraries?: Array<{ name: string }>;
    };
}

export interface Context {
    libraryNamespace: string;
    archiveName: string;
    sapui5Version: string;
    frameworkLibraries: string[];
}

export interface DetectResult {
    context: Context;
    needsUi5YamlUpdate: boolean;
    currentMetadataName: string;
}

export async function detect(projectRoot: string): Promise<DetectResult> {
    const raw = await readFile(join(projectRoot, "ui5.yaml"), "utf8");
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

- [ ] **Step 4: Run the test, expect pass**

Run: `npm test 2>&1 | tail -20`
Expected: PASS — `# pass 1`.

- [ ] **Step 5: Commit**

```bash
cd ..
git add generator-ui5-library-af-deploy/
git commit -m "Implement namespace detection from src/ directory structure"
```

---

## Task 4: Extend `detect()` test coverage

**Files:**
- Modify: `generator-ui5-library-af-deploy/test/unit.test.ts`

- [ ] **Step 1: Add tests for framework metadata and namespace-update flag**

Add these inside the `describe("detect()", ...)` block, after the existing test:

```typescript
    it("extracts framework version and libraries from ui5.yaml", async () => {
        const result = await detect(fixtureDir("library-namespace-form"));
        assert.equal(result.context.sapui5Version, "1.146.0");
        assert.deepEqual(result.context.frameworkLibraries, [
            "sap.ui.core",
            "themelib_sap_fiori_3",
        ]);
    });

    it("does not flag ui5.yaml update when metadata.name matches src/", async () => {
        const result = await detect(fixtureDir("library-namespace-form"));
        assert.equal(result.needsUi5YamlUpdate, false);
        assert.equal(result.currentMetadataName, "com.myorg.reuselib");
    });

    it("flags ui5.yaml update when metadata.name is short form", async () => {
        const result = await detect(fixtureDir("library-not-namespace-form"));
        assert.equal(result.needsUi5YamlUpdate, true);
        assert.equal(result.currentMetadataName, "reuselib");
        assert.equal(result.context.libraryNamespace, "com.myorg.reuselib");
    });
```

- [ ] **Step 2: Run the tests, expect all pass**

Run: `cd generator-ui5-library-af-deploy && npm test 2>&1 | tail -20`
Expected: PASS — `# pass 4`. All tests pass because `detect.ts` already implements the full logic.

- [ ] **Step 3: Commit**

```bash
cd ..
git add generator-ui5-library-af-deploy/test/unit.test.ts
git commit -m "Add tests for framework metadata extraction and namespace-update flag"
```

---

## Task 5: Add `xs-app.json` template and generator writing phase

**Files:**
- Create: `generator-ui5-library-af-deploy/src/app/templates/xs-app.json`
- Modify: `generator-ui5-library-af-deploy/src/app/index.ts`
- Modify: `generator-ui5-library-af-deploy/test/unit.test.ts`

- [ ] **Step 1: Create the static `xs-app.json` template**

In `src/app/templates/xs-app.json` (no EJS — same for every library):

```json
{
  "welcomeFile": "/index.html",
  "authenticationMethod": "route",
  "routes": [
    {
      "source": "^/resources/(.*)$",
      "target": "/resources/$1",
      "authenticationType": "none",
      "destination": "ui5"
    },
    {
      "source": "^/test-resources/(.*)$",
      "target": "/test-resources/$1",
      "authenticationType": "none",
      "destination": "ui5"
    },
    {
      "source": "^/logout-page.html$",
      "service": "app-front",
      "authenticationType": "none"
    },
    {
      "source": "^(.*)$",
      "target": "$1",
      "service": "app-front",
      "authenticationType": "ias"
    }
  ]
}
```

- [ ] **Step 2: Write the failing test**

Add this new describe block at the bottom of `test/unit.test.ts`:

```typescript
import helpers from "yeoman-test";
import { readFile, cp, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";

describe("generator output", () => {
    async function runGeneratorOn(fixtureName: string): Promise<string> {
        const tmp = await mkdtemp(join(tmpdir(), "lib-af-deploy-"));
        await cp(fixtureDir(fixtureName), tmp, { recursive: true });
        await helpers
            .run(join(__dirname, "../dist/app"))
            .cd(tmp)
            .withAnswers({ updateNamespace: true });
        return tmp;
    }

    it("writes xs-app.json matching the template", async () => {
        const out = await runGeneratorOn("library-namespace-form");
        const actual = await readFile(join(out, "xs-app.json"), "utf8");
        const expected = await readFile(
            join(__dirname, "../src/app/templates/xs-app.json"),
            "utf8"
        );
        assert.equal(actual, expected);
    });
});
```

- [ ] **Step 3: Run the test, expect failure**

Run: `cd generator-ui5-library-af-deploy && npm test 2>&1 | tail -30`
Expected: FAIL — `xs-app.json` not created (the placeholder generator does nothing).

- [ ] **Step 4: Implement the generator skeleton + xs-app.json writing**

Replace `src/app/index.ts` with:

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

    writing(): void {
        this.fs.copy(
            this.templatePath("xs-app.json"),
            this.destinationPath("xs-app.json")
        );
    }
}
```

- [ ] **Step 5: Run the test, expect pass**

Run: `npm test 2>&1 | tail -20`
Expected: PASS — `# pass 5`.

- [ ] **Step 6: Commit**

```bash
cd ..
git add generator-ui5-library-af-deploy/
git commit -m "Add xs-app.json template and generator writing phase"
```

---

## Task 6: Add `xs-security.json.ejs` template

**Files:**
- Create: `generator-ui5-library-af-deploy/src/app/templates/xs-security.json.ejs`
- Modify: `generator-ui5-library-af-deploy/src/app/index.ts`
- Modify: `generator-ui5-library-af-deploy/test/unit.test.ts`

- [ ] **Step 1: Create the EJS template**

In `src/app/templates/xs-security.json.ejs`:

```
{
  "xsappname": "<%= archiveName %>",
  "tenant-mode": "dedicated",
  "description": "Security profile of called application",
  "scopes": [],
  "role-templates": []
}
```

- [ ] **Step 2: Write the failing test**

Add inside `describe("generator output", ...)` after the xs-app.json test:

```typescript
    it("writes xs-security.json with xsappname derived from namespace", async () => {
        const out = await runGeneratorOn("library-namespace-form");
        const actual = JSON.parse(await readFile(join(out, "xs-security.json"), "utf8"));
        assert.equal(actual.xsappname, "commyorgreuselib");
        assert.equal(actual["tenant-mode"], "dedicated");
        assert.deepEqual(actual.scopes, []);
        assert.deepEqual(actual["role-templates"], []);
    });
```

- [ ] **Step 3: Run the test, expect failure**

Run: `npm test 2>&1 | tail -20`
Expected: FAIL — file not created.

- [ ] **Step 4: Extend `writing()`**

In `src/app/index.ts`, replace the `writing()` body:

```typescript
    writing(): void {
        this.fs.copy(
            this.templatePath("xs-app.json"),
            this.destinationPath("xs-app.json")
        );
        this.fs.copyTpl(
            this.templatePath("xs-security.json.ejs"),
            this.destinationPath("xs-security.json"),
            { ...this.ctx }
        );
    }
```

- [ ] **Step 5: Run the test, expect pass**

Run: `npm test 2>&1 | tail -20`
Expected: PASS — `# pass 6`.

- [ ] **Step 6: Commit**

```bash
cd ..
git add generator-ui5-library-af-deploy/
git commit -m "Add xs-security.json template"
```

---

## Task 7: Add `ui5-deploy.yaml.ejs` template

**Files:**
- Create: `generator-ui5-library-af-deploy/src/app/templates/ui5-deploy.yaml.ejs`
- Modify: `generator-ui5-library-af-deploy/src/app/index.ts`
- Modify: `generator-ui5-library-af-deploy/test/unit.test.ts`

- [ ] **Step 1: Create the EJS template**

In `src/app/templates/ui5-deploy.yaml.ejs`:

```
# yaml-language-server: $schema=https://sap.github.io/ui5-tooling/schema/ui5.yaml.json

specVersion: "4.0"
metadata:
  name: <%= libraryNamespace %>
type: library
framework:
  name: SAPUI5
  version: <%= sapui5Version %>
  libraries:
<% frameworkLibraries.forEach(function(lib) { -%>
    - name: <%= lib %>
<% }); -%>
builder:
  customTasks:
    - name: ui5-tooling-transpile-task
      afterTask: replaceVersion
      configuration:
        debug: true
        transformModulesToUI5:
          overridesToOverride: true
    - name: ui5-task-zipper
      afterTask: buildThemes # For libraries, generateCachebusterInfo is not executed
      configuration:
        archiveName: <%= archiveName %>
        relativePaths: true
        additionalFiles:
          - xs-app.json
  resources:
    excludes:
      - /test/**
      - /localService/**
resources:
  configuration:
    propertiesFileSourceEncoding: UTF-8
```

- [ ] **Step 2: Write the failing test**

Add inside `describe("generator output", ...)`:

```typescript
    it("writes ui5-deploy.yaml with namespace, version, libraries, and archiveName", async () => {
        const out = await runGeneratorOn("library-namespace-form");
        const actual = await readFile(join(out, "ui5-deploy.yaml"), "utf8");
        assert.match(actual, /metadata:\s*\n\s*name: com\.myorg\.reuselib/);
        assert.match(actual, /version: 1\.146\.0/);
        assert.match(actual, /- name: sap\.ui\.core/);
        assert.match(actual, /- name: themelib_sap_fiori_3/);
        assert.match(actual, /archiveName: commyorgreuselib/);
        assert.match(actual, /afterTask: buildThemes/);
    });
```

- [ ] **Step 3: Run the test, expect failure**

Run: `npm test 2>&1 | tail -20`
Expected: FAIL — file not created.

- [ ] **Step 4: Extend `writing()`**

Add to the `writing()` method (between xs-app.json and xs-security.json calls):

```typescript
        this.fs.copyTpl(
            this.templatePath("ui5-deploy.yaml.ejs"),
            this.destinationPath("ui5-deploy.yaml"),
            { ...this.ctx }
        );
```

- [ ] **Step 5: Run the test, expect pass**

Run: `npm test 2>&1 | tail -20`
Expected: PASS — `# pass 7`.

- [ ] **Step 6: Commit**

```bash
cd ..
git add generator-ui5-library-af-deploy/
git commit -m "Add ui5-deploy.yaml template"
```

---

## Task 8: Add `mta.yaml.ejs` template

**Files:**
- Create: `generator-ui5-library-af-deploy/src/app/templates/mta.yaml.ejs`
- Modify: `generator-ui5-library-af-deploy/src/app/index.ts`
- Modify: `generator-ui5-library-af-deploy/test/unit.test.ts`

- [ ] **Step 1: Create the EJS template**

In `src/app/templates/mta.yaml.ejs`:

```
_schema-version: "3.2"
ID: <%= archiveName %>
description: Generated by Fiori Tools
version: 0.0.1
modules:
- name: <%= archiveName %>-app-content
  type: com.sap.application.content
  path: .
  requires:
  - name: <%= archiveName %>-app-front
    parameters:
      content-target: true
  - name: <%= archiveName %>-uaa
  parameters:
    config:
      destinations:
      - name: ui5
        url: https://ui5.sap.com
  build-parameters:
    build-result: resources
    requires:
    - artifacts:
      - <%= archiveName %>.zip
      name: <%= archiveName %>
      target-path: resources/
- name: <%= archiveName %>
  type: html5
  path: .
  build-parameters:
    build-result: dist
    builder: custom
    commands:
    - npm install
    - npm run build:cf
    supported-platforms: []
resources:
- name: <%= archiveName %>-uaa
  type: org.cloudfoundry.managed-service
  parameters:
    path: ./xs-security.json
    service: xsuaa
    service-name: <%= archiveName %>-xsuaa-service
    service-plan: application
- name: <%= archiveName %>-app-front
  type: org.cloudfoundry.managed-service
  parameters:
    service: app-front
    service-name: <%= archiveName %>-app-front-service
    service-plan: developer
parameters:
  deploy_mode: html5-repo
  enable-parallel-deployments: true
```

- [ ] **Step 2: Write the failing test**

Add inside `describe("generator output", ...)`:

```typescript
    it("writes mta.yaml with archiveName substituted in IDs and resource names", async () => {
        const out = await runGeneratorOn("library-namespace-form");
        const actual = await readFile(join(out, "mta.yaml"), "utf8");
        assert.match(actual, /^ID: commyorgreuselib/m);
        assert.match(actual, /- commyorgreuselib\.zip/);
        assert.match(actual, /service-name: commyorgreuselib-xsuaa-service/);
        assert.match(actual, /service-name: commyorgreuselib-app-front-service/);
        assert.doesNotMatch(actual, /miyasutaconsumerapp/);
    });
```

- [ ] **Step 3: Run the test, expect failure**

Run: `npm test 2>&1 | tail -20`
Expected: FAIL — file not created.

- [ ] **Step 4: Extend `writing()`**

Add to the `writing()` method:

```typescript
        this.fs.copyTpl(
            this.templatePath("mta.yaml.ejs"),
            this.destinationPath("mta.yaml"),
            { ...this.ctx }
        );
```

- [ ] **Step 5: Run the test, expect pass**

Run: `npm test 2>&1 | tail -20`
Expected: PASS — `# pass 8`.

- [ ] **Step 6: Commit**

```bash
cd ..
git add generator-ui5-library-af-deploy/
git commit -m "Add mta.yaml template"
```

---

## Task 9: Implement `prompting` phase for namespace confirmation

**Files:**
- Modify: `generator-ui5-library-af-deploy/src/app/index.ts`
- Modify: `generator-ui5-library-af-deploy/test/unit.test.ts`

- [ ] **Step 1: Write the failing test**

Add inside `describe("generator output", ...)`:

```typescript
    it("rewrites ui5.yaml metadata.name when the user confirms the prompt", async () => {
        const out = await runGeneratorOn("library-not-namespace-form");
        const yaml = await readFile(join(out, "ui5.yaml"), "utf8");
        assert.match(yaml, /name: com\.myorg\.reuselib/);
        assert.doesNotMatch(yaml, /name: "reuselib"/);
        assert.doesNotMatch(yaml, /name: reuselib\s*$/m);
    });

    it("aborts when the user rejects the namespace prompt", async () => {
        const tmp = await mkdtemp(join(tmpdir(), "lib-af-deploy-abort-"));
        await cp(fixtureDir("library-not-namespace-form"), tmp, { recursive: true });
        await assert.rejects(
            helpers
                .run(join(__dirname, "../dist/app"))
                .cd(tmp)
                .withAnswers({ updateNamespace: false }),
            /Aborted: metadata\.name must match/
        );
    });
```

- [ ] **Step 2: Run the tests, expect failure**

Run: `npm test 2>&1 | tail -30`
Expected: FAIL — `ui5.yaml` not modified, abort case does not reject.

- [ ] **Step 3: Implement `prompting()` and `updateUi5YamlMetadataName()`**

Replace `src/app/index.ts` with:

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
        this.fs.copy(
            this.templatePath("xs-app.json"),
            this.destinationPath("xs-app.json")
        );
        this.fs.copyTpl(
            this.templatePath("xs-security.json.ejs"),
            this.destinationPath("xs-security.json"),
            { ...this.ctx }
        );
        this.fs.copyTpl(
            this.templatePath("ui5-deploy.yaml.ejs"),
            this.destinationPath("ui5-deploy.yaml"),
            { ...this.ctx }
        );
        this.fs.copyTpl(
            this.templatePath("mta.yaml.ejs"),
            this.destinationPath("mta.yaml"),
            { ...this.ctx }
        );

        if (this.needsUi5YamlUpdate) {
            this.updateUi5YamlMetadataName();
        }
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

- [ ] **Step 4: Run the tests, expect pass**

Run: `npm test 2>&1 | tail -20`
Expected: PASS — `# pass 10`.

- [ ] **Step 5: Commit**

```bash
cd ..
git add generator-ui5-library-af-deploy/
git commit -m "Add prompting phase and ui5.yaml metadata.name update"
```

---

## Task 10: Update `package.json` via `extendJSON`

**Files:**
- Modify: `generator-ui5-library-af-deploy/src/app/index.ts`
- Modify: `generator-ui5-library-af-deploy/test/unit.test.ts`

- [ ] **Step 1: Write the failing test**

Add inside `describe("generator output", ...)`:

```typescript
    it("adds build:cf, build:mta, deploy scripts and devDependencies to package.json", async () => {
        const out = await runGeneratorOn("library-namespace-form");
        const pkg = JSON.parse(await readFile(join(out, "package.json"), "utf8"));

        assert.equal(pkg.scripts["build:cf"], "ui5 build --clean-dest --config ui5-deploy.yaml --dest dist");
        assert.equal(pkg.scripts["build:mta"], "rimraf resources mta_archives && mbt build");
        assert.equal(pkg.scripts.deploy, "fiori cfDeploy");

        assert.equal(pkg.devDependencies["ui5-task-zipper"], "^3.6.0");
        assert.equal(pkg.devDependencies.mbt, "^1.2.49");
        assert.equal(pkg.devDependencies.rimraf, "^6.1.3");

        // Existing keys preserved
        assert.equal(pkg.scripts.build, "ui5 build --config=ui5.yaml --clean-dest --dest dist");
        assert.equal(pkg.devDependencies["@ui5/cli"], "^4.0.33");
    });
```

- [ ] **Step 2: Run the test, expect failure**

Run: `npm test 2>&1 | tail -20`
Expected: FAIL — added keys not present.

- [ ] **Step 3: Extend `writing()` to update `package.json`**

In `src/app/index.ts`, append this to the end of `writing()`:

```typescript
        this.fs.extendJSON(this.destinationPath("package.json"), {
            scripts: {
                "build:cf": "ui5 build --clean-dest --config ui5-deploy.yaml --dest dist",
                "build:mta": "rimraf resources mta_archives && mbt build",
                deploy: "fiori cfDeploy",
            },
            devDependencies: {
                "ui5-task-zipper": "^3.6.0",
                mbt: "^1.2.49",
                rimraf: "^6.1.3",
            },
        });
```

- [ ] **Step 4: Run the test, expect pass**

Run: `npm test 2>&1 | tail -20`
Expected: PASS — `# pass 11`.

- [ ] **Step 5: Commit**

```bash
cd ..
git add generator-ui5-library-af-deploy/
git commit -m "Add package.json scripts and devDependencies extension"
```

---

## Task 11: Add integration test (branch diff verification)

**Files:**
- Create: `generator-ui5-library-af-deploy/test/integration.test.ts`

- [ ] **Step 1: Write the integration test**

In `test/integration.test.ts`:

```typescript
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import helpers from "yeoman-test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const libraryDir = "com.myorg.reuselib";

function gitShow(ref: string, path: string): string {
    return execFileSync("git", ["show", `${ref}:${path}`], { cwd: repoRoot }).toString();
}

describe("generator output matches main branch (integration)", () => {
    let outDir: string;

    before(async () => {
        outDir = await mkdtemp(join(tmpdir(), "lib-af-deploy-int-"));

        // Materialize library-pre-deploy-config:com.myorg.reuselib/ into outDir
        execFileSync(
            "bash",
            ["-c", `git archive library-pre-deploy-config ${libraryDir} | tar -x -C "${outDir}"`],
            { cwd: repoRoot }
        );

        await helpers
            .run(join(__dirname, "../dist/app"))
            .cd(join(outDir, libraryDir))
            .withAnswers({ updateNamespace: true });
    });

    for (const file of [
        "mta.yaml",
        "ui5-deploy.yaml",
        "xs-app.json",
        "xs-security.json",
        "ui5.yaml",
    ]) {
        it(`${file} matches main:${libraryDir}/${file}`, async () => {
            const actual = await readFile(join(outDir, libraryDir, file), "utf8");
            const expected = gitShow("main", `${libraryDir}/${file}`);
            assert.equal(actual, expected);
        });
    }

    it("package.json scripts and devDependencies match main", async () => {
        const actual = JSON.parse(
            await readFile(join(outDir, libraryDir, "package.json"), "utf8")
        );
        const expected = JSON.parse(gitShow("main", `${libraryDir}/package.json`));

        for (const key of ["build:cf", "build:mta", "deploy"]) {
            assert.equal(actual.scripts[key], expected.scripts[key], `scripts.${key}`);
        }
        for (const dep of ["ui5-task-zipper", "mbt", "rimraf"]) {
            assert.equal(
                actual.devDependencies[dep],
                expected.devDependencies[dep],
                `devDependencies.${dep}`
            );
        }
    });
});
```

- [ ] **Step 2: Run the integration test, expect pass**

Run: `cd generator-ui5-library-af-deploy && npm run test:integration 2>&1 | tail -30`
Expected: PASS — all file comparisons match between generator output and `main`.

If any test fails, the corresponding template needs adjustment. Common causes:
- Trailing newline mismatch in template files
- EJS whitespace control (`-%>` vs `%>`) producing extra blank lines
- Missing or extra fields in generated YAML/JSON

Fix the templates to match `main` exactly, then re-run.

- [ ] **Step 3: Commit**

```bash
cd ..
git add generator-ui5-library-af-deploy/test/integration.test.ts
git commit -m "Add integration test verifying generator output matches main branch"
```

---

## Task 12: Manual end-to-end verification with `git worktree`

This task confirms the generator works when invoked via `yo` from the command line, not just through `yeoman-test`.

**Files:** None modified — verification only.

- [ ] **Step 1: Create a worktree of `library-pre-deploy-config`**

Run from repo root:

```bash
git worktree add ../fiori-test-pre-deploy library-pre-deploy-config
```

Expected: `../fiori-test-pre-deploy/` exists with the pre-deploy library state.

- [ ] **Step 2: Build and link the generator globally**

```bash
cd generator-ui5-library-af-deploy
npm run build
npm link
```

Expected: `npm link` reports the package was linked into the global node_modules.

- [ ] **Step 3: Install `yo` globally (skip if already installed)**

```bash
which yo || npm install -g yo
```

- [ ] **Step 4: Run the generator on the worktree**

```bash
cd ../../fiori-test-pre-deploy/com.myorg.reuselib
yo ui5-library-af-deploy
```

When prompted "ui5.yaml metadata.name is 'reuselib'. Update it to 'com.myorg.reuselib' (detected from src/ structure)?", answer **Yes**.

Expected files created/modified:
- `mta.yaml` (new)
- `ui5-deploy.yaml` (new)
- `xs-app.json` (new)
- `xs-security.json` (new)
- `ui5.yaml` (modified)
- `package.json` (modified)

- [ ] **Step 5: Verify the result matches `main` exactly**

```bash
git diff main -- .
```

Expected: empty output (or only whitespace-level diffs that are not meaningful). Any non-trivial diff indicates the generator produced something different from the manual reference.

If diffs exist, document them, fix the template, rebuild, reset the worktree (`git restore . && git clean -fd`), and re-run from Step 4.

- [ ] **Step 6: Clean up the worktree (optional)**

```bash
cd ../..
git worktree remove ../fiori-test-pre-deploy
```

- [ ] **Step 7: Mark verification complete**

No commit needed — this task is a verification gate. If everything passes, the generator is ready to use.

---

## Task 13: Final cleanup and documentation

**Files:**
- Modify: `generator-ui5-library-af-deploy/README.md`
- Modify: `docs/project/library-deployment-generator-idea.md` (link the realized generator)

- [ ] **Step 1: Expand `README.md` with verified usage instructions**

Replace the placeholder content with:

```markdown
# generator-ui5-library-af-deploy

Yeoman generator that adds SAP BTP Application Frontend deployment configuration to a UI5 library project.

## Installation

```bash
npm install -g yo generator-ui5-library-af-deploy
```

## Usage

```bash
cd path/to/your-ui5-library
yo ui5-library-af-deploy
```

## What it does

The generator reads `ui5.yaml` and the `src/` directory structure of the current project, then:

1. Detects the library namespace from `src/<path>/library.{ts,js}`.
2. If `metadata.name` in `ui5.yaml` does not match the detected namespace, prompts to update it.
3. Creates the following deploy configuration files:
   - `mta.yaml` — MTA module + resources for Application Frontend + XSUAA
   - `ui5-deploy.yaml` — UI5 build config with `ui5-task-zipper` configured for library builds
   - `xs-app.json` — Routing config with `app-front` service and IAS authentication
   - `xs-security.json` — XSUAA `xsappname` (matches the archive name)
4. Updates `package.json`:
   - Adds `build:cf`, `build:mta`, `deploy` scripts
   - Adds `ui5-task-zipper`, `mbt`, `rimraf` to `devDependencies`

## Requirements

- UI5 library project (`type: library` in `ui5.yaml`)
- A single `src/<namespace-path>/library.{ts,js}` entry point
- `framework.version` and `framework.libraries` set in `ui5.yaml`

## After running

```bash
npm install
npm run build:cf
npm run build:mta
npm run deploy
```

## Limitations (MVP)

- Targets Application Frontend service only (not the classic HTML5 App Repo)
- Authentication type is fixed to `ias`
- Always creates new `app-front` and XSUAA service instances (no reuse of existing ones)

## Design

See [docs/superpowers/specs/2026-05-23-library-af-deploy-generator-design.md](../docs/superpowers/specs/2026-05-23-library-af-deploy-generator-design.md).
```

- [ ] **Step 2: Update the original idea document**

In `docs/project/library-deployment-generator-idea.md`, add a note at the top after the opening paragraph:

```markdown
> **Status update (2026-05-23):** Implemented as `generator-ui5-library-af-deploy/` in this
> repository. See [docs/superpowers/specs/2026-05-23-library-af-deploy-generator-design.md](../superpowers/specs/2026-05-23-library-af-deploy-generator-design.md)
> for the realized design.
```

- [ ] **Step 3: Run the full test suite one more time**

```bash
cd generator-ui5-library-af-deploy && npm test 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
cd ..
git add generator-ui5-library-af-deploy/README.md docs/project/library-deployment-generator-idea.md
git commit -m "Document generator usage and link from idea doc"
```

---

## Summary checklist

- [ ] Task 1 — Scaffold the generator package
- [ ] Task 2 — Create test fixtures
- [ ] Task 3 — Implement `detectNamespaceFromSrc` (TDD)
- [ ] Task 4 — Extend `detect()` test coverage
- [ ] Task 5 — Add `xs-app.json` template and generator writing phase
- [ ] Task 6 — Add `xs-security.json.ejs` template
- [ ] Task 7 — Add `ui5-deploy.yaml.ejs` template
- [ ] Task 8 — Add `mta.yaml.ejs` template
- [ ] Task 9 — Implement `prompting` phase for namespace confirmation
- [ ] Task 10 — Update `package.json` via `extendJSON`
- [ ] Task 11 — Add integration test (branch diff verification)
- [ ] Task 12 — Manual end-to-end verification with `git worktree`
- [ ] Task 13 — Final cleanup and documentation
