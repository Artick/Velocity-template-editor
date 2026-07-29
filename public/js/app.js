/* ═══════════════════════════════════════════
   Velocity Template Editor — App principal
   Render, Historial, Árbol, Export/Import
   ═══════════════════════════════════════════ */

let previewMode = "text";
let historyId = 0;
let currentTemplateName = "Sin título";

// ─── Utilidades ───

function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function setStatus(text, type) {
  const el = document.getElementById("status");
  el.textContent = text;
  el.className = "status" + (type ? " " + type : "");
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

// ─── Toggle variables ───

function toggleVars() {
  document.getElementById("varsToggle").click();
}

// ─── Switch preview tabs ───

function switchPreview(mode) {
  previewMode = mode;
  document.querySelectorAll(".preview-tab").forEach(t => {
    t.classList.toggle("active", t.dataset.mode === mode);
  });
  document.getElementById("outputText").style.display =
    mode === "text" ? "block" : "none";
  document.getElementById("outputPreview").style.display =
    mode === "html" ? "block" : "none";
}

// ─── Switch bottom tabs ───

function switchBottomTab(tab) {
  document.querySelectorAll(".bottom-tab").forEach(t => {
    t.classList.toggle("active", t.dataset.tab === tab);
  });
  document.querySelectorAll(".bottom-body").forEach(b => {
    b.classList.remove("open");
  });
  const panel = document.getElementById("panel-" + tab);
  if (panel) panel.classList.add("open");
  if (tab === "vartree") buildVarTree();
}

// ─── Render ───

async function renderPreview() {
  const template = templateEditor.getValue();
  const variablesRaw = varsEditor.getValue();
  const outputText = document.getElementById("outputText");
  const outputPreview = document.getElementById("outputPreview");

  if (!template.trim()) {
    outputText.textContent = "⚠️ Escribe un template";
    outputText.className = "preview-body error";
    setStatus("Vacío", "err");
    return;
  }

  let variables;
  try {
    variables = JSON.parse(variablesRaw || "{}");
  } catch (e) {
    outputText.textContent = "❌ JSON inválido: " + e.message;
    outputText.className = "preview-body error";
    setStatus("JSON error", "err");
    return;
  }

  // Limpiar highlights de errores anteriores
  clearHighlights();

  setStatus("Renderizando...");

  try {
    const res = await fetch("/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template, variables })
    });
    const result = await res.json();

    if (result.output) {
      // Mostrar en texto
      outputText.textContent = result.output;
      outputText.className = "preview-body";

      // Mostrar en iframe
      const doc = outputPreview.contentDocument ||
                  outputPreview.contentWindow.document;
      doc.open();
      doc.write(result.output);
      doc.close();

      setStatus("✅ OK");

      // Auto-cambio a HTML si el output contiene HTML
      const trimmed = result.output.trim();
      if ((trimmed.startsWith("<") || trimmed.startsWith("<html")) &&
          previewMode === "text") {
        switchPreview("html");
      }

      // Guardar en historial
      saveToHistory(template, variables, result.output);
      // Construir árbol de variables
      buildVarTree();
    } else {
      const errMsg = result.error || "Error desconocido";
      outputText.textContent = "❌ " + errMsg;
      outputText.className = "preview-body error";
      setStatus("Error", "err");

      // Resaltar variables faltantes en el editor
      highlightMissingVars(template, variables, errMsg);
    }
  } catch (e) {
    outputText.textContent = "❌ Error de conexión: " + e.message;
    outputText.className = "preview-body error";
    setStatus("Offline", "err");
  }
}

// ─── Resaltado de errores ───

function highlightMissingVars(template, variables, errorMsg) {
  // Limpiar marcas anteriores
  clearHighlights();

  if (!errorMsg) return;
  const match = errorMsg.match(/Faltan variables:?\s*(.+)/);
  if (!match) return;

  const missing = match[1].split(",").map(v => v.trim());
  const lines = template.split("\n");
  const regex = /\$\{?([a-zA-Z_][a-zA-Z0-9_.]*)\}?/g;

  lines.forEach((line, lineNum) => {
    let m;
    while ((m = regex.exec(line)) !== null) {
      if (missing.includes(m[1])) {
        templateEditor.markText(
          { line: lineNum, ch: m.index },
          { line: lineNum, ch: m.index + m[0].length },
          { className: "cm-missing-var" }
        );
      }
    }
  });

  showToast("🔴 Variables faltantes resaltadas en rojo");
}

