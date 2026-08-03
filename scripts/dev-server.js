const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 5500);

const TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function readDotEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return {};

  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = value;
  }
  return env;
}

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-cache",
  });
  res.end(body);
}

function resolveFile(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const relative = cleanPath === "/" ? "landing.html" : cleanPath.replace(/^\/+/, "");
  const full = path.resolve(ROOT, relative);
  if (!full.startsWith(ROOT + path.sep) && full !== ROOT) return null;
  return full;
}

const server = http.createServer((req, res) => {
  if (req.url.split("?")[0] === "/js/env.js") {
    const env = readDotEnv();
    const apiBaseUrl = env.ROUTEEV_API_BASE_URL || "";
    send(
      res,
      200,
      `window.ROUTEEV_API_BASE_URL = ${JSON.stringify(apiBaseUrl)};\n`,
      "text/javascript; charset=utf-8"
    );
    return;
  }

  const file = resolveFile(req.url);
  if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    send(res, 404, "Not found");
    return;
  }

  const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": "no-cache",
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`RouteEV Web: http://127.0.0.1:${PORT}`);
  console.log("Config: .env -> ROUTEEV_API_BASE_URL");
});
