const http = require("http");
const fs = require("fs");
const path = require("path");
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'",
};

const siteRoot = path.resolve(__dirname);
const defaultPort = Number(process.env.PORT || 4321);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".doc": "application/msword",
};

function safeResolve(requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath.split("?")[0]);
  } catch (e) {
    if (e instanceof URIError) return null;
    throw e;
  }
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const relativePath = normalized
    .replace(/^[/\\]?training-site[/\\]?/, "")
    .replace(/^[/\\]+/, "");
  const resolved = path.resolve(siteRoot, relativePath || "index.html");
  if (!resolved.startsWith(siteRoot)) {
    return null;
  }
  return resolved;
}

function sendFile(filePath, res) {
  fs.stat(filePath, (statError, stats) => {
    if (statError) {
      if (statError.code === 'EACCES') {
        res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Forbidden");
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }
    if (!stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stats.size,
      "Cache-Control": "no-cache",
      ...securityHeaders,
    });
    const readStream = fs.createReadStream(filePath);
    res.on("error", () => {});
    readStream.on("error", (streamErr) => {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      }
      res.end("Internal Server Error");
    });
    readStream.pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  let requestPath = parsed.pathname;

  if (requestPath === "/") {
    res.writeHead(302, { Location: "/training-site/", ...securityHeaders });
    res.end();
    return;
  }

  if (requestPath === "/training-site") {
    res.writeHead(302, { Location: "/training-site/", ...securityHeaders });
    res.end();
    return;
  }

  if (requestPath === "/training-site/") {
    requestPath = "/training-site/index.html";
  }

  if (!requestPath.startsWith("/training-site/")) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }

  const filePath = safeResolve(requestPath);
  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  sendFile(filePath, res);
});

server.timeout = 30000;
server.headersTimeout = 10000;
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`端口 ${defaultPort} 已被占用`);
  } else {
    console.error("服务器启动失败:", err.message);
  }
  process.exit(1);
});
server.listen(defaultPort, "127.0.0.1", () => {
  console.log(`WorkBuddy 课程站已启动: http://127.0.0.1:${defaultPort}/training-site/`);
});
