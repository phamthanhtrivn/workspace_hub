const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "../..");
const directory = path.resolve(root, "../.tmp/ai-native-stack");
fs.mkdirSync(directory, { recursive: true });
const statePath = path.join(directory, "state.json");
if (fs.existsSync(statePath)) throw Error("An audit state already exists; inspect it before preparing another run");
const token = () => crypto.randomBytes(32).toString("hex");
const project = "aiqa-" + Date.now();
const ports = { pg: 15433, redis: 16379, qdrant: 16333, kafka: 19092, rag: 18088, kong: 18000, user: 18081, project: 18082, communication: 18083, document: 18085, calendar: 18086, ai: 18087, s3: 15000 };
const keys = { gateway: token(), document: token(), communication: token(), work: token(), rag: token(), pg: token(), redis: token(), jwt: token(), qdrant: token() };
const state = { project, directory, ports, keys, createdAt: new Date().toISOString(), processes: [] };
const bind = (source, target, readOnly = true) => ({ type: "bind", source: path.resolve(source), target, read_only: readOnly });
const services = {
  pg: { image: "postgres:17-alpine", environment: { POSTGRES_USER: "qa", POSTGRES_PASSWORD: keys.pg, POSTGRES_DB: "ai_db" }, ports: [`127.0.0.1:${ports.pg}:5432`], volumes: ["pg:/var/lib/postgresql/data"], mem_limit: "192m" },
  redis: { image: "redis:7.4-alpine", command: ["redis-server", "--appendonly", "yes", "--maxmemory", "128mb", "--maxmemory-policy", "noeviction", "--requirepass", keys.redis], ports: [`127.0.0.1:${ports.redis}:6379`], volumes: ["redis:/data"], mem_limit: "192m" },
  qdrant: { image: "qdrant/qdrant:v1.19.2", environment: { QDRANT__SERVICE__API_KEY: keys.qdrant }, ports: [`127.0.0.1:${ports.qdrant}:6333`], volumes: ["qdrant:/qdrant/storage"], mem_limit: "192m" },
  kafka: { image: "apache/kafka:latest", environment: {
    KAFKA_NODE_ID: "1", KAFKA_PROCESS_ROLES: "broker,controller", KAFKA_LISTENERS: "PLAINTEXT://:29092,CONTROLLER://:29093,HOST://:19092",
    KAFKA_ADVERTISED_LISTENERS: `PLAINTEXT://kafka:29092,HOST://localhost:${ports.kafka}`,
    KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: "PLAINTEXT:PLAINTEXT,CONTROLLER:PLAINTEXT,HOST:PLAINTEXT", KAFKA_CONTROLLER_QUORUM_VOTERS: "1@kafka:29093",
    KAFKA_CONTROLLER_LISTENER_NAMES: "CONTROLLER", KAFKA_INTER_BROKER_LISTENER_NAME: "PLAINTEXT", KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: "1",
    KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: "1", KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: "1", KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: "0", KAFKA_HEAP_OPTS: "-Xmx256m -Xms128m",
  }, ports: [`127.0.0.1:${ports.kafka}:19092`], mem_limit: "512m" },
  rag: { image: "wh-notebook-rag-worker", entrypoint: ["uvicorn"], command: ["app.main:app", "--host", "0.0.0.0", "--port", "8088", "--no-access-log"], environment: {
    RAG_SERVICE_KEY: keys.rag, QDRANT_URL: "http://qdrant:6333", QDRANT_API_KEY: keys.qdrant,
    EMBEDDING_PROVIDER: "local", EMBEDDING_MODEL: "intfloat/multilingual-e5-small", EMBEDDING_DEVICE: "cpu", HF_HOME: "/models/huggingface", HF_HUB_OFFLINE: "1", HF_HUB_DISABLE_TELEMETRY: "1", TOKENIZERS_PARALLELISM: "false", OMP_NUM_THREADS: "1", VISUAL_ENABLED: "true",
  }, ports: [`127.0.0.1:${ports.rag}:8088`], volumes: [bind(path.join(root, "backend/rag-worker/app"), "/app/app"), { type: "volume", source: "models", target: "/models", read_only: true }], depends_on: ["qdrant"], mem_limit: "1g" },
};
const kong = {
  _format_version: "3.0",
  consumers: [{ username: "qa-user-service", jwt_secrets: [{ key: "workspace-hub", secret: keys.jwt, algorithm: "HS256" }] }],
  services: [
    ["ai", ports.ai, ["/api/ai"], true], ["user", ports.user, ["/api/auth"], false],
    ["project", ports.project, ["/api/projects", "/api/tasks"], true],
    ["document", ports.document, ["/api/documents"], true],
    ["calendar", ports.calendar, ["/api/calendars", "/api/events", "/api/pomodoro"], true],
    ["communication", ports.communication, ["/api/direct-conversations", "/api/channels", "/api/spaces", "/api/meetings", "/api/messages"], true],
  ].map(([name, port, paths, authenticated]) => ({
    name: "qa-" + name, url: `http://host.docker.internal:${port}`, retries: 0, read_timeout: 150000,
    routes: [{ name: "qa-" + name, paths, strip_path: false, request_buffering: false, response_buffering: false,
      ...(authenticated ? { plugins: [{ name: "jwt", config: { claims_to_verify: ["exp"] } }, { name: "jwt-user-context", config: { optional: false, ...(name === "ai" ? { gateway_service_key: keys.gateway } : {}) } }] } : {}),
    }],
  })),
  plugins: [{ name: "cors", config: { origins: ["http://localhost:3000"], methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"], headers: ["Authorization", "Content-Type", "Origin", "X-File-Size", "X-Upload-Count", "X-Upload-Bytes"], credentials: true } }],
};
const kongPath = path.join(directory, "kong.json");
fs.writeFileSync(kongPath, JSON.stringify(kong, null, 2));
services.kong = { image: "docker-kong", entrypoint: ["/docker-entrypoint.sh"], command: ["kong", "docker-start"], environment: {
  KONG_DATABASE: "off", KONG_DECLARATIVE_CONFIG: "/tmp/qa-kong.json", KONG_PLUGINS: "bundled,jwt-user-context", KONG_ADMIN_LISTEN: "off", KONG_PROXY_ACCESS_LOG: "off",
}, extra_hosts: ["host.docker.internal:host-gateway"], ports: [`127.0.0.1:${ports.kong}:8000`], volumes: [bind(kongPath, "/tmp/qa-kong.json"), bind(path.join(root, "backend/kong-gateway/plugins/jwt-user-context"), "/usr/local/share/lua/5.1/kong/plugins/jwt-user-context")], mem_limit: "256m" };
for (const service of Object.values(services)) service.labels = { "workspace.ai-audit": project };
fs.writeFileSync(path.join(directory, "compose.json"), JSON.stringify({ name: project, services, volumes: { pg: {}, redis: {}, qdrant: {}, models: { external: true, name: "wh-notebook_notebook-models" } } }, null, 2));
fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
console.log(JSON.stringify({ project, directory, ports, note: "Only generated audit credentials are stored here; no application env changed." }));
