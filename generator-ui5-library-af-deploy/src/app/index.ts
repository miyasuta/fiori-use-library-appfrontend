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
            this.log(
                "Aborted: metadata.name must match the src/ directory structure to deploy properly."
            );
            this.cancelCancellableTasks();
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
    }

    private updateUi5YamlMetadataName(): void {
        const path = this.destinationPath("ui5.yaml");
        const content = this.fs.read(path);
        if (!content) {
            throw new Error(`ui5.yaml not found at ${path}`);
        }
        const updated = content.replace(
            /^(\s*name:\s*)["']?[^"'\n]+["']?(\s*$)/m,
            `$1${this.ctx.libraryNamespace}$2`
        );
        this.fs.write(path, updated);
    }
}
