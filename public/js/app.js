/* ═══════════════════════════════════════════
   Velocity Template Editor — App principal
   ═══════════════════════════════════════════ */

let previewMode = "text";
let previewTheme = "dark";
let historyId = 0;
let currentTemplateName = "Sin título";
let autoDetectTimer = null;

// ─── Utils ───

function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
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

// ─── Collapsible panels ───

function setupCollapsible() {
  document.querySelectorAll("[data-panel]").forEach(btn => {
    btn.addEventListener("click", () => {
      const panelId = btn.dataset.panel;
      const body = document.getElementById(panelId);
      const arrow = btn.querySelector(".collapse-arrow");
      if (!body) return;
      const wasClosed = body.classList.contains("closed");
      body.classList.toggle("closed");
      if (arrow) arrow.classList.toggle("closed");
      // Refresh CodeMirror cuando se abre un panel
      if (wasClosed) {
        setTimeout(() => {
          if (panelId === "varsPanel") varsEditor.refresh();
          if (panelId === "templatePanel") templateEditor.refresh();
        }, 350);
      }
    });
  });
}

// ─── Preview tabs + theme + width ───

function switchPreview(mode) {
  previewMode = mode;
  document.querySelectorAll(".preview-tab").forEach(t =>
    t.classList.toggle("active", t.dataset.mode === mode)
  );
  document.getElementById("outputText").style.display = mode === "text" ? "block" : "none";
  document.getElementById("previewIframeWrapper").classList.toggle("visible", mode === "html");
}

function togglePreviewTheme() {
  previewTheme = previewTheme === "dark" ? "light" : "dark";
  const btn = document.getElementById("previewThemeBtn");
  btn.textContent = previewTheme === "dark" ? "🌙" : "☀️";

  const textEl = document.getElementById("outputText");
  const wrapper = document.getElementById("previewIframeWrapper");
  textEl.classList.toggle("light-theme", previewTheme === "light");
  wrapper.classList.toggle("light-theme", previewTheme === "light");

  // Aplicar tema al iframe (cambia fondo del contenedor + inyecta CSS)
  const iframe = document.getElementById("outputPreview");
  try {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    if (doc.body) {
      if (previewTheme === "light") {
        doc.body.style.background = "#ffffff";
        doc.body.style.color = "#1a1a2e";
      } else {
        doc.body.style.background = "#ffffff";
        doc.body.style.color = "#1a1a2e";
      }
    }
  } catch(e) {}
}

function setPreviewWidth(val) {
  document.getElementById("outputPreview").style.maxWidth = val;
}

// ─── HTML Validation ───

function validateHTML() {
  const panel = document.getElementById("validationPanel");
  const body = document.getElementById("validationBody");
  const title = document.getElementById("validationTitle");
  const output = document.getElementById("outputText").textContent;

  if (!output || output === "Presiona ▶ Render o Ctrl+Enter") {
    body.innerHTML = '<div class="validation-loading">⚠️ Renderiza primero</div>';
    panel.style.display = "flex";
    return;
  }

  // Solo validar si parece HTML
  if (!output.trim().startsWith("<")) {
    body.innerHTML = '<div class="validation-loading">ℹ️ El output no parece HTML, no se puede validar</div>';
    panel.style.display = "flex";
    return;
  }

  body.innerHTML = '<div class="validation-loading">🔍 Validando...</div>';
  panel.style.display = "flex";

  // Usar setTimeout para permitir que el DOM se actualice
  setTimeout(() => {
    try {
      if (typeof HTMLHint === "undefined") {
        body.innerHTML = '<div class="validation-loading">❌ HTMLHint no cargado (revisa conexión a CDN)</div>';
        return;
      }

      const rules = {
        "tagname-lowercase": true,
        "attr-lowercase": true,
        "attr-value-double-quotes": true,
        "spec-char-escape": true,
        "id-unique": true,
        "src-not-empty": true,
        "attr-no-duplication": true,
        "title-require": false,
        "doctype-first": false,
        "tag-pair": true,
        "empty-tag-not-self-closed": true,
        "href-abs-or-rel": false,
        "attr-unsafe-chars": true,
        "head-script-disabled": false
      };

      const results = HTMLHint.verify(output, rules);

      if (results.length === 0) {
        body.innerHTML = '<div class="validation-empty">✅ HTML válido — sin errores</div>';
        title.textContent = "🔍 Validación HTML — 0 errores";
        return;
      }

      const errors = results.filter(r => r.type === "error");
      const warnings = results.filter(r => r.type === "warning");
      title.textContent = `🔍 Validación — ${errors.length} errores, ${warnings.length} advertencias`;

      body.innerHTML = results.map(r => {
        const typeClass = r.type === "error" ? "error" : "warning";
        return '<div class="validation-issue">' +
          '<span class="v-type ' + typeClass + '">' + r.type + '</span>' +
          '<span class="v-msg">' + escHtml(r.message) + '</span>' +
          '<span class="v-line">L:' + r.line + ' C:' + r.col + '</span>' +
          '</div>';
      }).join("");

    } catch (e) {
      body.innerHTML = '<div class="validation-loading">❌ Error al validar: ' + escHtml(e.message) + '</div>';
    }
  }, 100);
}

