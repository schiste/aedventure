import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

import { defineConfig } from "vite"

import { traceSink } from "./dev/trace-sink.mjs"

const root = fileURLToPath(new URL("../..", import.meta.url))
const packageSource = (packagePath) =>
  fileURLToPath(new URL(`../../packages/${packagePath}/src`, import.meta.url))

// Resolved once at config load (dev-server start / build) for the trace session header.
let gitSha = "unknown"
try {
  gitSha = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root }).toString().trim()
} catch {
  // not a git checkout, or git unavailable — leave "unknown"
}

export default defineConfig({
  base: "/app/",
  plugins: [traceSink()],
  define: {
    __ADD_GIT_SHA__: JSON.stringify(gitSha),
  },
  resolve: {
    alias: {
      "@aedventure/add-domain": packageSource("add-domain"),
      "@aedventure/add-protocol": packageSource("add-protocol"),
      "@aedventure/game-animation": packageSource("game-animation"),
      "@aedventure/game-content": packageSource("game-content"),
      "@aedventure/game-assets": packageSource("game-assets"),
      "@aedventure/game-dungeon": packageSource("game-dungeon"),
      "@aedventure/game-renderer-phaser": packageSource("game-renderer-phaser"),
      "@aedventure/game-topology": packageSource("game-topology"),
      "@aedventure/game-visibility": packageSource("game-visibility"),
      "@aedventure/game-world": packageSource("game-world"),
    },
  },
  build: {
    outDir: "dist-app",
    emptyOutDir: true,
  },
  server: {
    host: "127.0.0.1",
    port: 5176,
    fs: {
      allow: [root],
    },
  },
})
