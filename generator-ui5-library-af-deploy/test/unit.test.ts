import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtemp, cp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import helpers from "yeoman-test";
import { detect } from "../dist/app/detect.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = (name: string) => join(__dirname, "fixtures", name);

describe("detect()", () => {
    it("derives namespace from src/<path>/library.ts directory structure", async () => {
        const result = await detect(fixtureDir("library-namespace-form"));
        assert.equal(result.context.libraryNamespace, "com.myorg.reuselib");
        assert.equal(result.context.archiveName, "commyorgreuselib");
    });

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
});

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

    it("writes xs-security.json with xsappname derived from namespace", async () => {
        const out = await runGeneratorOn("library-namespace-form");
        const actual = JSON.parse(await readFile(join(out, "xs-security.json"), "utf8"));
        assert.equal(actual.xsappname, "commyorgreuselib");
        assert.equal(actual["tenant-mode"], "dedicated");
        assert.deepEqual(actual.scopes, []);
        assert.deepEqual(actual["role-templates"], []);
    });

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

    it("writes mta.yaml with archiveName substituted in IDs and resource names", async () => {
        const out = await runGeneratorOn("library-namespace-form");
        const actual = await readFile(join(out, "mta.yaml"), "utf8");
        assert.match(actual, /^ID: commyorgreuselib/m);
        assert.match(actual, /- commyorgreuselib\.zip/);
        assert.match(actual, /service-name: commyorgreuselib-xsuaa-service/);
        assert.match(actual, /service-name: commyorgreuselib-app-front-service/);
        assert.doesNotMatch(actual, /miyasutaconsumerapp/);
    });

    it("rewrites ui5.yaml metadata.name when the user confirms the prompt", async () => {
        const out = await runGeneratorOn("library-not-namespace-form");
        const yaml = await readFile(join(out, "ui5.yaml"), "utf8");
        assert.match(yaml, /name: com\.myorg\.reuselib/);
        assert.doesNotMatch(yaml, /name: "reuselib"/);
        assert.doesNotMatch(yaml, /name: reuselib\s*$/m);
    });

    it("does not write deploy files when the user rejects the namespace prompt", async () => {
        const tmp = await mkdtemp(join(tmpdir(), "lib-af-deploy-abort-"));
        await cp(fixtureDir("library-not-namespace-form"), tmp, { recursive: true });
        await helpers
            .run(join(__dirname, "../dist/app"))
            .cd(tmp)
            .withAnswers({ updateNamespace: false });
        for (const file of ["mta.yaml", "ui5-deploy.yaml", "xs-app.json", "xs-security.json"]) {
            await assert.rejects(
                readFile(join(tmp, file), "utf8"),
                /ENOENT/,
                `${file} should not be created when user rejects prompt`,
            );
        }
        const yaml = await readFile(join(tmp, "ui5.yaml"), "utf8");
        assert.match(yaml, /name: "reuselib"/, "ui5.yaml should be untouched");
    });
});