// ─── Auto-detect variables from template ───

function detectVariablesFromTemplate(template) {
  // Regex para encontrar variables Velocity
  const varRegex = /\$\{?([a-zA-Z_][a-zA-Z0-9_.]*)\}?/g;
  // Directivas Velocity a ignorar
  const directives = new Set([
    "foreach","if","else","elseif","end","set","parse","include","macro","stop",
    "evaluate","define","literal","noescape"
  ]);

  const found = {};

  let match;
  while ((match = varRegex.exec(template)) !== null) {
    const fullPath = match[1];

    // Ignorar directivas
    const firstPart = fullPath.split(/[.\[]/)[0];
    if (directives.has(firstPart)) continue;
    // Ignorar llamadas a métodos: .size(), .get(), etc
    if (fullPath.endsWith(")") || fullPath.endsWith(")")) {
      const parenIdx = fullPath.indexOf("(");
      if (parenIdx > 0) {
        const cleanPath = fullPath.substring(0, parenIdx);
        found[cleanPath] = { path: cleanPath, type: "method" };
      }
      continue;
    }

    found[fullPath] = { path: fullPath, type: "var" };
  }

  return Object.keys(found).map(k => found[k].path);
}

function buildDefaultJson(variablePaths, existingJson) {
  const result = {};

  function ensurePath(obj, pathParts, idx, existingVal) {
    if (idx >= pathParts.length) return;
    const key = pathParts[idx];
    const isLast = idx === pathParts.length - 1;

    if (isLast) {
      // Si ya existe un valor en el JSON, conservarlo
      if (existingVal !== undefined && existingVal !== null) {
        obj[key] = existingVal;
      } else {
        obj[key] = "No Definido";
      }
    } else {
      if (!obj[key] || typeof obj[key] !== "object" || Array.isArray(obj[key])) {
        obj[key] = {};
      }
      const nextVal = existingVal && typeof existingVal === "object" ? existingVal[key] : undefined;
      ensurePath(obj[key], pathParts, idx + 1, nextVal);
    }
  }

  for (const varPath of variablePaths) {
    const parts = varPath.split(".");
    const existingVal = getNestedValue(existingJson, parts);
    ensurePath(result, parts, 0, existingVal);
  }

  return result;
}

function getNestedValue(obj, pathParts) {
  let current = obj;
  for (const p of pathParts) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = current[p];
  }
  return current;
}

