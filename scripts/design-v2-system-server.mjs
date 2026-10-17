import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routes = {
  "/": ["docs/design-v2/04-system.html", "text/html; charset=utf-8"],
  "/system.css": ["src/app/system-v2.css", "text/css; charset=utf-8"],
  "/foundations.css": ["src/app/design-system.css", "text/css; charset=utf-8"],
};
http
  .createServer((req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname === "/favicon.ico") {
      res.writeHead(204);
      res.end();
      return;
    }
    const item = routes[pathname];
    if (!item) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    try {
      const body = fs.readFileSync(path.join(root, item[0]));
      res.writeHead(200, {
        "Content-Type": item[1],
        "Cache-Control": "no-store",
      });
      res.end(body);
    } catch {
      res.writeHead(500);
      res.end("Preview unavailable");
    }
  })
  .listen(3002, "127.0.0.1", () =>
    console.log("Design system: http://localhost:3002"),
  );
