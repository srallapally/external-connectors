#!/usr/bin/env node
// scripts/add-connector.mjs
// Updating to handling versioning and minification

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import semver from "semver";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = {};
for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith("--")) {
        const k = a.slice(2);
        const v = (i + 1 < process.argv.length && !process.argv[i + 1].startsWith("--"))
            ? process.argv[++i]
            : "true";
        args[k] = v;
    }
}

const req = (k) => {
    if (!args[k]) throw new Error(`Missing --${k}`);
    return args[k];
};

// Required
const SRC = path.resolve(process.cwd(), req("src"));
const NAME = req("name");
const TYPE = req("type");
const VERSION = req("version");
const ENTRY = path.resolve(SRC, req("entry"));

// Optional
const CONFIG = args["config"] ? path.resolve(SRC, args["config"]) : null;
const INSTANCES_PATH = args["instances"] ? path.resolve(process.cwd(), args["instances"]) : null;
const MINIFY = args["minify"] === "true";

// Project layout
const ROOT = path.resolve(__dirname, "..");        // external-connectors/
const DIST = path.resolve(ROOT, "dist");           // external-connectors/dist
const OUTDIR = path.resolve(DIST, NAME);           // external-connectors/dist/<name>

async function ensureDir(d) {
    await fs.mkdir(d, { recursive: true });
}

async function bundleFile(inFile, outFile) {
    await esbuild.build({
        entryPoints: [inFile],
        outfile: outFile,
        bundle: true,
        platform: "node",
        format: "esm",
        target: "node18",
        sourcemap: true,
        minify: MINIFY,
        legalComments: "none",
        external: ["@governance-connector-framework/core"]
    });
}

/**
 * The scaffold's own manifest.json (written by connector-generator.mjs)
 * carries the poolable/idempotentDelta/equalitySearchOnName flags the user
 * answered at generation time. Read them here and carry them into the built
 * manifest below -- without this, they're silently dropped and every
 * deployed connector gets the framework's worst-case default (false) for
 * all three, regardless of what was actually answered.
 */
async function readSourceCapabilities() {
    const sourceManifestPath = path.resolve(SRC, "manifest.json");
    try {
        const sourceManifest = JSON.parse(await fs.readFile(sourceManifestPath, "utf8"));
        const { poolable, idempotentDelta, equalitySearchOnName } = sourceManifest;
        return { poolable, idempotentDelta, equalitySearchOnName };
    } catch {
        // No source manifest.json, or it doesn't have these fields -- fine,
        // they stay unset below and resolveCapabilities() defaults each to
        // false, same as before this fix existed.
        return {};
    }
}

async function loadInstances() {
    if (!INSTANCES_PATH) return [];
    const data = await fs.readFile(INSTANCES_PATH, "utf8");
    const js = JSON.parse(data);
    if (Array.isArray(js)) return js;
    if (js && typeof js === "object" && Array.isArray(js.instances)) return js.instances;
    throw new Error("--instances file must be an array of { id, config? } or { instances: [...] }");
}

async function validateEntryPoint(filePath) {
    try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) {
            throw new Error(`Entry point is not a file: ${filePath}`);
        }

        const content = await fs.readFile(filePath, "utf8");

        if (!content.includes("export") && !content.includes("module.exports")) {
            console.warn("⚠️  Warning: Entry point may not export a factory function");
        }

        return true;
    } catch (e) {
        throw new Error(`Entry point validation failed: ${e.message}`);
    }
}

async function validateConfigFile(filePath) {
    try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) {
            throw new Error(`Config file is not a file: ${filePath}`);
        }
        return true;
    } catch (e) {
        throw new Error(`Config file validation failed: ${e.message}`);
    }
}

function validateVersion(version) {
    const cleaned = semver.clean(version);
    if (!cleaned) {
        throw new Error(`Invalid semantic version: "${version}". Must follow semver format (e.g., "1.0.0", "2.1.3")`);
    }
    return cleaned;
}

function validateName(name) {
    if (!/^[a-z0-9_-]+$/i.test(name)) {
        throw new Error(`Invalid name: "${name}". Must contain only alphanumeric characters, underscores, and hyphens`);
    }
    if (name.length > 128) {
        throw new Error(`Name too long: "${name}". Must be 128 characters or less`);
    }
    return name;
}

