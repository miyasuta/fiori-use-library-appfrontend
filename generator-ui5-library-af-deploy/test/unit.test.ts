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
