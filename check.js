// check.js
const url = "file:///Users/sanjay.rallapally/WebstormProjects/external-connectors/dist/graph/index.js";

(async () => {
  try {
    const m = await import(url);
    const f = m.default || m.factory;
    if (!f) {
      console.error("No default export from", url);
      process.exit(2);
    }

    // supply creds via env or inline here
    const config = {
      tenantId: (process.env.AZURE_TENANT_ID || "92e5117d-77cc-414b-a0f7-a8e4589958df").trim(),
      clientId:  (process.env.AZURE_CLIENT_ID  || "d5d6f7d8-76ba-40b3-aa8b-b9fe8ab4dc92").trim(),
      clientSecret: (process.env.AZURE_CLIENT_SECRET || "C928Q~-Nd1y~Q6DgOs9gNYJrSboA_gkSfGdNpblT").trim(),
    };

    // ✅ Call with CONTEXT (what your factory expects now)
    const ctx = {
      logger: console,
      config,
      instanceId: "graph",
      connectorId: "graph",
      type: "graph",
    };

    const inst = await f(ctx);
    console.log("Factory returned keys:", Object.keys(inst || {}));
    console.log("Has schema:", typeof inst?.schema);
  } catch (e) {
    console.error("Import failed:", e);
    process.exit(1);
  }
})();
