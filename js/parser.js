(function (root) {
  "use strict";

  const FUNCTIONS = new Set([
    "sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh",
    "log", "ln", "sqrt", "cbrt", "abs", "exp"
  ]);
  const CONSTANTS = { pi: Math.PI, e: Math.E };

  function tokenize(source) {
    const tokens = [];
    let index = 0;
    while (index < source.length) {
      const rest = source.slice(index);
      const whitespace = /^\s+/.exec(rest);
      if (whitespace) { index += whitespace[0].length; continue; }

      const number = /^(?:(?:\d+\.?\d*)|(?:\.\d+))(?:e[+-]?\d+)?/i.exec(rest);
      if (number) {
        const value = Number(number[0]);
        if (!Number.isFinite(value)) throw new Error("Number is out of range");
        tokens.push({ type: "number", value });
        index += number[0].length;
        continue;
      }

      const word = /^[a-z]+/i.exec(rest);
      if (word) {
        const name = word[0].toLowerCase();
        if (name === "ans") tokens.push({ type: "number", value: Number(root.calculatorAns || 0) });
        else if (Object.prototype.hasOwnProperty.call(CONSTANTS, name)) tokens.push({ type: "number", value: CONSTANTS[name] });
        else if (FUNCTIONS.has(name)) tokens.push({ type: "function", value: name });
        else throw new Error("Unknown function or constant: " + word[0]);
        index += word[0].length;
        continue;
      }

      const character = source[index];
      if ("+-*/^!%()".includes(character)) {
        tokens.push({ type: "operator", value: character });
        index++;
        continue;
      }
      throw new Error("Invalid character: " + character);
    }

    // Implicit multiplication supports forms such as 2π, 2(3+4), and (2)(3).
    const expanded = [];
    const endsValue = token => token && (token.type === "number" || token.value === ")" || token.value === "!" || token.value === "%");
    const startsValue = token => token && (token.type === "number" || token.type === "function" || token.value === "(");
    for (const token of tokens) {
      const previous = expanded[expanded.length - 1];
      if (endsValue(previous) && startsValue(token)) expanded.push({ type: "operator", value: "*" });
      expanded.push(token);
    }
    return expanded;
  }

  function parse(expression, options) {
    if (!expression.trim()) throw new Error("Enter an expression");
    const tokens = tokenize(expression);
    let position = 0;
    const degrees = options && options.angleMode === "DEG";
    const peek = () => tokens[position];
    const take = () => tokens[position++];
    const expect = value => {
      const token = take();
      if (!token || token.value !== value) throw new Error("Expected " + value);
    };

    function expressionNode() {
      let value = term();
      while (peek() && (peek().value === "+" || peek().value === "-")) {
        const operator = take().value;
        const right = term();
        value = operator === "+" ? value + right : value - right;
      }
      return value;
    }

    function term() {
      let value = unary();
      while (peek() && (peek().value === "*" || peek().value === "/")) {
        const operator = take().value;
        const right = unary();
        if (operator === "/" && right === 0) throw new Error("Cannot divide by zero");
        value = operator === "*" ? value * right : value / right;
      }
      return value;
    }

    function unary() {
      if (peek() && (peek().value === "+" || peek().value === "-")) {
        const operator = take().value;
        const value = unary();
        return operator === "-" ? -value : value;
      }
      return power();
    }

    function power() {
      let value = postfix();
      if (peek() && peek().value === "^") {
        take();
        value = Math.pow(value, unary());
      }
      return value;
    }

    function postfix() {
      let value = primary();
      while (peek() && (peek().value === "!" || peek().value === "%")) {
        const operator = take().value;
        if (operator === "%") value /= 100;
        else {
          if (value < 0 || !Number.isInteger(value)) throw new Error("Factorial requires a non-negative integer");
          if (value > 170) throw new Error("Factorial is too large");
          let factorial = 1;
          for (let number = 2; number <= value; number++) factorial *= number;
          value = factorial;
        }
      }
      return value;
    }

    function primary() {
      const token = take();
      if (!token) throw new Error("Incomplete expression");
      if (token.type === "number") return token.value;
      if (token.type === "function") {
        expect("(");
        const argument = expressionNode();
        expect(")");
        return applyFunction(token.value, argument, degrees);
      }
      if (token.value === "(") {
        const value = expressionNode();
        expect(")");
        return value;
      }
      throw new Error("Expected a number or parenthesis");
    }

    const result = expressionNode();
    if (position < tokens.length) throw new Error("Unexpected input");
    if (!Number.isFinite(result)) throw new Error("Result is outside the supported range");
    return result;
  }

  function applyFunction(name, value, degrees) {
    const toRadians = number => degrees ? number * Math.PI / 180 : number;
    const fromRadians = number => degrees ? number * 180 / Math.PI : number;
    switch (name) {
      case "sin": return Math.sin(toRadians(value));
      case "cos": return Math.cos(toRadians(value));
      case "tan":
        if (Math.abs(Math.cos(toRadians(value))) < 1e-14) throw new Error("Tangent is undefined at this angle");
        return Math.tan(toRadians(value));
      case "asin": return fromRadians(Math.asin(value));
      case "acos": return fromRadians(Math.acos(value));
      case "atan": return fromRadians(Math.atan(value));
      case "sinh": return Math.sinh(value);
      case "cosh": return Math.cosh(value);
      case "tanh": return Math.tanh(value);
      case "log":
        if (value <= 0) throw new Error("Logarithm requires a positive number");
        return Math.log10(value);
      case "ln":
        if (value <= 0) throw new Error("Logarithm requires a positive number");
        return Math.log(value);
      case "sqrt":
        if (value < 0) throw new Error("Square root requires a non-negative number");
        return Math.sqrt(value);
      case "cbrt": return Math.cbrt(value);
      case "abs": return Math.abs(value);
      case "exp": return Math.exp(value);
      default: throw new Error("Unsupported function");
    }
  }

  const api = { parse };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.ScientificParser = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
