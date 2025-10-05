# External Connectors Pack

A packaging and distribution system for OpenICF-compatible connectors with semantic versioning support.

## Overview

The external-connectors package provides tooling to bundle, version, and deploy connector implementations. Connectors are packaged as self-contained directories with a manifest that defines metadata, entry points, and instance configurations.

## Project Structure

```
external-connectors/
├── dist/                    # Built connector packages
│   └── <connector-name>/    # Individual connector distribution
│       ├── index.js         # Bundled entry point
│       ├── config.js        # Optional configuration module
│       └── manifest.json    # Connector metadata
├── scripts/
│   └── add-connector.mjs    # Packaging script
└── package.json
```

## Adding a Connector

Use the `add-connector` script to package a connector for distribution:

```bash
npm run add-connector -- \
  --src ./path/to/source \
  --name connector-name \
  --type connector-type \
  --version 1.0.0 \
  --entry index.ts \
  --config config.ts \
  --minify true
```

### Required Parameters

- `--src`: Source directory containing connector implementation
- `--name`: Distribution name (alphanumeric, underscores, hyphens only, max 128 chars)
- `--type`: Connector type identifier (alphanumeric, underscores, hyphens only, max 128 chars)
- `--version`: Semantic version (must follow semver specification)
- `--entry`: Entry point file path relative to source directory

### Optional Parameters

- `--config`: Configuration module path relative to source directory
- `--instances`: Path to instances configuration file
- `--minify`: Enable code minification (default: false)

## Manifest Structure

Each packaged connector includes a `manifest.json` file:

```json
{
  "id": "unique-connector-id",
  "type": "connector-type",
  "version": "1.0.0",
  "entry": "./index.js",
  "config": "./config.js",
  "instances": [
    {
      "id": "instance-id",
      "config": {},
      "connectorVersion": "1.0.0"
    }
  ]
}
```

### Manifest Fields

- `id`: Unique identifier for the connector distribution
- `type`: Connector type (e.g., "msgraph", "salesforce")
- `version`: Semantic version of the connector
- `entry`: Relative path to bundled entry module
- `config`: Optional relative path to configuration module
- `instances`: Optional array of pre-configured instances

## Instance Configuration

Instances can be defined in three ways (in priority order):

1. **Manifest instances**: Defined directly in `manifest.json`
2. **Environment variables**: Using `CONNECTOR_INSTANCES` or `CONNECTOR_INSTANCES_<ID>`
3. **Configuration file**: Separate instances configuration file

### Instance Definition

```typescript
{
  "id": "string",              // Unique instance identifier
  "config": {},                // Instance-specific configuration
  "connectorVersion": "1.0.0"  // Optional version override
}
```

## Versioning

Connectors use semantic versioning. The registry supports multiple versions of the same connector type simultaneously.

### Version Management

- Multiple versions can coexist: `msgraph@1.0.0`, `msgraph@2.0.0`
- Instances can specify version overrides using `connectorVersion`
- Version sorting follows semver specification

## Build Process

The `add-connector` script performs the following steps:

1. **Validation**: Validates name, type, version, and file paths
2. **Bundling**: Uses esbuild to bundle entry and config modules
3. **Export Validation**: Verifies entry point exports a factory function
4. **Manifest Generation**: Creates manifest.json with metadata
5. **Output**: Places bundled files in `dist/<connector-name>/`

### Bundle Configuration

- Platform: Node.js (node18+)
- Format: ESM modules
- External dependencies: `@openicf/connector-spi`
- Sourcemaps: Generated
- Minification: Optional

## Configuration Module

Optional configuration modules support two patterns:

### Static Configuration

```javascript
export default {
  apiUrl: "https://api.example.com",
  timeout: 30000
};
```

### Dynamic Configuration Builder

```javascript
export function buildConfiguration(raw) {
  return {
    apiUrl: raw.apiUrl || "https://api.example.com",
    timeout: parseInt(raw.timeout) || 30000
  };
}
```

Configuration modules can export either a plain object or a `buildConfiguration` function that processes raw configuration at runtime.

## Environment Variable Resolution

Configuration values support environment variable substitution. Variables in the format `${VAR_NAME}` are resolved at instance initialization.

## Scripts

- `npm run add-connector`: Package a connector for distribution
- `npm run clean`: Remove all built artifacts from dist/

## Dependencies

- **esbuild**: ^0.25.10 - JavaScript bundler
- **@openicf/connector-spi**: file:../connector-spi - Connector interface definitions

## Requirements

- Node.js 18 or higher
- ESM module support
