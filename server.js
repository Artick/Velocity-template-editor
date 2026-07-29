const express = require("express");
const bodyParser = require("body-parser");
const velocity = require("velocityjs");
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: "1mb" }));

// Rate limiting simple en producción
if (process.env.NODE_ENV === "production") {
  const rateLimit = {};
  setInterval(() => { Object.keys(rateLimit).forEach(k => delete rateLimit[k]); }, 60000);
  app.use((req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    rateLimit[ip] = (rateLimit[ip] || 0) + 1;
    if (rateLimit[ip] > 60) {
      return res.status(429).json({ error: "Demasiadas solicitudes. Intenta de nuevo en 1 minuto." });
    }
    next();
  });
}

// CSP permisiva para CDN de CodeMirror
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
    "font-src 'self' https://cdnjs.cloudflare.com data:; " +
    "frame-src 'self' https:; " +
    "connect-src 'self' https:; " +
    "img-src 'self' data: https:"
  );
  next();
});

// Servir archivos estáticos (el frontend)
app.use(express.static("public"));

// Función para verificar si todas las variables están presentes
function checkVariables(template, variables) {
  const missingVariables = [];
  // Regex para encontrar variables Velocity: $var, ${var}, $var.prop
  const regex = /\$\{?([a-zA-Z_][a-zA-Z0-9_.]*)\}?/g;
  let match;

  const variableNames = new Set();

  // Extraer nombres de variables del objeto de variables
  function extractKeys(obj, prefix = "") {
    for (const key of Object.keys(obj)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      variableNames.add(fullPath);
      if (typeof obj[key] === "object" && obj[key] !== null) {
        extractKeys(obj[key], fullPath);
      }
    }
  }
  extractKeys(variables);

  while ((match = regex.exec(template)) !== null) {
    const varPath = match[1];
    // Ignorar si es una directiva de Velocity
    if (varPath.match(/^(foreach|if|else|elseif|end|set|parse|include|macro|stop)$/)) {
      continue;
    }
    // Verificar si la variable existe en el contexto
    const value = getValueFromPath(variables, varPath);
    if (value === undefined || value === null) {
      // Solo agregar si no es una variable que ya tenemos
      if (!variableNames.has(varPath)) {
        missingVariables.push(varPath);
      }
    }
  }

  return missingVariables;
}

// Obtener el valor de un camino (path) en un objeto
function getValueFromPath(obj, path) {
  return path.split(".").reduce((o, p) => (o ? o[p] : undefined), obj);
}

// Ruta de vista previa
app.post("/preview", (req, res) => {
  const { template, variables } = req.body;

  // Validar entrada
  if (!template) {
    return res.json({ error: "El campo 'template' es requerido" });
  }
  if (!variables || typeof variables !== "object") {
    return res.json({ error: "El campo 'variables' debe ser un objeto JSON válido" });
  }

  // Verificar si faltan variables
  const missingVariables = checkVariables(template, variables);

  if (missingVariables.length > 0) {
    return res.json({
      error: `Faltan variables en el template: ${missingVariables.join(", ")}`
    });
  }

  try {
    const output = velocity.render(template, variables);
    res.json({ output });
  } catch (error) {
    res.json({ error: `Error al renderizar: ${error.message}` });
  }
});

// Exportar app para testing
module.exports = app;

// Solo iniciar el servidor si se ejecuta directamente
if (require.main === module) {
  app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
    console.log(`📝 Endpoint: POST /preview`);
  });
}
