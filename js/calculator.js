(function () {
  "use strict";

  const expressionInput = document.getElementById("expression");
  const resultOutput = document.getElementById("result");
  const previousOutput = document.getElementById("previous-expression");
  const historyList = document.getElementById("history-list");
  const angleToggle = document.getElementById("angle-toggle");
  const angleLabel = document.getElementById("angle-label");
  const memoryIndicator = document.getElementById("memory-indicator");
  const appearanceToggle = document.getElementById("appearance-toggle");
  const appearancePanel = document.getElementById("appearance-panel");
  const appearancePreview = document.getElementById("appearance-preview");
  const colorInputs = Array.from(document.querySelectorAll("[data-color-setting]"));
  const resetAppearanceButton = document.getElementById("reset-appearance");
  const applyAppearanceButton = document.getElementById("apply-appearance");
  const toast = document.getElementById("toast");
  const shiftToggle = document.getElementById("shift-toggle");
  const appearanceProperties = {
    body: "--calculator-body",
    button: "--button-bg",
    buttonText: "--button-text",
    display: "--display-bg",
    displayText: "--display-text",
    operator: "--operator",
    accent: "--accent"
  };
  const THEME_PRESETS = {
    midnight: { body: "#111018", button: "#1b1924", buttonText: "#c5adfa", display: "#10162b", displayText: "#f0edff", operator: "#6442a9", accent: "#a98bfa" },
    ocean: { body: "#0d1822", button: "#142632", buttonText: "#88d8ff", display: "#081c2e", displayText: "#d9f4ff", operator: "#14628d", accent: "#42b8ee" },
    emerald: { body: "#101b17", button: "#172820", buttonText: "#8ce4bd", display: "#091e18", displayText: "#e1fff1", operator: "#17684a", accent: "#45d6a0" },
    crimson: { body: "#201116", button: "#301920", buttonText: "#ffadb8", display: "#251019", displayText: "#ffe8ec", operator: "#8d2940", accent: "#f06478" },
    silver: { body: "#24272d", button: "#30343c", buttonText: "#d7dce5", display: "#171b25", displayText: "#f3f5fb", operator: "#616b7b", accent: "#c1cad8" },
    black: { body: "#050506", button: "#101012", buttonText: "#ded8f2", display: "#050910", displayText: "#f4f1ff", operator: "#34205d", accent: "#a98bfa" }
  };
  const THEME_NAMES = {
    midnight: "Midnight Purple",
    ocean: "Ocean Blue",
    emerald: "Emerald Green",
    crimson: "Crimson Red",
    silver: "Silver and Black",
    black: "Pure Black",
    custom: "Custom Theme"
  };
  const DEFAULT_APPEARANCE = { theme: "midnight", colors: { ...THEME_PRESETS.midnight } };
  let answer = 0;
  let memory = null;
  let angleMode = "DEG";
  let justEvaluated = false;
  let shiftActive = false;
  let toastTimer;
  let appearance = { theme: DEFAULT_APPEARANCE.theme, colors: { ...DEFAULT_APPEARANCE.colors } };
  let draftAppearance = { theme: appearance.theme, colors: { ...appearance.colors } };
  let appearanceDirty = false;

  function format(value) {
    if (Object.is(value, -0)) return "0";
    if (Math.abs(value) >= 1e12 || (value !== 0 && Math.abs(value) < 1e-9)) {
      return value.toExponential(8).replace(/\.?0+e/, "e").replace("e+", "e");
    }
    return Number(value.toPrecision(12)).toString();
  }

  function evaluate() {
    try {
      const value = ScientificParser.parse(expressionInput.value, { angleMode });
      answer = value;
      window.calculatorAns = answer;
      const formatted = format(value);
      resultOutput.textContent = formatted;
      resultOutput.classList.remove("error");
      previousOutput.textContent = expressionInput.value + " =";
      CalculatorHistory.add(expressionInput.value, formatted);
      renderHistory();
      justEvaluated = true;
      return true;
    } catch (error) {
      resultOutput.textContent = errorMessage(error);
      resultOutput.classList.add("error");
      return false;
    }
  }

  function errorMessage(error) {
    return /divide by zero/i.test(error.message) ? "Math ERROR" : error.message;
  }

  function hasDecimalAtCaret(value, position) {
    const numberPattern = /(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d*)?/g;
    let match;
    while ((match = numberPattern.exec(value))) {
      const end = match.index + match[0].length;
      if (match[0].includes(".") && match.index <= position && position <= end) return true;
    }
    return false;
  }

  function insert(value) {
    const isContinuation = /^[+\-*/^!%)]/.test(value);
    let start = expressionInput.selectionStart;
    let end = expressionInput.selectionEnd;
    if (justEvaluated && !isContinuation && value !== "E") {
      expressionInput.value = "";
      start = 0;
      end = 0;
    }
    if (value === "." && hasDecimalAtCaret(expressionInput.value.slice(0, start) + expressionInput.value.slice(end), start)) return;
    justEvaluated = false;
    expressionInput.setRangeText(value, start, end, "end");
    updatePreview();
    expressionInput.focus();
  }

  function updatePreview() {
    if (!expressionInput.value.trim()) {
      resultOutput.textContent = "0";
      resultOutput.classList.remove("error");
      return;
    }
    try {
      const value = ScientificParser.parse(expressionInput.value, { angleMode });
      resultOutput.textContent = format(value);
      resultOutput.classList.remove("error");
    } catch (error) {
      resultOutput.textContent = errorMessage(error);
      resultOutput.classList.add("error");
    }
  }

  function clear() {
    expressionInput.value = "";
    previousOutput.textContent = "";
    justEvaluated = false;
    updatePreview();
    expressionInput.focus();
  }

  function applyToCurrentExpression(suffix, prefix) {
    const source = expressionInput.value.trim() || String(answer);
    expressionInput.value = prefix + source + suffix;
    justEvaluated = false;
    updatePreview();
    expressionInput.focus();
    expressionInput.setSelectionRange(expressionInput.value.length, expressionInput.value.length);
  }

  function insertFunction(name) {
    if (expressionInput.value.trim()) applyToCurrentExpression(")", name + "(");
    else insert(name + "(");
  }

  function updateShiftState() {
    shiftToggle.setAttribute("aria-pressed", String(shiftActive));
    document.querySelector(".calculator-card").classList.toggle("shift-active", shiftActive);
    document.querySelectorAll(".key-secondary[data-default]").forEach(label => {
      label.textContent = shiftActive && label.dataset.shift ? label.dataset.shift : label.dataset.default;
    });
  }

  function renderHistory() {
    const items = CalculatorHistory.read();
    historyList.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.innerHTML = '<span class="history-icon" aria-hidden="true">↺</span><p>Your calculations will<br>appear here.</p>';
      historyList.append(empty);
      return;
    }
    items.forEach(item => {
      const entry = document.createElement("button");
      entry.type = "button";
      entry.className = "history-item";
      entry.setAttribute("aria-label", item.expression + " equals " + item.result + ". Reuse result.");
      const source = document.createElement("div");
      source.className = "history-expression";
      source.textContent = item.expression;
      const output = document.createElement("div");
      output.className = "history-result";
      output.textContent = "= " + item.result;
      entry.append(source, output);
      entry.addEventListener("click", () => {
        expressionInput.value = item.result;
        justEvaluated = false;
        updatePreview();
        expressionInput.focus();
      });
      historyList.append(entry);
    });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 1800);
  }

  shiftToggle.addEventListener("click", () => {
    shiftActive = !shiftActive;
    updateShiftState();
  });

  document.querySelectorAll(".key[data-insert]").forEach(button => {
    button.addEventListener("click", () => {
      const value = shiftActive && button.dataset.shiftInsert
        ? button.dataset.shiftInsert
        : button.dataset.insert;
      if (shiftActive && button.dataset.shiftInsert) {
        shiftActive = false;
        updateShiftState();
      }
      const functionMatch = /^(sin|cos|tan|asin|acos|atan|log|ln|sqrt|cbrt|10\^|e\^)\($/.exec(value);
      if (functionMatch) insertFunction(functionMatch[1]);
      else insert(value);
    });
  });

  document.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", () => {
      if (shiftActive && button.dataset.shiftInsert) {
        shiftActive = false;
        updateShiftState();
        insert(button.dataset.shiftInsert);
        return;
      }
      const action = shiftActive && button.dataset.shiftAction
        ? button.dataset.shiftAction
        : button.dataset.action;
      if (shiftActive && button.dataset.shiftAction) {
        shiftActive = false;
        updateShiftState();
      }
      if (action === "equals") evaluate();
      else if (action === "clear") clear();
      else if (action === "delete") {
        const start = expressionInput.selectionStart;
        const end = expressionInput.selectionEnd;
        if (start !== end) expressionInput.setRangeText("", start, end, "end");
        else if (start > 0) expressionInput.setRangeText("", start - 1, start, "end");
        justEvaluated = false;
        updatePreview();
        expressionInput.focus();
      } else if (action === "square") {
        applyToCurrentExpression(")^2", "(");
      } else if (action === "cube") {
        applyToCurrentExpression(")^3", "(");
      } else if (action === "reciprocal") {
        applyToCurrentExpression(")", "1/(");
      } else if (action === "negate") {
        if (expressionInput.value.trim()) applyToCurrentExpression(")", "-(");
        else insert("-");
      } else if (action === "memory-clear") {
        memory = null;
        updateMemoryIndicator();
        showToast("Memory cleared");
      } else if (action === "memory-recall") {
        if (memory === null) showToast("Memory is empty");
        else insert(format(memory));
      } else if (action === "memory-add" || action === "memory-subtract") {
        try {
          const value = ScientificParser.parse(expressionInput.value || String(answer), { angleMode });
          memory = (memory || 0) + (action === "memory-add" ? value : -value);
          updateMemoryIndicator();
          showToast("Value saved to memory");
        } catch (error) {
          resultOutput.textContent = errorMessage(error);
          resultOutput.classList.add("error");
          showToast(error.message);
        }
      }
    });
  });

  function updateMemoryIndicator() {
    memoryIndicator.classList.toggle("active", memory !== null);
    memoryIndicator.setAttribute("aria-label", memory === null ? "Memory is empty" : "Memory contains " + format(memory));
  }

  angleToggle.addEventListener("click", () => {
    angleMode = angleMode === "DEG" ? "RAD" : "DEG";
    angleToggle.innerHTML = angleMode + ' <span aria-hidden="true">⌄</span>';
    angleLabel.textContent = angleMode;
    angleToggle.setAttribute("aria-label", "Angle mode is " + angleMode + ". Change angle mode");
    updatePreview();
  });

  function isHexColor(value) {
    return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  }

  function copyAppearance(source) {
    return { theme: source.theme, colors: { ...source.colors } };
  }

  function blendColors(first, second, amount) {
    const channel = (hex, offset) => parseInt(hex.slice(offset, offset + 2), 16);
    return "#" + [1, 3, 5].map(offset =>
      Math.round(channel(first, offset) * (1 - amount) + channel(second, offset) * amount)
        .toString(16).padStart(2, "0")
    ).join("");
  }

  function applyAppearancePreview() {
    const rootStyle = document.documentElement.style;
    Object.entries(appearanceProperties).forEach(([key, property]) => {
      rootStyle.setProperty(property, draftAppearance.colors[key]);
    });
    rootStyle.setProperty("--secondary", blendColors(draftAppearance.colors.accent, draftAppearance.colors.buttonText, .4));
    document.querySelectorAll("[data-preset]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.preset === draftAppearance.theme));
    });
    colorInputs.forEach(input => {
      input.value = draftAppearance.colors[input.dataset.colorSetting];
    });
    appearancePreview.textContent = appearanceDirty
      ? "Live preview — Apply to save, or close to discard"
      : "Previewing " + THEME_NAMES[draftAppearance.theme];
  }

  function saveAppearance() {
    try {
      localStorage.setItem("calculus-appearance", JSON.stringify(appearance));
      return true;
    } catch (error) {
      console.warn("Could not save appearance preference:", error);
      showToast("Could not save appearance settings");
      return false;
    }
  }

  function resetAppearanceDraft() {
    draftAppearance = copyAppearance(appearance);
    appearanceDirty = false;
    applyAppearancePreview();
  }

  appearanceToggle.addEventListener("click", () => {
    const opening = appearancePanel.hidden;
    if (opening) resetAppearanceDraft();
    appearancePanel.hidden = !opening;
    appearanceToggle.setAttribute("aria-expanded", String(opening));
  });

  document.querySelectorAll("[data-preset]").forEach(button => {
    button.addEventListener("click", () => {
      const preset = button.dataset.preset;
      if (preset !== "custom") draftAppearance.colors = { ...THEME_PRESETS[preset] };
      draftAppearance.theme = preset;
      appearanceDirty = true;
      applyAppearancePreview();
    });
  });

  colorInputs.forEach(input => {
    input.addEventListener("input", () => {
      draftAppearance.colors[input.dataset.colorSetting] = input.value;
      draftAppearance.theme = "custom";
      appearanceDirty = true;
      applyAppearancePreview();
    });
  });

  applyAppearanceButton.addEventListener("click", () => {
    appearance = copyAppearance(draftAppearance);
    appearanceDirty = false;
    applyAppearancePreview();
    appearancePreview.textContent = "Applied " + THEME_NAMES[appearance.theme];
    saveAppearance();
  });

  resetAppearanceButton.addEventListener("click", () => {
    appearance = copyAppearance(DEFAULT_APPEARANCE);
    draftAppearance = copyAppearance(DEFAULT_APPEARANCE);
    appearanceDirty = false;
    applyAppearancePreview();
    appearancePreview.textContent = "Reset to " + THEME_NAMES[appearance.theme];
    saveAppearance();
  });

  document.addEventListener("click", event => {
    if (!appearancePanel.hidden && !event.target.closest(".appearance-control")) {
      if (appearanceDirty) resetAppearanceDraft();
      appearancePanel.hidden = true;
      appearanceToggle.setAttribute("aria-expanded", "false");
    }
  });

  document.getElementById("clear-history").addEventListener("click", () => {
    CalculatorHistory.clear();
    renderHistory();
    showToast("History cleared");
  });

  document.getElementById("copy-result").addEventListener("click", async () => {
    const text = resultOutput.classList.contains("error") ? "" : resultOutput.textContent;
    if (!text || !expressionInput.value.trim()) {
      showToast("Nothing to copy yet");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast("Result copied");
    } catch (error) {
      const fallback = document.createElement("textarea");
      fallback.value = text;
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.append(fallback);
      fallback.select();
      const copied = document.execCommand("copy");
      fallback.remove();
      if (copied) showToast("Result copied");
      else showToast("Unable to copy result");
    }
  });

  expressionInput.addEventListener("input", () => { justEvaluated = false; updatePreview(); });
  expressionInput.addEventListener("keydown", event => {
    if (justEvaluated && /^[0-9.]$/.test(event.key)) {
      expressionInput.value = "";
      justEvaluated = false;
    }
    if (event.key === "." && hasDecimalAtCaret(
      expressionInput.value.slice(0, expressionInput.selectionStart) +
      expressionInput.value.slice(expressionInput.selectionEnd),
      expressionInput.selectionStart
    )) {
      event.preventDefault();
    } else if (event.key === "Enter" || event.key === "=") {
      event.preventDefault();
      evaluate();
    } else if (event.key === "Escape") clear();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !appearancePanel.hidden) {
      if (appearanceDirty) resetAppearanceDraft();
      appearancePanel.hidden = true;
      appearanceToggle.setAttribute("aria-expanded", "false");
      appearanceToggle.focus();
      return;
    }
    if (appearancePanel.contains(event.target) || event.target === appearanceToggle) return;
    if (event.target === expressionInput || event.ctrlKey || event.metaKey || event.altKey) return;
    if (/^[0-9.+\-*/^()%!]$/.test(event.key)) insert(event.key);
    else if (event.key === "Enter" || event.key === "=") { event.preventDefault(); evaluate(); }
    else if (event.key === "Backspace") {
      const length = expressionInput.value.length;
      expressionInput.setSelectionRange(length, length);
      expressionInput.setRangeText("", Math.max(0, length - 1), length, "end");
      updatePreview();
    } else if (event.key === "Escape") clear();
  });

  try {
    const savedAppearance = localStorage.getItem("calculus-appearance");
    if (savedAppearance) {
      const parsed = JSON.parse(savedAppearance);
      if (parsed && THEME_NAMES[parsed.theme] &&
          parsed.colors && Object.keys(appearanceProperties).every(key => isHexColor(parsed.colors[key]))) {
        appearance = { theme: parsed.theme, colors: { ...parsed.colors } };
      } else if (parsed && ["dark", "light", "custom"].includes(parsed.mode) &&
          isHexColor(parsed.accent) && isHexColor(parsed.background)) {
        const theme = parsed.mode === "light" ? "silver" : parsed.mode === "custom" ? "custom" : "midnight";
        const colors = { ...THEME_PRESETS[theme === "custom" ? "midnight" : theme] };
        colors.body = parsed.background;
        colors.accent = parsed.accent;
        colors.operator = parsed.accent;
        appearance = { theme, colors };
      } else {
        console.warn("Saved appearance preference is invalid; using defaults");
      }
    } else {
      const legacyTheme = localStorage.getItem("calculus-theme");
      if (legacyTheme === "light") {
        appearance = { theme: "silver", colors: { ...THEME_PRESETS.silver } };
      }
    }
  } catch (error) {
    console.warn("Could not read appearance preference:", error);
  }
  draftAppearance = copyAppearance(appearance);
  applyAppearancePreview();
  renderHistory();
  updateMemoryIndicator();
})();
