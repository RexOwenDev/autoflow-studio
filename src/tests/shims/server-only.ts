// No-op shim for `server-only` in vitest.
// The real `server-only` package throws if imported from client components;
// tests run in node and don't care. Aliased in vitest.config.ts.
export {};
