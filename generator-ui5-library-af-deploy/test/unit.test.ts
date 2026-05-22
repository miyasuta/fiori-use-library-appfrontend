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
});
