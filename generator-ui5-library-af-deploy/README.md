# generator-ui5-library-af-deploy

Yeoman generator that adds SAP BTP Application Frontend deployment configuration to a UI5 library project.

## Usage

```bash
cd path/to/your-library
npm install -g yo generator-ui5-library-af-deploy
yo ui5-library-af-deploy
```

The generator reads `ui5.yaml` and the `src/` directory structure, then creates `mta.yaml`, `ui5-deploy.yaml`, `xs-app.json`, `xs-security.json`, and updates `package.json`.

## Requirements

- UI5 library project (`type: library` in `ui5.yaml`)
- A `src/<namespace-path>/library.{ts,js}` entry point
- `framework.version` and `framework.libraries` set in `ui5.yaml`

## Design

See [docs/superpowers/specs/2026-05-23-library-af-deploy-generator-design.md](../docs/superpowers/specs/2026-05-23-library-af-deploy-generator-design.md).
