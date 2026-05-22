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
