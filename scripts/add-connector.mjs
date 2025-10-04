#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

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
const ENTRY = path.resolve(SRC, req("entry"));

// Optional
const CONFIG = args["config"] ? path.resolve(SRC, args["config"]) : null;
const INSTANCES_PATH = args["instances"] ? path.resolve(process.cwd(), args["instances"]) : null;
const MINIFY = args["minify"] === "true";

// Project layout
const ROOT = path.resolve(__dirname, "..");        // external-connectors/
const DIST = path.resolve(ROOT, "dist");           // external-connectors/dist
const OUTDIR = path.resolve(DIST, NAME);           // external-connectors/dist/<name>

async function ensureDir(d) { await fs.mkdir(d, { recursive: true }); }

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
    });
}

async function loadInstances() {
    if (!INSTANCES_PATH) return [];
    const data = await fs.readFile(INSTANCES_PATH, "utf8");
    const js = JSON.parse(data);
    if (Array.isArray(js)) return js;
    if (js && typeof js === "object" && Array.isArray(js.instances)) return js.instances;
    throw new Error("--instances file must be an array of { id, config? } or { instances: [...] }");
}

(async () => {
    console.log(`\n🔧 Packing connector '${NAME}' (type='${TYPE}')`);

    await ensureDir(OUTDIR);

    // Bundle entry
    const entryOut = path.resolve(OUTDIR, "index.js");
    await bundleFile(ENTRY, entryOut);
    console.log(`  • built ./${NAME}/index.js`);

    // Bundle config (optional)
    let hasConfig = false;
    if (CONFIG) {
        const cfgOut = path.resolve(OUTDIR, "config.js");
        await bundleFile(CONFIG, cfgOut);
        hasConfig = true;
        console.log(`  • built ./${NAME}/config.js`);
    }

    // Instances
    let instances = await loadInstances();
    if (!instances.length) instances = [{ id: NAME, config: {} }];

    // ✨ Per-connector manifest path
    const manifestPath = path.resolve(OUTDIR, "manifest.json");

    // Manifest content expected by the service INSIDE the connector folder
    const manifest = {
        id: NAME,
        type: TYPE,
        entry: "./index.js",
        ...(hasConfig ? { config: "./config.js" } : {}),
        instances
    };

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");

    console.log(`  • wrote ./${NAME}/manifest.json`);
    console.log(`\n✔ Connector '${NAME}' ready at ${OUTDIR}`);
    console.log(`Next: start the service with --connectors ${DIST}\n`);
})().catch((e) => {
    console.error(e?.stack || e);
    process.exit(1);
});
