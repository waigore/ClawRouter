import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/proxy.ts", "src/auth.ts", "src/balance.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node20",
  splitting: false,
});
