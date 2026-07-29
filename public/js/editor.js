/* ═══════════════════════════════════════════
   Velocity Template Editor — CodeMirror Init
   ═══════════════════════════════════════════ */

// ─── Editor de template (Velocity syntax) ───
const templateEditor = CodeMirror.fromTextArea(
  document.getElementById("template"),
  {
    mode: "velocity",
    theme: "material-darker",
    lineNumbers: true,
    lineWrapping: true,
    matchBrackets: true,
    foldGutter: true,
    gutters: ["CodeMirror-foldgutter"],
    extraKeys: {
      "Ctrl-Enter": () => renderPreview(),
      "Cmd-Enter": () => renderPreview()
    }
  }
);

// ─── Editor de variables (JSON) ───
const varsEditor = CodeMirror.fromTextArea(
  document.getElementById("variables"),
  {
    mode: { name: "javascript", json: true },
    theme: "material-darker",
    lineNumbers: false,
    lineWrapping: true,
    extraKeys: {
      "Ctrl-Enter": () => renderPreview(),
      "Cmd-Enter": () => renderPreview()
    }
  }
);

// ─── Autocompletado personalizado para Velocity ───
CodeMirror.registerHelper("hint", "velocityVars", (cm) => {
  const cursor = cm.getCursor();
  const line = cm.getLine(cursor.line);
  const token = cm.getTokenAt(cursor);

  // Extraer nombres de variable desde el JSON de variables
  let vars = [];
  try {
    const json = JSON.parse(varsEditor.getValue() || "{}");

    function extractKeys(obj, prefix) {
      for (const key of Object.keys(obj)) {
        const path = prefix ? prefix + "." + key : key;
        vars.push("$" + path);
        if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
          extractKeys(obj[key], path);
        }
        if (Array.isArray(obj[key])) {
          vars.push("$" + path);
          vars.push("${" + path + ".size()}");
        }
      }
    }
    extractKeys(json, "");
  } catch (e) {
    // Si el JSON es inválido, ofrecer sugerencias genéricas
  }

  if (!vars.length) {
    vars = ["$variable", "${variable}", "$objeto.propiedad"];
  }

  // Filtrar por lo que el usuario escribió después de $
  const from = { line: cursor.line, ch: token.start };
  const to = { line: cursor.line, ch: token.end };
  const prefix = line.slice(token.start, cursor.ch);
  const list = vars.filter(v => v.includes(prefix)).slice(0, 20);

  return list.length ? { list, from, to } : null;
});

// Detectar escritura de $ para disparar autocompletado
templateEditor.on("inputRead", (cm, change) => {
  if (change.text && change.text[0] === "$") {
    CodeMirror.showHint(cm, CodeMirror.hint.velocityVars, {
      completeSingle: false
    });
  }
});

// ─── Live preview con debounce ───
let debounceTimer = null;

templateEditor.on("change", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(renderPreview, 800);
});

varsEditor.on("change", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(renderPreview, 800);
});

// ─── Refresh vars editor al abrir panel colapsable ───
document.getElementById("varsToggle").addEventListener("click", () => {
  const body = document.getElementById("varsBody");
  const arrow = document.getElementById("varsArrow");
  body.classList.toggle("open");
  arrow.classList.toggle("open");
  setTimeout(() => varsEditor.refresh(), 300);
});
