/* ═══════════════════════════════════════════
   Velocity Template Editor — Ejemplos
   ═══════════════════════════════════════════ */

const EXAMPLES = {
  basic: {
    name: "Hola Mundo",
    template: "¡Hola $nombre! Bienvenido a $sitio.\n\nHoy es $fecha.",
    vars: { nombre: "Artick", sitio: "artickone.com", fecha: "julio 2026" }
  },

  product: {
    name: "Ficha de producto",
    // Usamos string normal, NO template literal con ${}
    // para evitar que JS interprete $producto.precio como variable
    template: '<div class="producto">\n' +
      '  <h2>$producto.nombre</h2>\n' +
      '  <p class="precio">$${producto.precio}</p>\n' +
      '  <p>$producto.descripcion</p>\n' +
      '  <p>Stock: $producto.stock unidades</p>\n' +
      '</div>',
    vars: {
      producto: {
        nombre: "Media Kit Pro",
        precio: "29.99",
        descripcion: "Plantilla profesional para streams",
        stock: 42
      }
    }
  },

  loop: {
    name: "Lista #foreach",
    template: '<h3>$titulo</h3>\n' +
      '<ul>\n' +
      '#foreach( $item in $lista )\n' +
      '  <li>$item</li>\n' +
      '#end\n' +
      '</ul>\n' +
      '<p>Total: ${lista.size()} items</p>',
    vars: {
      titulo: "Últimos lanzamientos",
      lista: ["Velocity Editor", "Template Studio", "Render Pro", "Media Kit"]
    }
  },

  conditions: {
    name: "Condicionales #if",
    template: '<h1>Bienvenido, $usuario</h1>\n' +
      '#if( $premium )\n' +
      '  <p class="premium">🌟 Eres premium</p>\n' +
      '#else\n' +
      '  <p class="free">💡 Plan gratis — hazte premium por $precio/mes</p>\n' +
      '#end',
    vars: { usuario: "Artick", premium: false, precio: 9.99 }
  },

  email: {
    name: "Email HTML",
    template: '<html><body style="font-family:Arial;padding:20px;">\n' +
      '<h1 style="color:#8b5cf6;">¡Hola, $nombre!</h1>\n' +
      '<p>Gracias por tu interés en <strong>$producto</strong>.</p>\n' +
      '#if( $oferta )\n' +
      '<div style="background:#f0f0ff;padding:15px;border-radius:8px;">\n' +
      '<h3>🎉 Oferta especial</h3>\n' +
      '<p>Usa el código <strong>$codigo</strong> y obtén $descuento% desc.</p>\n' +
      '</div>\n' +
      '#end\n' +
      '<hr>\n' +
      '<p style="color:#888;">Saludos,<br>El equipo de $empresa</p>\n' +
      '</body></html>',
    vars: {
      nombre: "Artick",
      producto: "Velocity Editor Pro",
      oferta: true,
      codigo: "ARTICK20",
      descuento: 20,
      empresa: "Template Studio"
    }
  }
};