function updateVariablesFromTemplate() {
  const template = templateEditor.getValue();
  const varsText = varsEditor.getValue();
  let existingJson = {};

  try { existingJson = JSON.parse(varsText || "{}"); } catch(e) {}

  const varPaths = detectVariablesFromTemplate(template);

  if (varPaths.length === 0) return;

  // Opción 4: SOLO agregar, NUNCA borrar variables existentes
  // 1. Construir JSON solo con las variables del template
  const templateJson = buildDefaultJson(varPaths, existingJson);

  // 2. Fusionar con las variables existentes (las del template tienen prioridad,
  //    pero las extras que el usuario agregó a mano se conservan)
  function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
      if (typeof source[key] === "object" && source[key] !== null && !Array.isArray(source[key])) {
        if (!target[key] || typeof target[key] !== "object") target[key] = {};
        deepMerge(target[key], source[key]);
      } else {
        // Solo sobrescribir si la variable existe en el template
        // Si el usuario la agregó manualmente y no está en template, conservarla
        target[key] = source[key];
      }
    }
  }

  // Comenzar con el JSON existente y pisar con lo del template
  const merged = JSON.parse(JSON.stringify(existingJson));
  deepMerge(merged, templateJson);

  // También agregar variables del template que no existían
  for (const key of Object.keys(templateJson)) {
    if (!(key in merged)) {
      merged[key] = templateJson[key];
    }
  }

  // Detectar variables extras (están en JSON pero no en template)
  const templatePaths = new Set(varPaths);
  const extraVars = [];
  function findExtras(obj, prefix) {
    for (const k of Object.keys(obj)) {
      const path = prefix ? prefix + "." + k : k;
      if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
        findExtras(obj[k], path);
      } else if (!templatePaths.has(path) && path !== "") {
        extraVars.push(path);
      }
    }
  }
  findExtras(merged, "");

  // Contar undefined
  let undefinedCount = 0;
  function countUndefined(obj) {
    for (const k of Object.keys(obj)) {
      if (obj[k] === "No Definido") undefinedCount++;
      else if (typeof obj[k] === "object" && obj[k] !== null) countUndefined(obj[k]);
    }
  }
  countUndefined(merged);

  // Actualizar JSON
  varsEditor.setValue(JSON.stringify(merged, null, 2));

  // Badge de variables totales
  let totalCount = 0;
  function countAll(obj) {
    for (const k of Object.keys(obj)) {
      if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
        countAll(obj[k]);
      }
      totalCount++;
    }
  }
  countAll(merged);
  document.getElementById("varCount").textContent = `${totalCount} vars`;

  const badge = document.getElementById("varSyncBadge");
  const parts = [];
  if (undefinedCount > 0) parts.push(`⚠ ${undefinedCount} sin valor`);
  if (extraVars.length > 0) parts.push(`+${extraVars.length} extra`);
  if (parts.length > 0) {
    badge.style.display = "inline";
    badge.textContent = parts.join(" ");
  } else {
    badge.style.display = "none";
  }

  // Actualizar árbol (NO la tabla - para no perder foco)
  buildVarTree();
}

// ─── Variable Table ───

function flattenVars(obj, prefix) {
  const result = [];
  for (const key of Object.keys(obj)) {
    const path = prefix ? prefix + "." + key : key;
    const val = obj[key];
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      result.push(...flattenVars(val, path));
    } else {
      result.push({ path, key, value: val });
    }
  }
  return result;
}

function buildVarTable() {
  const container = document.getElementById("varTableContainer");
  try {
    const vars = JSON.parse(varsEditor.getValue() || "{}");
    const flat = flattenVars(vars, "");

    if (flat.length === 0) {
      container.innerHTML = '<div class="history-empty">No hay variables definidas.</div>';
      return;
    }

    let html = '<table class="var-table"><thead><tr>' +
      '<th style="width:30px;"></th>' +
      '<th>Variable</th>' +
      '<th>Valor</th>' +
      '<th>Tipo</th>' +
      '</tr></thead><tbody>';

    for (const item of flat) {
      const isUndefined = item.value === "No Definido" || item.value === undefined || item.value === null;
      const typeStr = item.value === "No Definido" ? "⚠ Sin valor"
        : typeof item.value === "number" ? "number"
        : typeof item.value === "boolean" ? "boolean"
        : Array.isArray(item.value) ? "array[" + item.value.length + "]"
        : "string";

      const displayVal = isUndefined ? "" : String(item.value);
      html += '<tr>' +
        '<td><span class="vt-status ' + (isUndefined ? "undefined" : "defined") + '"></span></td>' +
        '<td class="vt-key-cell">' + escHtml(item.path) + '</td>' +
        '<td class="vt-value-cell">' +
        '<input type="text" class="var-input ' + (isUndefined ? "undefined" : "") + '" ' +
        'data-path="' + escHtml(item.path) + '" ' +
        'value="' + escHtml(displayVal) + '" ' +
        'placeholder="' + (isUndefined ? "No Definido — escribe un valor" : "") + '">' +
        '</td>' +
        '<td class="vt-type-cell">' + typeStr + '</td>' +
        '</tr>';
    }

    html += '</tbody></table>';
    container.innerHTML = html;

    // Bind inputs to sync with JSON editor
    container.querySelectorAll(".var-input").forEach(input => {
      input.addEventListener("input", () => {
        syncTableToJson(input.dataset.path, input.value);
      });
      input.addEventListener("blur", () => {
        input.classList.remove("undefined");
        input.placeholder = "";
      });
    });

  } catch (e) {
    container.innerHTML = '<div class="history-empty">JSON inválido</div>';
  }
}

