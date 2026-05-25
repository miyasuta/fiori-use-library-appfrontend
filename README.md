# fiori-use-library-appfrontend

Demonstrates UI composition on SAP BTP Application Frontend service: a
consuming Fiori app loads a separately deployed UI5 library at runtime via
`xs-app.json` application routing — no duplicated files, no NPM publish, no
extra network hop.

Implements the **Reusable Component** scenario described in the blog post
[UI Composition with Application Frontend Service](https://community.sap.com/t5/technology-blog-posts-by-sap/ui-composition-with-application-frontend-service/ba-p/14388226).
Companion scenarios (Application Extension, UI Mashup) are described there
but not implemented here.

## Repository layout

| Path | Description |
|---|---|
| [com.myorg.reuselib/](com.myorg.reuselib/) | UI5 reusable library, deployed to Application Frontend |
| [consumerapp/](consumerapp/) | Fiori app that references the library via `application:` route in [xs-app.json](consumerapp/xs-app.json) |
| [generator-ui5-library-af-deploy/](generator-ui5-library-af-deploy/) | Yeoman generator that adds Application Frontend deploy config to any UI5 library project |
| [docs/project/](docs/project/) | Setup notes and gotchas (Japanese) |

## Quick start

```bash
# Library: build and deploy to Application Frontend
cd com.myorg.reuselib
npm install && npm run build:mta && npm run deploy

# Consuming app: run locally, or build & deploy
cd ../consumerapp
npm install
npm start                                    # local preview
npm run build:mta && npm run deploy          # deploy to Cloud Foundry
```

See each sub-project's README / `package.json` scripts for the full set of
commands.
