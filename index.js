#!/usr/bin/env node
// Entry point para Render (busca index.js por defecto)
const app = require("./server");
const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
  console.log(`📝 Endpoint: POST /preview`);
});
