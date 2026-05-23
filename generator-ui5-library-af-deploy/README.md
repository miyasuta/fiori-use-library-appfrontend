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
