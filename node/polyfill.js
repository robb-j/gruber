// Conditional ESM module loading (Node.js and browser)
if (typeof URLPattern !== "function") await import("urlpattern-polyfill");
