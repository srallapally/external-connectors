#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function prompt(question) {
    return rl.question(question);
}

async function promptMultiple(question, defaultValue = "") {
    const answer = await prompt(`${question} (comma-separated, default: ${defaultValue}): `);
    if (!answer.trim()) return defaultValue.split(",").map(s => s.trim()).filter(Boolean);
    return answer.split(",").map(s => s.trim()).filter(Boolean);
}

async function ensureDir(dir) {
    await fs.mkdir(dir, { recursive: true });
}

async function loadTemplate(templateName) {
    const templatePath = path.join(__dirname, "templates", templateName);
    return await fs.readFile(templatePath, "utf8");
}

function renderTemplate(template, vars) {
    let result = template;
    for (const [key, value] of Object.entries(vars)) {
        const regex = new RegExp(`{{${key}}}`, "g");
        result = result.replace(regex, value);
    }
    return result;
}

async function generateOperationCode(operation, objectClasses) {
    const operation_upper = operation.toUpperCase();
    const templateFile = `operation-${operation.toLowerCase()}.ts.template`;

    try {
        let template = await loadTemplate(templateFile);

        // Generate object class cases
        const objectClassCases = objectClasses.map(oc => {
            const caseTemplate = template.match(/{{#objectClassCase}}([\s\S]*?){{\/objectClassCase}}/)?.[1] || "";
            return renderTemplate(caseTemplate, { objectClass: oc });
        }).join("\n");

        // Remove the loop markers and render the full template
        template = template.replace(/{{#objectClassCase}}[\s\S]*?{{\/objectClassCase}}/, objectClassCases);

        return template;
    } catch (err) {
        console.warn(`Warning: Template ${templateFile} not found, operation ${operation} will not be generated`);
        return "";
    }
}

async function generateIndexTs(connectorName, operations, objectClasses) {
    const operationMethods = [];
    for (const op of operations) {
        const code = await generateOperationCode(op, objectClasses);
        if (code) operationMethods.push(code);
    }

    const operationMethodsStr = operationMethods.join("\n");

    const operationExports = operations.map(op => {
        const opLower = op.toLowerCase();
        return opLower === "delete" ? "delete: del" : opLower;
    }).join(",\n    ");

    const objectClassDefinitions = objectClasses.map(oc => `    oc(
      "${oc}",
      "${oc}",
      [
        attr("id", "string", { readable: true, returnedByDefault: true }),
        attr("name", "string", { readable: true, creatable: true, updateable: true, returnedByDefault: true }),
        // TODO: Add more attributes for ${oc}
      ],
      [${operations.map(op => `"${op.toUpperCase()}"`).join(", ")}]
    )`).join(",\n");

    return `import type {
  ConnectorSpi,
  ConnectorObject,
  AttributeValue,
  OperationOptions,
  Schema,
  ObjectClassInfo,
  SchemaAttribute,
  ResultsHandler,
  SearchResult
} from "../spi/types.js";
import { ${connectorName}Configuration } from "./config.js";

function attr(
  name: string,
  type: "string" | "boolean" | "number" | "binary",
  flags?: Partial<Omit<SchemaAttribute, "name" | "type">>
): SchemaAttribute {
  return { name, type, ...flags };
}

function oc(
  name: string,
  nativeName: string,
  attributes: SchemaAttribute[],
  supports: Array<"CREATE"|"UPDATE"|"DELETE"|"GET"|"SEARCH"|"SYNC">
): ObjectClassInfo {
  return { name, nativeName, attributes, supports };
}

export default async function factory(ctx: {
  logger: Console;
  config: ${connectorName}Configuration;
  instanceId: string;
  connectorId: string;
  type: string;
}): Promise<ConnectorSpi> {
  const { config, logger } = ctx;

  // TODO: Initialize your connector client/connection here
  // Example: const client = new YourClient(config);

  async function schema(): Promise<Schema> {
    const objectClasses: ObjectClassInfo[] = [
${objectClassDefinitions}
    ];

    return { objectClasses };
  }

  async function test(): Promise<void> {
    // TODO: Implement connection test
    logger.log("${connectorName} connector test successful");
  }
${operationMethodsStr}

  return {
    schema,
    test,
    ${operationExports}
  };
}
`;
}

function generateConfigTs(connectorName) {
    return `import type { Configuration } from "../spi/configuration.js";

export interface ${connectorName}Configuration extends Configuration {
  // TODO: Define your connector-specific configuration properties
  // Example:
  // apiUrl: string;
  // apiKey: string;
  // timeout?: number;
}

export async function buildConfiguration(raw: any): Promise<${connectorName}Configuration> {
  // TODO: Validate and build configuration
  const config: ${connectorName}Configuration = {
    ...raw
  };

  return config;
}

export default buildConfiguration;
`;
}

function generatePackageJson(connectorName, version) {
    return {
        name: `${connectorName}-connector`,
        version: version,
        type: "module",
        main: "./index.ts",
        dependencies: {}
    };
}

function generateManifestJson(connectorName, connectorType, version) {
    return {
        id: connectorName,
        type: connectorType,
        version: version,
        entry: "./index.ts",
        config: "./config.ts",
        instances: [
            {
                id: connectorName,
                config: {}
            }
        ]
    };
}

async function main() {
    console.log("=== Connector Scaffold Generator ===\n");

    const name = await prompt("Connector name (e.g., salesforce): ");
    if (!name.trim()) {
        console.error("Error: Connector name is required");
        process.exit(1);
    }

    const version = await prompt("Version (default: 1.0.0): ") || "1.0.0";

    const type = await prompt(`Connector type (default: ${name}): `) || name;

    const directory = await prompt(`Directory (default: ./src/${name}-${version}): `) || `./src/${name}-${version}`;

    const operations = await promptMultiple(
        "Supported operations",
        "CREATE,GET,UPDATE,DELETE,SEARCH"
    );

    const objectClasses = await promptMultiple(
        "Object classes",
        "__ACCOUNT__,__GROUP__"
    );

    rl.close();

    console.log("\n=== Generating connector scaffold ===\n");

    const connectorDir = path.resolve(process.cwd(), directory);
    await ensureDir(connectorDir);

    const indexPath = path.join(connectorDir, "index.ts");
    const configPath = path.join(connectorDir, "config.ts");
    const packagePath = path.join(connectorDir, "package.json");
    const manifestPath = path.join(connectorDir, "manifest.json");

    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);

    await fs.writeFile(
        indexPath,
        await generateIndexTs(capitalizedName, operations, objectClasses),
        "utf8"
    );
    console.log(`✓ Created ${indexPath}`);

    await fs.writeFile(
        configPath,
        generateConfigTs(capitalizedName),
        "utf8"
    );
    console.log(`✓ Created ${configPath}`);

    await fs.writeFile(
        packagePath,
        JSON.stringify(generatePackageJson(name, version), null, 2) + "\n",
        "utf8"
    );
    console.log(`✓ Created ${packagePath}`);

    await fs.writeFile(
        manifestPath,
        JSON.stringify(generateManifestJson(name, type, version), null, 2) + "\n",
        "utf8"
    );
    console.log(`✓ Created ${manifestPath}`);

    console.log("\n=== Scaffold complete ===");
    console.log(`\nConnector directory: ${connectorDir}`);
    console.log(`\nNext steps:`);
    console.log(`1. Implement the TODO sections in ${indexPath}`);
    console.log(`2. Add configuration properties in ${configPath}`);
    console.log(`3. Build the connector using: npm run add-connector -- --src ${directory} --name ${name} --type ${type} --entry ./index.ts --config ./config.ts`);
    console.log(`4. Start the service with: node src/server/index.js --connectors ./dist\n`);
}

main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});
