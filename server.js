const express = require("express");
const bodyParser = require("body-parser");
const { createEngine } = require("velocity");
const app = express();
const port = 3000;

app.use(bodyParser.json());

// Función para detectar variables y asignar valores predeterminados
function setDefaultValues(template, variables) {
  // Expresión regular para detectar todas las variables en la plantilla
    const regex = /\$\{?([a-zA-Z0-9_.]+)\}?/g;
      let match;
        
          // Copia de las variables proporcionadas
            const context = { ...variables };

              // Buscar y asignar valores predeterminados para las variables que falten
                while ((match = regex.exec(template)) !== null) {
                    const varPath = match[1];
                        if (!getValueFromPath(context, varPath)) {
                              setValueFromPath(context, varPath, getDefaultForPath(varPath));
                                  }
                                    }

                                      return context;
                                      }

                                      // Obtener el valor de un camino (path) en un objeto
                                      function getValueFromPath(obj, path) {
                                        return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj);
                                        }

                                        // Asignar valor en un camino (path) en un objeto
                                        function setValueFromPath(obj, path, value) {
                                          const keys = path.split('.');
                                            keys.reduce((o, p, i) => (o[p] = i === keys.length - 1 ? value : o[p] || {}), obj);
                                            }

                                            // Definir valores predeterminados basados en el nombre de la variable
                                            function getDefaultForPath(path) {
                                              if (path.includes("name")) return "Valor por defecto";
                                                if (path.includes("price") || path.includes("total")) return "0.00";
                                                  if (path.includes("quantity")) return 1;
                                                    if (path.includes("loyaltyMember")) return false;
                                                      return "Texto por defecto";
                                                      }

                                                      // Ruta de vista previa
                                                      app.post("/preview", (req, res) => {
                                                        const { template, variables } = req.body;

                                                          // Genera valores predeterminados dinámicos
                                                            const context = setDefaultValues(template, variables);

                                                              try {
                                                                  const engine = createEngine();
                                                                      const output = engine.render(template, context);
                                                                          res.json({ output });
                                                                            } catch (error) {
                                                                                res.json({ error: error.message });
                                                                                  }
                                                                                  });

                                                                                  app.listen(port, () => {
                                                                                    console.log(`Servidor escuchando en http://localhost:${port}`);
                                                                                    });