const request = require("supertest");
const app = require("../server");

describe("POST /preview", () => {
  // Test 1: Render básico
  test("renderiza template con variables correctamente", async () => {
    const res = await request(app)
      .post("/preview")
      .send({ template: "$nombre", variables: { nombre: "Artick" } });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ output: "Artick" });
  });

  // Test 2: Variables faltantes
  test("detecta variables faltantes en el template", async () => {
    const res = await request(app)
      .post("/preview")
      .send({ template: "$x $y", variables: { x: 1 } });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toMatch(/faltan variables/i);
    expect(res.body.error).toContain("y");
  });

  // Test 3: Sin template
  test("devuelve error cuando template no está presente", async () => {
    const res = await request(app)
      .post("/preview")
      .send({ variables: { a: 1 } });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ error: "El campo 'template' es requerido" });
  });

  // Test 4: Sin variables (objeto vacío)
  test("renderiza template cuando variables es objeto vacío", async () => {
    const res = await request(app)
      .post("/preview")
      .send({ template: "hola", variables: {} });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ output: "hola" });
  });

  // Test 5: Condicional con Velocity #if
  test("procesa directiva #if correctamente", async () => {
    const res = await request(app)
      .post("/preview")
      .send({ template: "#if($x)si#end", variables: { x: true } });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ output: "si" });
  });

  // Test 6: Body que no es un objeto JSON válido
  test("devuelve error cuando el body no es un objeto", async () => {
    const res = await request(app)
      .post("/preview")
      .send(["template-invalido", { x: 1 }]);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("error");
  });
});