function clearHighlights() {
  const markers = templateEditor.doc.getAllMarks();
  markers.forEach(m => m.clear());
}

// ─── Historial (localStorage) ───

function saveToHistory(template, variables, output) {
  const history = JSON.parse(localStorage.getItem("vm_history") || "[]");
  const entry = {
    id: ++historyId,
    name: currentTemplateName,
    template: template,
    variables: variables,
    output: output,
    date: new Date().toISOString()
  };
  history.unshift(entry);
  if (history.length > 20) history.pop();
  localStorage.setItem("vm_history", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById("historyList");
  const history = JSON.parse(localStorage.getItem("vm_history") || "[]");

  if (!history.length) {
    list.innerHTML =
      '<div class="history-empty">' +
      "Sin historial aún. Los templates se guardan al renderizar." +
      "</div>";
    return;
  }

  list.innerHTML = history
    .map(h => {
      const date = new Date(h.date);
      const time = date.toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit"
      });
      const day = date.toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short"
      });
      return (
        '<div class="history-item" data-id="' +
        h.id +
        '">' +
        '<span class="h-name">' +
        escHtml(h.name || "Sin título") +
        "</span>" +
        '<span class="h-date">' +
        day +
        " " +
        time +
        "</span>" +
        '<span class="h-del" data-action="delete">✕</span>' +
        "</div>"
      );
    })
    .join("");
}

// Event delegation para history list
document.getElementById("historyList").addEventListener("click", (e) => {
  const item = e.target.closest(".history-item");
  if (!item) return;
  const id = parseInt(item.dataset.id);

  if (e.target.dataset.action === "delete") {
    deleteHistory(id);
    return;
  }

  restoreHistory(id);
});

function restoreHistory(id) {
  const history = JSON.parse(localStorage.getItem("vm_history") || "[]");
  const entry = history.find(h => h.id === id);
  if (!entry) return;

  templateEditor.setValue(entry.template);
  varsEditor.setValue(JSON.stringify(entry.variables, null, 2));
  currentTemplateName = entry.name;
  showToast("📋 Template restaurado");
  setTimeout(renderPreview, 300);
}

function deleteHistory(id) {
  let history = JSON.parse(localStorage.getItem("vm_history") || "[]");
  history = history.filter(h => h.id !== id);
  localStorage.setItem("vm_history", JSON.stringify(history));
  renderHistory();
  showToast("🗑 Eliminado");
}

// ─── Árbol de variables ───

function buildVarTree() {
  const container = document.getElementById("varTreeContainer");
  try {
    const vars = JSON.parse(varsEditor.getValue() || "{}");
    if (Object.keys(vars).length === 0) {
      container.innerHTML =
        '<div class="history-empty">No hay variables definidas.</div>';
      return;
    }
    container.innerHTML = renderTree(vars, "");
  } catch (e) {
    container.innerHTML =
      '<div class="history-empty">JSON inválido</div>';
  }
}

function renderTree(obj, path) {
  let html = '<div class="var-tree-children open">';
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      html +=
        '<div class="var-tree-item">' +
        '<span class="vt-toggle" data-toggle="tree">▾</span>' +
        '<span class="vt-key">' +
        escHtml(key) +
        "</span></div>";
      html += renderTree(val, path ? path + "." + key : key);
    } else {
      const display =
        typeof val === "string"
          ? '"' + escHtml(val) + '"'
          : escHtml(String(val));
      html +=
        '<div class="var-tree-item">' +
        '<span class="vt-toggle" style="opacity:0;">▸</span>' +
        '<span class="vt-key">' +
        escHtml(key) +
        "</span>" +
        '<span style="color:var(--text3);margin:0 4px;">:</span>' +
        '<span class="' +
        (typeof val === "string" ? "vt-str" : "vt-val") +
        '">' +
        display +
        "</span></div>";
    }
  }
  html += "</div>";
  return html;
}

