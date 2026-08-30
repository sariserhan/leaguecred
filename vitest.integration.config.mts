import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/lib/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.integration.test.ts"],
    fileParallelism: false,
  },
});
