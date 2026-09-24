const assert = require("node:assert")
const fs = require("node:fs")
const http = require("node:http")
const path = require("node:path")

async function startStaticAppServer(options) {
  const directory = path.resolve(options.directory)
  const basePath = options.basePath ?? "/app"
  const hostname = options.hostname ?? "127.0.0.1"
  const port = options.port ?? 0

  assert.ok(
    fs.existsSync(path.join(directory, "index.html")),
    `Missing app build output at ${directory}. Build the app before running QA.`,
  )

  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://${hostname}`)
    const relativePath = staticPathFor(url.pathname, basePath)

    if (!relativePath) {
      response.writeHead(404)
      response.end("Not found")
      return
    }

    const filePath = path.resolve(directory, relativePath)
    if (!filePath.startsWith(`${directory}${path.sep}`) && filePath !== directory) {
      response.writeHead(403)
      response.end("Forbidden")
      return
    }
    // A directory is not a 200. Streaming one raises EISDIR from a read that
    // nothing was listening for, which took down the whole server — one
    // mistyped asset path and every later request was refused, including the
    // QA suites'. `stat` also answers "exists" for us, so this replaces the
    // check rather than adding to it.
    let stats
    try {
      stats = fs.statSync(filePath)
    } catch {
      response.writeHead(404)
      response.end("Not found")
      return
    }
    if (!stats.isFile()) {
      response.writeHead(404)
      response.end("Not found")
      return
    }

    response.writeHead(200, {
      "content-type": contentTypeFor(filePath),
      "cache-control": "no-store",
    })
    const stream = fs.createReadStream(filePath)
    // A client that goes away mid-download must not be able to kill the host.
    stream.on("error", () => response.destroy())
    stream.pipe(response)
  })

  await new Promise((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, hostname, () => {
      server.off("error", reject)
      resolve()
    })
  })

  const address = server.address()
  assert.equal(typeof address, "object")

  return {
    server,
    url: `http://${hostname}:${address.port}`,
  }
}

function staticPathFor(pathname, basePath) {
  if (pathname === basePath || pathname === `${basePath}/`) return "index.html"
  if (!pathname.startsWith(`${basePath}/`)) return undefined
  return decodeURIComponent(pathname.slice(`${basePath}/`.length)) || "index.html"
}

function contentTypeFor(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8"
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8"
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8"
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8"
  if (filePath.endsWith(".svg")) return "image/svg+xml"
  if (filePath.endsWith(".png")) return "image/png"
  return "application/octet-stream"
}

module.exports = {
  startStaticAppServer,
}