function syncTableToJson(path, value) {
  try {
    const vars = JSON.parse(varsEditor.getValue() || "{}");
    const parts = path.split(".");
    let current = vars;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]] || typeof current[parts[i]] !== "object") {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    const lastKey = parts[parts.length - 1];
    // Intentar convertir a número o booleano
    if (value === "") {
      current[lastKey] = "No Definido";
    } else if (value.toLowerCase() === "true") {
      current[lastKey] = true;
    } else if (value.toLowerCase() === "false") {
      current[lastKey] = false;
    } else if (!isNaN(value) && value.trim() !== "") {
      current[lastKey] = Number(value);
    } else {
      current[lastKey] = value;
    }

    varsEditor.setValue(JSON.stringify(vars, null, 2));
    setStatus("↻ Tabla → JSON", "ok");

    // Actualizar badge
    updateVarBadge(vars);
  } catch(e) {}
}

function updateVarBadge(vars) {
  let count = 0, undef = 0;
  function walk(obj) {
    for (const k of Object.keys(obj)) {
      if (obj[k] === "No Definido" || obj[k] === undefined || obj[k] === null) undef++;
      else if (typeof obj[k] === "object" && obj[k] !== null) walk(obj[k]);
      count++;
    }
  }
  if (typeof vars === "object") walk(vars);
  document.getElementById("varCount").textContent = `${count} vars`;
  const badge = document.getElementById("varSyncBadge");
  if (undef > 0) {
    badge.style.display = "inline";
    badge.textContent = `⚠ ${undef} sin valor`;
  } else {
    badge.style.display = "none";
  }
}

// ─── Variable Tree ───

function buildVarTree() {
  const container = document.getElementById("varTreeContainer");
  try {
    const vars = JSON.parse(varsEditor.getValue() || "{}");
    if (Object.keys(vars).length === 0) {
      container.innerHTML = '<div class="history-empty">No hay variables definidas.</div>';
      return;
    }
    container.innerHTML = renderTree(vars, "");
  } catch(e) {
    container.innerHTML = '<div class="history-empty">JSON inválido</div>';
  }
}

function renderTree(obj, path) {
  let html = '<div class="var-tree-children open">';
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      html += '<div class="var-tree-item">' +
        '<span class="vt-toggle" data-toggle="tree">▾</span>' +
        '<span class="vt-key">' + escHtml(key) + '</span></div>';
      html += renderTree(val, path ? path + "." + key : key);
    } else {
      const isUndef = val === "No Definido";
      const display = typeof val === "string" ? '"' + escHtml(val) + '"' : escHtml(String(val));
      html += '<div class="var-tree-item">' +
        '<span class="vt-toggle" style="opacity:0;">▸</span>' +
        '<span class="vt-key">' + escHtml(key) + '</span>' +
        '<span style="color:var(--text3);margin:0 4px;">:</span>' +
        '<span class="' + (isUndef ? "vt-str" : (typeof val === "string" ? "vt-str" : "vt-val")) +
        '" style="' + (isUndef ? "color:var(--orange);font-style:italic;" : "") + '">' +
        display + '</span></div>';
    }
  }
  html += '</div>';
  return html;
}