// Delegación para expandir/colapsar árbol
document.getElementById("varTreeContainer").addEventListener("click", (e) => {
  const toggle = e.target.closest('[data-toggle="tree"]');
  if (!toggle) return;
  const children = toggle.parentElement.nextElementSibling;
  if (children && children.classList.contains("var-tree-children")) {
    children.classList.toggle("open");
    toggle.textContent = children.classList.contains("open") ? "▾" : "▸";
  }
});

// ─── Cargar ejemplo ───

function loadExample(key) {
  if (!key || !EXAMPLES[key]) return;
  const ex = EXAMPLES[key];
  templateEditor.setValue(ex.template);
  varsEditor.setValue(JSON.stringify(ex.vars, null, 2));
  currentTemplateName = ex.name;
  setStatus("✅ " + ex.name + " cargado");

  // Abrir variables si están cerradas
  const body = document.getElementById("varsBody");
  const arrow = document.getElementById("varsArrow");
  if (!body.classList.contains("open")) {
    body.classList.add("open");
    arrow.classList.add("open");
    setTimeout(() => varsEditor.refresh(), 300);
  }

  renderPreview();
}

// ─── Exportar ───

function exportTemplate() {
  const template = templateEditor.getValue();
  const vars = varsEditor.getValue();
  // Incrustar variables como comentario HTML
  const content =
    template +
    "\n\n<!-- VARIABLES:\n" +
    vars +
    "\n-->";
  const blob = new Blob([content], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "template.vm";
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("⬇️ Exportado como template.vm");
}

// ─── Importar ───

function importTemplate(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    let content = e.target.result;

    // Detectar variables incrustadas
    const varMatch = content.match(/<!-- VARIABLES:\n([\s\S]*?)-->/);
    if (varMatch) {
      templateEditor.setValue(
        content.replace(/<!-- VARIABLES:[\s\S]*?-->/, "").trim()
      );
      try {
        varsEditor.setValue(
          JSON.stringify(JSON.parse(varMatch[1]), null, 2)
        );
      } catch (_) {
        varsEditor.setValue(varMatch[1]);
      }
    } else {
      templateEditor.setValue(content);
    }

    showToast("⬆️ Template importado");
    setTimeout(renderPreview, 300);
  };
  reader.readAsText(file);
  event.target.value = "";
}

// ─── Limpiar ───

function clearAll() {
  templateEditor.setValue("");
  varsEditor.setValue("{}");
  document.getElementById("outputText").textContent = "Esperando...";
  document.getElementById("outputText").className = "preview-body";
  const doc =
    document.getElementById("outputPreview").contentDocument ||
    document.getElementById("outputPreview").contentWindow.document;
  doc.open();
  doc.write("");
  doc.close();
  setStatus("Listo");
  document.getElementById("exampleSelect").value = "";
  clearHighlights();
  buildVarTree();
}

// ═══════════════════════════════════════════════════════
//  INIT — Registrar eventos al cargar
// ═══════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {

  // Preview tabs
  document.querySelectorAll(".preview-tab").forEach(tab => {
    tab.addEventListener("click", () => switchPreview(tab.dataset.mode));
  });

  // Bottom tabs
  document.querySelectorAll(".bottom-tab").forEach(tab => {
    tab.addEventListener("click", () => switchBottomTab(tab.dataset.tab));
  });

  // Botones
  document.getElementById("btnRender").addEventListener("click", renderPreview);
  document.getElementById("btnClear").addEventListener("click", clearAll);
  document.getElementById("btnExport").addEventListener("click", exportTemplate);
  document.getElementById("importFile").addEventListener("change", importTemplate);

  // Select de ejemplos
  document.getElementById("exampleSelect").addEventListener("change", (e) => {
    loadExample(e.target.value);
  });

  // Cargar historial
  renderHistory();

  // Primer render automático
  setTimeout(renderPreview, 500);
});
