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
  const customColors = document.getElementById("custom-colors");
  const accentColor = document.getElementById("accent-color");
  const backgroundColor = document.getElementById("background-color");
  const toast = document.getElementById("toast");
  const appearanceProperties = [
    "--page", "--card", "--card-raised", "--display", "--line", "--text",
    "--muted", "--subtle", "--accent", "--accent-strong", "--accent-soft",
    "--green", "--danger", "--shadow", "--function-key", "--number-key",
    "--key-hover"
  ];
  let answer = 0;
  let memory = null;
  let angleMode = "DEG";
  let justEvaluated = false;
  let toastTimer;
  let appearance = { mode: "dark", accent: "#9c8cff", background: "#10131b", customized: false };

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
      resultOutput.textContent = error.message;
      resultOutput.classList.add("error");
      return false;
    }
  }

  function insert(value) {
    const isContinuation = /^[+\-*/^!%)]/.test(value);
    let start = expressionInput.selectionStart;
    let end = expressionInput.selectionEnd;
    if (justEvaluated && !isContinuation && value !== "." && value !== "E") {
      expressionInput.value = "";
      start = 0;
      end = 0;
    }
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
      resultOutput.textContent = error.message;
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

  document.querySelectorAll("[data-insert]").forEach(button => {
    button.addEventListener("click", () => insert(button.dataset.insert));
  });

  document.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
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
          resultOutput.textContent = error.message;
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

  memoryIndicator.addEventListener("click", () => {
    if (memory !== null) {
      insert(format(memory));
      showToast("Memory recalled");
    } else showToast("Memory is empty");
  });

  angleToggle.addEventListener("click", () => {
    angleMode = angleMode === "DEG" ? "RAD" : "DEG";
    angleToggle.innerHTML = angleMode + ' <span aria-hidden="true">⌄</span>';
    angleLabel.textContent = angleMode;
    angleToggle.setAttribute("aria-label", "Angle mode is " + angleMode + ". Change angle mode");
    updatePreview();
  });

  function hexToRgb(hex) {
    const match = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!match) throw new Error("Invalid appearance color");
    const value = match[1];
    return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
  }

  function mixColors(first, second, amount) {
    const a = hexToRgb(first);
    const b = hexToRgb(second);
    return "#" + a.map((channel, index) => Math.round(channel * (1 - amount) + b[index] * amount).toString(16).padStart(2, "0")).join("");
  }

  function luminance(hex) {
    return hexToRgb(hex).map(channel => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    }).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  }

  function applyAppearance() {
    const isCustom = appearance.mode === "custom";
    const isLight = appearance.mode === "light";
    document.body.classList.toggle("light-theme", isLight);
    document.body.classList.toggle("custom-theme", isCustom);
    customColors.hidden = !isCustom;
    document.querySelectorAll("[data-theme-mode]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.themeMode === appearance.mode));
    });

    appearanceProperties.forEach(property => document.body.style.removeProperty(property));
    if (isCustom) {
      const background = appearance.background;
      const light = luminance(background) > 0.45;
      const foreground = light ? "#202638" : "#f2f4fa";
      const opposite = light ? "#000000" : "#ffffff";
      document.body.style.colorScheme = light ? "light" : "dark";
      document.body.style.setProperty("--page", background);
      const card = mixColors(background, opposite, light ? 0.035 : 0.075);
      document.body.style.setProperty("--card", card);
      document.body.style.setProperty("--card-raised", mixColors(background, opposite, light ? 0.065 : 0.12));
      document.body.style.setProperty("--display", mixColors(background, opposite, light ? 0.018 : 0.045));
      document.body.style.setProperty("--line", mixColors(background, foreground, 0.17));
      document.body.style.setProperty("--text", foreground);
      document.body.style.setProperty("--muted", mixColors(foreground, background, 0.43));
      document.body.style.setProperty("--subtle", mixColors(foreground, background, 0.64));
      document.body.style.setProperty("--accent", appearance.accent);
      document.body.style.setProperty("--accent-strong", appearance.accent);
      document.body.style.setProperty("--accent-soft", "rgba(" + hexToRgb(appearance.accent).join(", ") + ", .14)");
      document.body.style.setProperty("--green", light ? "#16815f" : "#70d7b1");
      document.body.style.setProperty("--danger", light ? "#c53e55" : "#ff8290");
      document.body.style.setProperty("--shadow", light ? "0 22px 60px rgba(42, 48, 76, .12)" : "0 28px 80px rgba(0, 0, 0, .28)");
      document.body.style.setProperty("--function-key", mixColors(card, foreground, light ? 0.04 : 0.09));
      document.body.style.setProperty("--number-key", mixColors(card, foreground, light ? 0.08 : 0.13));
      document.body.style.setProperty("--key-hover", mixColors(card, foreground, light ? 0.14 : 0.21));
    } else {
      document.body.style.removeProperty("color-scheme");
    }
  }

  function saveAppearance() {
    try {
      localStorage.setItem("calculus-appearance", JSON.stringify(appearance));
    } catch (error) {
      console.warn("Could not save appearance preference:", error);
    }
  }

  appearanceToggle.addEventListener("click", () => {
    const opening = appearancePanel.hidden;
    appearancePanel.hidden = !opening;
    appearanceToggle.setAttribute("aria-expanded", String(opening));
  });

  document.querySelectorAll("[data-theme-mode]").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.themeMode === "custom" && !appearance.customized) {
        if (appearance.mode === "light") {
          appearance.accent = "#735ee8";
          appearance.background = "#f1f3f9";
        } else {
          appearance.accent = "#9c8cff";
          appearance.background = "#10131b";
        }
        accentColor.value = appearance.accent;
        backgroundColor.value = appearance.background;
        appearance.customized = true;
      }
      appearance.mode = button.dataset.themeMode;
      applyAppearance();
      saveAppearance();
    });
  });

  function updateCustomColor(input, property) {
    appearance[property] = input.value;
    appearance.customized = true;
    if (appearance.mode !== "custom") {
      appearance.mode = "custom";
    }
    applyAppearance();
    saveAppearance();
  }

  accentColor.addEventListener("input", () => updateCustomColor(accentColor, "accent"));
  backgroundColor.addEventListener("input", () => updateCustomColor(backgroundColor, "background"));

  document.addEventListener("click", event => {
    if (!appearancePanel.hidden && !event.target.closest(".appearance-control")) {
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
    if (event.key === "Enter" || event.key === "=") {
      event.preventDefault();
      evaluate();
    } else if (event.key === "Escape") clear();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !appearancePanel.hidden) {
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
      if (parsed && ["dark", "light", "custom"].includes(parsed.mode) &&
          /^#[0-9a-f]{6}$/i.test(parsed.accent) &&
          /^#[0-9a-f]{6}$/i.test(parsed.background)) {
        appearance = { ...appearance, ...parsed, customized: parsed.customized === true || parsed.mode === "custom" };
      } else {
        console.warn("Saved appearance preference is invalid; using defaults");
      }
    } else {
      const legacyTheme = localStorage.getItem("calculus-theme");
      if (legacyTheme === "light") appearance.mode = "light";
    }
  } catch (error) {
    console.warn("Could not read appearance preference:", error);
  }
  accentColor.value = appearance.accent;
  backgroundColor.value = appearance.background;
  applyAppearance();
  renderHistory();
  updateMemoryIndicator();
})();
