"use strict"

const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { buildReport } = require("./add-rpg-size-report.cjs")

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "aedventure-add-size-"))
const dist = path.join(directory, "dist")
const wasm = path.join(directory, "wasm")
fs.mkdirSync(path.join(dist, "assets"), { recursive: true })
fs.mkdirSync(wasm, { recursive: true })
fs.writeFileSync(path.join(dist, "assets/index.js"), "console.log('fixture')")
fs.writeFileSync(path.join(dist, "assets/index.css"), "body{color:black}")
fs.writeFileSync(path.join(dist, "assets/runtime.wasm"), Buffer.alloc(32, 1))
fs.mkdirSync(path.join(dist, "audio"), { recursive: true })
fs.writeFileSync(path.join(dist, "audio/hush.mp3"), Buffer.alloc(64, 1))
fs.writeFileSync(path.join(wasm, "runtime_bg.wasm"), Buffer.alloc(32, 1))

try {
  const budgets = {
    id: "fixture",
    size: {
      browserJsBytes: { max: 1000 },
      browserJsGzipBytes: { max: 1000 },
      browserCssBytes: { max: 1000 },
      browserCssGzipBytes: { max: 1000 },
      wasmBytes: { max: 1000 },
      wasmGzipBytes: { max: 1000 },
      totalNonAudioAssetBytes: { max: 1000 },
      totalNonAudioAssetGzipBytes: { max: 1000 },
      audioBytes: { max: 1000 },
    },
  }
  const report = buildReport({ distDir: dist, generatedWasm: wasm, budgets })
  assert.equal(report.status, "passed")
  assert.equal(report.metrics.browserJsBytes, 22)
  assert.equal(report.metrics.wasmBytes, 32)
  assert.equal(report.metrics.audioBytes, 64)
  assert.equal(report.files.filter((file) => file.category === "wasm").length, 1)
  assert.equal(report.files.filter((file) => file.category === "audio").length, 1)
  const nonAudioFiles = report.files.filter((file) => file.source === "dist" && file.category !== "audio")
  assert.equal(
    report.metrics.totalNonAudioAssetBytes,
    nonAudioFiles.reduce((total, file) => total + file.bytes, 0),
  )
  assert.equal(
    report.metrics.totalNonAudioAssetGzipBytes,
    nonAudioFiles.reduce((total, file) => total + file.gzip_bytes, 0),
  )
  assert.ok(report.files.every((file) => typeof file.gzip_bytes === "number"))
} finally {
  fs.rmSync(directory, { recursive: true, force: true })
}

console.log("ADD size report checks: OK")
