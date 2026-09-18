import { fileURLToPath } from "node:url"

import { defineConfig } from "vite"

import { traceSink } from "./dev/trace-sink.mjs"

const root = fileURLToPath(new URL("../..", import.meta.url))
const packageSource = (packagePath) =>
  fileURLToPath(new URL(`../../packages/${packagePath}/src`, import.meta.url))

export default defineConfig({
  base: "/app/",
  plugins: [traceSink()],
  resolve: {
    alias: {
      "@aedventure/add-domain": packageSource("add-domain"),
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
