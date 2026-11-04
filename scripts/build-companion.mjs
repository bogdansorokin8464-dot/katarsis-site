// Cross-platform build: the compiled browser bundle is committed for Cloudflare.
import { build } from "esbuild";
await build({
  entryPoints: ["client/companion/main.tsx"],
  bundle: true,
  minify: true,
  target: ["es2020"],
  define: { "process.env.NODE_ENV": '"production"' },
  outfile: "web/companion.js",
  logLevel: "info",
});
