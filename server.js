const express = require('express');
const Velocity = require('velocityjs');
const app = express();
const PORT = 3000;

app.use(express.json());

app.post('/preview', (req, res) => {
  const { template, variables } = req.body;
  try {
    const compiledTemplate = new Velocity.Engine().render(template, variables);
    res.send({ output: compiledTemplate });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));