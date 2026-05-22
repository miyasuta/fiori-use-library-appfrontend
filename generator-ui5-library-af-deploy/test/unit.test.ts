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
