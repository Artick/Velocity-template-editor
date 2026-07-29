# ⚡ Velocity Template Editor

Editor web interactivo para templates **Apache Velocity** con editor **CodeMirror**, vista previa en vivo, variables JSON y validación HTML.

> Proyecto experimental en desarrollo activo.

---

## Captura de funcionalidades

```
┌──────────────────────────────────────────────────────────────┐
│  ⚡ Velocity Editor   [📝 Ejemplos...] [▶ Render] [⬇] [⬆] [🗑] │
├──────────────────────────┬───────────────────────────────────┤
│ 📄 Template .vm          │ 🖼 Resultado                     │
│ ┌──────────────────────┐ │ ┌───────────────────────────────┐ │
│ │  Hola $nombre!       │ │ │ ¡Hola Artick!                │ │
│ │  #foreach( $item in  │ │ │ · Velocity Editor            │ │
│ │    $lista )          │ │ │ · Template Studio            │ │
│ │    - $item           │ │ │ · Render Pro                 │ │
│ │  #end                 │ │ │ · Media Kit                  │ │
│ └──────────────────────┘ │ └───────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ 🔧 Variables                    ↕ JSON  📋 Tabla  🌳 Árbol │
│ { "nombre": "Artick", "lista": ["Velocity Editor", ...] }   │
├──────────────────────────────────────────────────────────────┤
│ 📋 Historial / ❓ Ayuda                                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Stack tecnológico

| Tecnología       | Propósito                                    |
|------------------|----------------------------------------------|
| **Node.js**      | Entorno de ejecución del servidor            |
| **Express**      | Framework HTTP para API y archivos estáticos |
| **velocityjs**   | Motor de renderizado Apache Velocity         |
| **CodeMirror**   | Editor de código con resaltado de sintaxis   |
| **HTMLHint**     | Validación de HTML generado                  |
| **Docker**       | Contenerización y despliegue                 |

---

## Inicio rápido

### Prerrequisitos

- Node.js ≥ 18
- npm ≥ 9

### Instalación

```bash
git clone https://github.com/tu-usuario/velocity-templates.git
cd velocity-templates
npm install
```

### Ejecución

```bash
npm start
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

### Con Docker

```bash
docker compose up
```

---

## Tests

```bash
npm test
```

---

## Ejemplos de uso

### 1. Hola Mundo

**Template:**
```velocity
¡Hola $nombre! Bienvenido a $sitio.

Hoy es $fecha.
```

**Variables:**
```json
{
  "nombre": "Artick",
  "sitio": "velocity-templates.dev",
  "fecha": "julio 2026"
}
```

**Resultado:**
```
¡Hola Artick! Bienvenido a velocity-templates.dev.

Hoy es julio 2026
```

### 2. Producto con objeto anidado

**Template:**
```html
<div class="producto">
  <h2>$producto.nombre</h2>
  <p class="precio">$${producto.precio}</p>
  <p>$producto.descripcion</p>
  <p>Stock: $producto.stock unidades</p>
</div>
```

**Variables:**
```json
{
  "producto": {
    "nombre": "Media Kit Pro",
    "precio": "29.99",
    "descripcion": "Plantilla profesional para streams",
    "stock": 42
  }
}
```

### 3. Lista con `#foreach`

**Template:**
```velocity
<h3>$titulo</h3>
<ul>
#foreach( $item in $lista )
  <li>$item</li>
#end
</ul>
<p>Total: ${lista.size()} items</p>
```

### 4. Condicionales con `#if`

**Template:**
```velocity
<h1>Bienvenido, $usuario</h1>
#if( $premium )
  <p class="premium">🌟 Eres premium</p>
#else
  <p class="free">💡 Plan gratis — hazte premium por $precio/mes</p>
#end
```

---

## API REST

### `POST /preview`

Renderiza un template Velocity con las variables proporcionadas.

**Body (JSON):**
```json
{
  "template": "Hola $nombre!",
  "variables": { "nombre": "Mundo" }
}
```

**Respuesta exitosa:**
```json
{
  "output": "Hola Mundo!"
}
```

**Respuesta con error:**
```json
{
  "error": "Faltan variables en el template: nombre"
}
```

---

## Features actuales

- [x] Editor CodeMirror con resaltado de sintaxis Velocity
- [x] Editor JSON para variables (con autocompletado de `$variables`)
- [x] Vista previa en vivo con debounce (800ms)
- [x] Atajo `Ctrl+Enter` para renderizar
- [x] Ejemplos precargados (Hola Mundo, producto, foreach, condicionales, email HTML)
- [x] Vista de variables en tabla y árbol
- [x] Detección automática de variables desde el template
- [x] Historial de renders (almacenado en localStorage)
- [x] Validación HTML con HTMLHint
- [x] Modo vista previa HTML (iframe)
- [x] Selector de ancho de preview (responsive, 480px, 768px, 1024px)
- [x] Tema claro/oscuro para preview
- [x] Importar/Exportar archivos `.vm`
- [x] Paneles colapsables
- [x] Rate limiting en producción
- [x] Content-Security-Policy configurada
- [x] CI en GitHub Actions

---

## Roadmap

- [ ] Test suite real con Mocha/Jest
- [ ] Soporte para macros Velocity (`#macro`)
- [ ] Diferentes temas de editor CodeMirror
- [ ] Exportar HTML renderizado
- [ ] Soporte multilenguaje
- [ ] Guardar templates en backend (persistencia)
- [ ] Compartir templates por URL
- [ ] Modo oscuro para el iframe de preview
- [ ] Editor visual (drag & drop) de variables
- [ ] Integración con gestores de contenido

---

## Licencia

ISC
