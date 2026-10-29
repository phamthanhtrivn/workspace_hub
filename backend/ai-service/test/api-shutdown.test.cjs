const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createServer, get } = require("node:http");
const { NestFactory } = require("@nestjs/core");

test("API entrypoint drains a real HTTP request before closing Nest, queues and DB", async (t) => {
  let release,
    finished = false,
    appClosed = 0,
    queueClosed = 0,
    dbClosed = 0;
  const server = createServer((_req, res) => {
    release = () => {
      finished = true;
      res.end("finished");
    };
  });
  const app = {
    use() {},
    enableCors() {},
    listen: (port, host) =>
      new Promise((resolve) => server.listen(port, host, resolve)),
    getHttpServer: () => server,
    close: async () => {
      assert.equal(finished, true);
      appClosed++;
    },
  };
  t.mock.method(NestFactory, "create", async () => app);
  for (const [file, exports] of [
    ["app.module", { AppModule: class {} }],
    [
      "config/env.config",
      {
        config: {
          PORT: 0,
          BIND_HOST: "127.0.0.1",
          AI_SHUTDOWN_TIMEOUT_MS: 5000,
        },
      },
    ],
    [
      "infrastructure/database/database",
      {
        db: {
          end: async () => {
            assert.equal(finished, true);
            assert.equal(appClosed, 1);
            dbClosed++;
          },
        },
      },
    ],
    [
      "infrastructure/queue/notebook.queue",
      {
        closeQueues: async () => {
          assert.equal(finished, true);
          assert.equal(appClosed, 1);
          queueClosed++;
        },
      },
    ],
  ])
    require.cache[require.resolve(`../dist/${file}`)] = { exports };
  const previous = new Set([
    ...process.listeners("SIGTERM"),
    ...process.listeners("SIGINT"),
  ]);
  t.after(() => {
    server.closeAllConnections();
    server.close();
    for (const signal of ["SIGTERM", "SIGINT"])
      for (const handler of process.listeners(signal))
        if (!previous.has(handler)) process.removeListener(signal, handler);
  });
  require("../dist/main");
  await new Promise((resolve) => setImmediate(resolve));
  const response = new Promise((resolve, reject) => {
    get(
      `http://127.0.0.1:${server.address().port}/`,
      { agent: false },
      (res) => {
        res.resume();
        res.on("end", resolve);
      },
    ).on("error", reject);
  });
  while (!release) await new Promise((resolve) => setImmediate(resolve));
  const shutdown = process
    .listeners("SIGTERM")
    .find((handler) => !previous.has(handler));
  const stopping = shutdown();
  assert.equal(shutdown(), stopping);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(server.listening, false);
  assert.equal(queueClosed + dbClosed + appClosed, 0);
  release();
  await response;
  await stopping;
  assert.equal(appClosed, 1);
  assert.equal(queueClosed, 1);
  assert.equal(dbClosed, 1);
});
