const express = require('express');
const Velocity = require('velocityjs');
const app = express();
const PORT = 3000;

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static('public'));

app.use(express.json());

app.post('/preview', (req, res) => {
  const { template, variables } = req.body;
  try {
    // Usar Velocity.render en lugar de new Velocity.Engine().render
    const compiledTemplate = Velocity.render(template, variables);
    res.send({ output: compiledTemplate });
  } catch (error) {
    res.status(500).send({ error: `Error en la plantilla: ${error.message}` });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