function validateType(type) {
    if (!/^[a-z0-9_-]+$/i.test(type)) {
        throw new Error(`Invalid type: "${type}". Must contain only alphanumeric characters, underscores, and hyphens`);
    }
    if (type.length > 128) {
        throw new Error(`Type too long: "${type}". Must be 128 characters or less`);
    }
    return type;
}

async function validateBundledEntry(bundledPath) {
    try {
        const url = new URL(`file://${bundledPath}`);
        const mod = await import(url.href);

        if (typeof mod.default !== "function") {
            throw new Error("Bundled entry point must have a default export that is a factory function");
        }

        console.log("✓ Validated: Entry exports a factory function");
        return true;
    } catch (e) {
        if (e.message.includes("default export")) {
            throw e;
        }
        console.warn(`⚠️  Warning: Could not validate entry point exports: ${e.message}`);
        return false;
    }
}

(async () => {
    try {
        console.log(`\n🔧 Packing connector '${NAME}' (type='${TYPE}', version='${VERSION}')`);

        // Pre-deployment validation
        console.log("\n📋 Running pre-deployment validation...");

        const validatedName = validateName(NAME);
        const validatedType = validateType(TYPE);
        const validatedVersion = validateVersion(VERSION);

        console.log(`✓ Name: ${validatedName}`);
        console.log(`✓ Type: ${validatedType}`);
        console.log(`✓ Version: ${validatedVersion}`);

        await validateEntryPoint(ENTRY);
        console.log(`✓ Entry point exists: ${path.relative(process.cwd(), ENTRY)}`);

        if (CONFIG) {
            await validateConfigFile(CONFIG);
            console.log(`✓ Config file exists: ${path.relative(process.cwd(), CONFIG)}`);
        }

        const sourceCapabilities = await readSourceCapabilities();
        const capabilityNote = Object.keys(sourceCapabilities).length
            ? `poolable=${sourceCapabilities.poolable}, idempotentDelta=${sourceCapabilities.idempotentDelta}, equalitySearchOnName=${sourceCapabilities.equalitySearchOnName}`
            : "none found in source manifest.json -- defaulting all to false";
        console.log(`✓ Capability flags: ${capabilityNote}`);

        await ensureDir(OUTDIR);

        // Bundle entry
        console.log("\n🔨 Building...");
        const entryOut = path.resolve(OUTDIR, "index.js");
        await bundleFile(ENTRY, entryOut);
        console.log(`  • Built ./${NAME}/index.js`);

        // Validate bundled entry exports
        await validateBundledEntry(entryOut);

        // Bundle config (optional)
        let hasConfig = false;
        if (CONFIG) {
            const cfgOut = path.resolve(OUTDIR, "config.js");
            await bundleFile(CONFIG, cfgOut);
            hasConfig = true;
            console.log(`  • Built ./${NAME}/config.js`);
        }

        // Instances
        let instances = await loadInstances();
        if (!instances.length) {
            instances = [{ id: NAME, config: {} }];
        }

        // Validate instance configurations
        for (const inst of instances) {
            if (!inst.id) {
                throw new Error("Instance configuration missing required 'id' field");
            }
            if (inst.connectorVersion) {
                const cleanedInstVersion = semver.clean(inst.connectorVersion);
                if (!cleanedInstVersion) {
                    throw new Error(`Invalid semantic version in instance "${inst.id}": "${inst.connectorVersion}"`);
                }
            }
        }

        console.log(`✓ Validated ${instances.length} instance(s)`);

        // Manifest path
        const manifestPath = path.resolve(OUTDIR, "manifest.json");

        // Manifest content expected by the service
        const manifest = {
            id: validatedName,
            type: validatedType,
            version: validatedVersion,
            entry: "./index.js",
            ...(hasConfig ? { config: "./config.js" } : {}),
            ...sourceCapabilities,
            instances
        };

        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

        console.log(`  • Wrote ./${NAME}/manifest.json`);
        console.log(`\n✅ Connector '${NAME}@${validatedVersion}' ready at ${OUTDIR}`);
        console.log(`\nNext steps:`);
        console.log(`  1. Review the generated manifest at: ${manifestPath}`);
        console.log(`  2. Start the service with: --connectors ${DIST}\n`);

    } catch (e) {
        console.error(`\n❌ Error: ${e.message}`);
        if (e.stack && process.env.DEBUG) {
            console.error(e.stack);
        }
        process.exit(1);
    }
})();
