const express = require("express");
const bodyParser = require("body-parser");
const { createEngine } = require("velocity");
const app = express();
const port = 3000;

app.use(bodyParser.json());

// Función para verificar si todas las variables están presentes
function checkVariables(template, variables) {
  const missingVariables = [];
    const regex = /\$\{?([a-zA-Z0-9_.]+)\}?/g;
      let match;

        // Buscar todas las variables y verificar si están en el contexto
          while ((match = regex.exec(template)) !== null) {
              const varPath = match[1];
                  if (!getValueFromPath(variables, varPath)) {
                        missingVariables.push(varPath);
                            }
                              }

                                return missingVariables;
                                }

                                // Obtener el valor de un camino (path) en un objeto
                                function getValueFromPath(obj, path) {
                                  return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj);
                                  }

                                  // Ruta de vista previa
                                  app.post("/preview", (req, res) => {
                                    const { template, variables } = req.body;

                                      // Verificar si faltan variables
                                        const missingVariables = checkVariables(template, variables);

                                          if (missingVariables.length > 0) {
                                              res.json({
                                                    error: `Faltan variables en el template: ${missingVariables.join(", ")}`
                                                        });
                                                            return;
                                                              }

                                                                try {
                                                                    const engine = createEngine();
                                                                        const output = engine.render(template, variables);
                                                                            res.json({ output });
                                                                              } catch (error) {
                                                                                  res.json({ error: error.message });
                                                                                    }
                                                                                    });

                                                                                    app.listen(port, () => {
                                                                                      console.log(`Servidor escuchando en http://localhost:${port}`);
                                                                                      });