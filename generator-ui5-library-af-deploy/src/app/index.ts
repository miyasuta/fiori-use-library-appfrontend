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
        this.fs.copyTpl(
            this.templatePath("xs-security.json.ejs"),
            this.destinationPath("xs-security.json"),
            { ...this.ctx }
        );
    }
}
