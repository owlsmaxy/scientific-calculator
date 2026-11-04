# MAXWELL Scientific Calculator

A compact MAXWELL scientific calculator built with HTML, CSS, and vanilla JavaScript. It uses a safe recursive-descent expression parser rather than `eval()`.

## Run in VS Code

1. Open this folder in VS Code (`File` → `Open Folder...`).
2. Open `index.html` in a browser. You can also use VS Code's Live Server extension and choose **Open with Live Server**.
3. Use the on-screen keys or type an expression, then press **Enter** or **=**.

No build step or package installation is required. If opening the file directly, clipboard access may be restricted by the browser; using Live Server enables the secure clipboard API.

## Features

- Arithmetic, parentheses, implicit multiplication, percentages, powers, factorials, constants, and scientific notation.
- A compact scientific calculator with a five-column keypad and shift functions.
- Trigonometric, inverse trigonometric, hyperbolic, logarithmic, root, exponential, and absolute-value functions.
- Degree/radian switching, memory functions, calculation history, and result copying.
- Midnight Purple, Ocean Blue, Emerald Green, Crimson Red, Silver and Black, Pure Black, and fully customizable color themes with live preview and local persistence.
- Keyboard entry, live preview, clear/delete controls, single-decimal input, and division-by-zero error handling.

## Notes

Functions are entered with parentheses, for example `sin(30)` or `sqrt(81)`. The default angle mode is degrees. Division by zero displays `Math ERROR`. History and theme preference are stored in browser local storage.