// ═══════════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════════

async function renderPreview() {
  const template = templateEditor.getValue();
  const variablesRaw = varsEditor.getValue();
  const outputText = document.getElementById("outputText");
  const outputPreview = document.getElementById("outputPreview");
  const wrapper = document.getElementById("previewIframeWrapper");

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
      outputText.textContent = result.output;
      outputText.className = "preview-body";
      if (previewTheme === "light") outputText.classList.add("light-theme");

      // Iframe
      const doc = outputPreview.contentDocument || outputPreview.contentWindow.document;
      doc.open();
      doc.write(result.output);
      doc.close();
      wrapper.classList.add("visible");

      // Auto-switch a HTML si es necesario
      const trimmed = result.output.trim();
      if ((trimmed.startsWith("<") || trimmed.startsWith("<html")) && previewMode === "text") {
        switchPreview("html");
      }

      setStatus("✅ OK");
      saveToHistory(template, variables, result.output);
    } else {
      outputText.textContent = "❌ " + (result.error || "Error");
      outputText.className = "preview-body error";
      setStatus("Error", "err");
      highlightMissingVars(template, variables, result.error);
    }
  } catch (e) {
    outputText.textContent = "❌ Error de conexión: " + e.message;
    outputText.className = "preview-body error";
    setStatus("Offline", "err");
  }
}

// ─── Error highlighting ───

function highlightMissingVars(template, variables, errorMsg) {
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
  templateEditor.doc.getAllMarks().forEach(m => m.clear());
}

// ─── History ───

