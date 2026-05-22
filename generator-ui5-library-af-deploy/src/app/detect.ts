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
