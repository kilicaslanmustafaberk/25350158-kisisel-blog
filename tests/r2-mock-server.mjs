import { createServer } from "node:http";

// Minimal in-memory, path-style S3/R2 stand-in for the 1.9.0 CV upload regression.
// It implements only what the app uses (PUT, HEAD, ranged GET, DELETE). It does NOT
// verify request signatures — real R2 signature/expiry behaviour is covered by
// tests/phase8-r2-smoke.mjs. Control routes (/__objects, /__fail) are test-only.
export function startR2Mock({ bucket = "test-bucket", port = 0 } = {}) {
  const objects = new Map();
  let failing = false;

  const server = createServer((request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");
    if (url.pathname === "/__objects") {
      response.setHeader("Content-Type", "application/json");
      return response.end(JSON.stringify([...objects.keys()]));
    }
    if (url.pathname === "/__fail") {
      failing = url.searchParams.get("on") === "1";
      return response.end("ok");
    }
    // Browsers send a CORS preflight before the signed PUT; Node fetch does not.
    if (request.method === "OPTIONS") return response.end();
    if (failing) {
      response.statusCode = 500;
      return response.end();
    }

    const prefix = `/${bucket}/`;
    if (!url.pathname.startsWith(prefix)) {
      response.statusCode = 404;
      return response.end();
    }
    const key = decodeURIComponent(url.pathname.slice(prefix.length));

    if (request.method === "PUT") {
      const chunks = [];
      request.on("data", (chunk) => chunks.push(chunk));
      request.on("end", () => {
        objects.set(key, { body: Buffer.concat(chunks), contentType: request.headers["content-type"] ?? "application/octet-stream" });
        response.setHeader("ETag", `"${objects.get(key).body.length}"`);
        response.end();
      });
      return;
    }

    const object = objects.get(key);
    if (request.method === "DELETE") {
      objects.delete(key);
      response.statusCode = 204;
      return response.end();
    }
    if (!object) {
      response.statusCode = 404;
      response.setHeader("Content-Type", "application/xml");
      return response.end(request.method === "HEAD" ? undefined : "<Error><Code>NoSuchKey</Code></Error>");
    }

    response.setHeader("Content-Type", object.contentType);
    response.setHeader("ETag", `"${object.body.length}"`);
    const range = /^bytes=(\d+)-(\d+)$/.exec(request.headers.range ?? "");
    let body = object.body;
    if (range) {
      body = object.body.subarray(Number(range[1]), Number(range[2]) + 1);
      response.statusCode = 206;
      response.setHeader("Content-Range", `bytes ${range[1]}-${Number(range[1]) + body.length - 1}/${object.body.length}`);
    }
    response.setHeader("Content-Length", String(request.method === "HEAD" ? object.body.length : body.length));
    response.end(request.method === "HEAD" ? undefined : body);
  });

  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => {
      const origin = `http://127.0.0.1:${server.address().port}`;
      resolve({ origin, bucket, objects, close: () => new Promise((done) => server.close(done)) });
    });
  });
}