function saveToHistory(template, variables, output) {
  const history = JSON.parse(localStorage.getItem("vm_history") || "[]");
  history.unshift({
    id: ++historyId, name: currentTemplateName,
    template, variables, output,
    date: new Date().toISOString()
  });
  if (history.length > 20) history.pop();
  localStorage.setItem("vm_history", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById("historyList");
  const history = JSON.parse(localStorage.getItem("vm_history") || "[]");
  if (!history.length) {
    list.innerHTML = '<div class="history-empty">Sin historial aún. Los templates se guardan al renderizar.</div>';
    return;
  }
  list.innerHTML = history.map(h => {
    const d = new Date(h.date);
    const time = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    const day = d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    return '<div class="history-item" data-id="' + h.id + '">' +
      '<span class="h-name">' + escHtml(h.name || "Sin título") + '</span>' +
      '<span class="h-date">' + day + " " + time + '</span>' +
      '<span class="h-del" data-action="delete">✕</span></div>';
  }).join("");
}

document.getElementById("historyList").addEventListener("click", (e) => {
  const item = e.target.closest(".history-item");
  if (!item) return;
  const id = parseInt(item.dataset.id);
  if (e.target.dataset.action === "delete") { deleteHistory(id); return; }
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

// ─── Examples ───

function loadExample(key) {
  if (!key || !EXAMPLES[key]) return;
  const ex = EXAMPLES[key];
  templateEditor.setValue(ex.template);
  varsEditor.setValue(JSON.stringify(ex.vars, null, 2));
  currentTemplateName = ex.name;
  setStatus("✅ " + ex.name + " cargado");
  renderPreview();
}

// ─── Export / Import ───

function exportTemplate() {
  const t = templateEditor.getValue();
  const v = varsEditor.getValue();
  const blob = new Blob([t + "\n\n<!-- VARIABLES:\n" + v + "\n-->"], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "template.vm";
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("⬇️ Exportado como template.vm");
}

function importTemplate(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    let content = e.target.result;
    const vm = content.match(/<!-- VARIABLES:\n([\s\S]*?)-->/);
    if (vm) {
      templateEditor.setValue(content.replace(/<!-- VARIABLES:[\s\S]*?-->/, "").trim());
      try { varsEditor.setValue(JSON.stringify(JSON.parse(vm[1]), null, 2)); } catch(_) { varsEditor.setValue(vm[1]); }
    } else {
      templateEditor.setValue(content);
    }
    showToast("⬆️ Importado");
    setTimeout(renderPreview, 300);
  };
  reader.readAsText(file);
  event.target.value = "";
}

// ─── Clear ───

function clearAll() {
  templateEditor.setValue("");
  varsEditor.setValue("{}");
  document.getElementById("outputText").textContent = "Esperando...";
  document.getElementById("outputText").className = "preview-body";
  const doc = document.getElementById("outputPreview").contentDocument || document.getElementById("outputPreview").contentWindow.document;
  doc.open(); doc.write(""); doc.close();
  setStatus("Listo");
  document.getElementById("exampleSelect").value = "";
  clearHighlights();
  document.getElementById("varCount").textContent = "0 vars";
  document.getElementById("varSyncBadge").style.display = "none";
  document.getElementById("varTableContainer").innerHTML = '<div class="history-empty">Sin variables.</div>';
  document.getElementById("varTreeContainer").innerHTML = '<div class="history-empty">Sin variables.</div>';
}

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {

  setupCollapsible();

  // Preview tabs
  document.querySelectorAll(".preview-tab").forEach(tab =>
    tab.addEventListener("click", () => switchPreview(tab.dataset.mode))
  );

  // Variables tabs
  document.querySelectorAll("[data-vars-tab]").forEach(tab =>
    tab.addEventListener("click", () => {
      document.querySelectorAll("[data-vars-tab]").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".vars-tab-content").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("varsTab" + tab.dataset.varsTab.charAt(0).toUpperCase() + tab.dataset.varsTab.slice(1)).classList.add("active");
      if (tab.dataset.varsTab === "table") buildVarTable();
      if (tab.dataset.varsTab === "tree") buildVarTree();
    })
  );

  // Bottom tabs
  document.querySelectorAll(".bottom-tab").forEach(tab =>
    tab.addEventListener("click", () => {
      document.querySelectorAll(".bottom-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".bottom-tab-content").forEach(c => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("panel-" + tab.dataset.tab).classList.add("active");
    })
  );

  // Buttons
  document.getElementById("btnRender").addEventListener("click", renderPreview);
  document.getElementById("btnClear").addEventListener("click", clearAll);
  document.getElementById("btnExport").addEventListener("click", exportTemplate);
  document.getElementById("importFile").addEventListener("change", importTemplate);
  document.getElementById("previewThemeBtn").addEventListener("click", togglePreviewTheme);
  document.getElementById("previewWidth").addEventListener("change", (e) => setPreviewWidth(e.target.value));
  document.getElementById("btnValidate").addEventListener("click", validateHTML);
  document.getElementById("validationClose").addEventListener("click", () => {
    document.getElementById("validationPanel").style.display = "none";
  });

  // Examples
  document.getElementById("exampleSelect").addEventListener("change", (e) => loadExample(e.target.value));

  // Auto-detect variables: watch template changes
  templateEditor.on("change", () => {
    clearTimeout(autoDetectTimer);
    autoDetectTimer = setTimeout(updateVariablesFromTemplate, 1200);
  });

  // Sync JSON editor → actualizar badge y árbol (NO la tabla, para no perder foco)
  varsEditor.on("change", () => {
    try {
      const vars = JSON.parse(varsEditor.getValue() || "{}");
      updateVarBadge(vars);
      if (document.querySelector('[data-vars-tab="tree"]').classList.contains("active")) {
        buildVarTree();
      }
    } catch(e) {}
  });

  // Variable tree toggle
  document.getElementById("varTreeContainer").addEventListener("click", (e) => {
    const toggle = e.target.closest('[data-toggle="tree"]');
    if (!toggle) return;
    const children = toggle.parentElement.nextElementSibling;
    if (children && children.classList.contains("var-tree-children")) {
      children.classList.toggle("open");
      toggle.textContent = children.classList.contains("open") ? "▾" : "▸";
    }
  });

  // Init
  renderHistory();
  setTimeout(renderPreview, 500);
});
