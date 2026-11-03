(function (root) {
  "use strict";

  const STORAGE_KEY = "calculus-history";
  const MAX_ITEMS = 30;

  function read() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(saved) ? saved.filter(item => item && typeof item.expression === "string" && typeof item.result === "string").slice(0, MAX_ITEMS) : [];
    } catch (error) {
      console.warn("Could not read calculator history:", error);
      return [];
    }
  }

  function write(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
    } catch (error) {
      console.warn("Could not save calculator history:", error);
    }
  }

  function add(expression, result) {
    const items = read();
    items.unshift({ expression, result, timestamp: Date.now() });
    write(items);
    return items;
  }

  function clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Could not clear calculator history:", error);
    }
  }

  root.CalculatorHistory = { read, add, clear };
})(typeof globalThis !== "undefined" ? globalThis : this);
