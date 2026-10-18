# WorkspaceHub Docker and EC2 deployment

Commands run from the repository root unless stated otherwise. Three Ubuntu 24.04
x86_64 EC2 instances share a VPC in Sydney. GitHub builds images and sends only the
configuration and scripts from the release commit through SCP. EC2 pulls images;
it needs neither a Git checkout nor application build tools.

| Host | Runtime directory | Services |
| --- | --- | --- |
| APP | `/opt/workspacehub/app` | web, Kong, user, project, communication, document, calendar, notification, AI API/worker |
| REALTIME | `/opt/workspacehub/realtime` | LiveKit, Egress |
| INFRA | `/opt/workspacehub/infra` | PostgreSQL, Redis, Kafka, topic initializer |

## Local development

Applications run on the host. Docker runs infrastructure and Kong only.
Follow [local development](local-development.md) for environment scopes,
application terminals, explicit SQL/Prisma/Alembic migrations and recording.
The sole local Docker entry point is `backend/docker/docker-compose.host.yml`.
GitHub Actions keeps isolated application E2E under `.github/ci/ai`.
Production retains image build/push, EC2 pull/run, migrations and rollback.

## Images and GitHub configuration

Production publishes ten application repositories: `workspacehub-web`,
`workspacehub-kong`, and `workspacehub-{user,project,communication,document,calendar,notification}-service`.
`workspacehub-ai-service` and `workspacehub-ai-worker` provide document QA.
Seven `workspacehub-<service>-migration` repositories contain migration tools.
Each image uses `sha-<full Git commit SHA>` for its own last build. Unchanged images
retain their previous tags, so one APP release can contain different SHA tags.
Enable immutable SHA tags in Docker Hub;
existing images are reused on retries. Browser `NEXT_PUBLIC_*` values are fixed at
build time, so changing them requires a new commit and build.

Infrastructure and base images retain explicit version/digest pins in source:
PostgreSQL 15.18, Redis 7.4.8, Kafka 4.3.1, Kong 3.9.1, LiveKit 1.13.5, Egress 1.14.1,
Node 22.22.0, Maven 3.9.9 production builder, and Java 21 runtime.

Create the GitHub **production** environment and restrict deployment branches to
`main`. Configure these secrets and variables there:

| Type | Name | Value |
| --- | --- | --- |
| Secret | `DOCKERHUB_TOKEN` | token with image push permission |
| Secret | `SSH_PRIVATE_KEY` | deploy private key accepted by all three EC2 hosts |
| Variable | `DOCKERHUB_USERNAME` | image namespace; must match APP env |
| Variable | `APP_SSH_HOST` | APP public IPv4 or DNS |
| Variable | `INFRA_SSH_HOST` | INFRA public IPv4 or DNS |
| Variable | `REALTIME_SSH_HOST` | REALTIME public IPv4 or DNS |
| Variable | `SSH_USER` | default `ubuntu` |
| Variable | `SSH_PORT` | default `22` |
| Variable | `SSH_KNOWN_HOSTS` | verified OpenSSH known_hosts entries for all three hosts |
| Variable | `NEXT_PUBLIC_API_URL` | browser API base URL, without `/api` |
| Variable | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | public Google browser client ID |
| Variable | `NEXT_PUBLIC_NOMINATIM_URL` | geocoding URL |
| Variable | `NEXT_PUBLIC_ASSET_HOST` | optional asset hostname, without scheme |
| Variable | `SITE_URL` | optional public HTTPS frontend origin; leave unset until a production domain exists |
| Variable | `SITE_INDEXABLE` | `false` by default; enable only for the public production domain |

SEO is currently disabled because no production domain is configured. Leave
`SITE_URL` unset and `SITE_INDEXABLE=false`. Every page remains `noindex` and the
sitemap is empty. See [SEO metadata configuration](seo-metadata.md) before enabling
indexing. These two values are embedded in both the web build and the resulting
image environment; changing them requires a new web image/commit. Do not override
them only at container startup or promote a production-indexable image to a preview
host. Trial image builds always leave `SITE_URL` empty and indexing disabled.

Expose public build values at repository level too if PR builds should use them.
Remove obsolete workflow settings `AWS_ROLE_ARN`, `DEPLOY_ARTIFACT_BUCKET`,
`APP_EC2_INSTANCE_ID`, `INFRA_EC2_INSTANCE_ID`, `REALTIME_EC2_INSTANCE_ID`,
`DOCKERHUB_PRIVATE_REPOSITORIES`, and GitHub variable `AWS_REGION`.
The application's `AWS_REGION` remains required. No GitHub OIDC role, SSM command,
artifact bucket, or Parameter Store lookup participates in deployment.

PRs targeting main run lint, unit tests and trial builds for affected components;
configuration and deployment regression checks always run. PRs never publish or
deploy. Push/merge to main invokes one production coordinator: it reads non-secret
release metadata over SSH, runs selective CI, builds changed images and deploys
only affected hosts in INFRA → REALTIME → APP order. A failed required host blocks
later hosts. Image builds can run alongside INFRA deployment after CI succeeds.

**Release production** on main accepts `services=auto`, `all`, or comma-separated
Compose names, such as `calendar-service,frontend-web`. `auto` reconciles pending
APP changes, `all` builds all 17 APP images, and an explicit list rebuilds those
runtime images plus affected migration images. **Deploy infra** and **Deploy realtime**
remain available for manual redeployment of operator env changes. All entrypoints
share one production concurrency group. Normal APP code changes do not deploy
INFRA or REALTIME; their tracked configuration/init-file changes do.
Within those hosts, resolved configuration selects changed containers. LiveKit/Egress
runtime file hashes also trigger recreation of the matching container. Kafka topic
initializer changes rerun the initializer without restarting unchanged databases.

Selection compares each image's last successful source commit, and each host's
configuration commit, against the requested commit. Failed or manually omitted
changes remain pending for the next automatic release. Missing Git history expands
the affected scope rather than silently skipping changes. SSH failures or corrupt
metadata fail planning. Production preflight requires SSH access to all three hosts.
Rerunning an older workflow cannot downgrade a newer deployed commit; use the
latest main workflow, or the explicit APP rollback command when rollback is intended.
The first release on a host bootstraps that host; a legacy single-tag APP release
is converted automatically and its existing image references are checked first.

## Host preparation and SSH

Install Docker from its official Ubuntu repository, Compose v2, Python and tools
on each host using an administrative SSH session:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl python3 python3-venv util-linux openssh-server
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo 'deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu noble stable' | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker ssh
sudo install -d -m 700 /opt/workspacehub/app /opt/workspacehub/infra /opt/workspacehub/realtime
sudo python3 -m venv /opt/workspacehub/venv
sudo /opt/workspacehub/venv/bin/python -m pip install python-dotenv==1.2.1
docker compose version
```

Install the common deploy public key in `ubuntu`'s `~/.ssh/authorized_keys` on all
hosts. Use directory mode 700 and file mode 600. The private key stays on your
machine and in the GitHub secret. The deploy account must have noninteractive sudo
for the installer and its Docker/file operations. On the standard Ubuntu AMI,
verify `sudo -n true`; provision a dedicated, reviewed sudoers rule if necessary.
The installer runs as root and creates root-owned mode-600 env files and private
logs. This deploy key therefore grants administrative deployment access.

Private Docker Hub images: authenticate **once on APP under the root account that
runs the installer**, with a pull-only token entered at the prompt:

```bash
sudo docker login --username YOUR_DOCKERHUB_USERNAME
```

Public images do not require host login. Tokens are not read from Parameter Store.

Verify each host key fingerprint against an independent trusted source such as
the EC2 console/administrative session (`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`).
`ssh-keyscan` only collects keys; compare fingerprints before trusting its output.
Put verified entries in local known_hosts and GitHub `SSH_KNOWN_HOSTS`. Nondefault
ports use `[hostname]:port` entries. The helper sets `StrictHostKeyChecking=yes`,
key-only batch authentication, connection timeouts and keepalives, and fails on
unknown/changed keys. See [OpenSSH](https://man.openbsd.org/ssh).

Security Groups must allow the configured SSH port (TCP 22 by default) from the
GitHub-hosted runner. Runner IPs change; allowing only your personal IP is
insufficient. Maintain a suitable runner IP allowlist, or use a runner with fixed
egress if your network policy requires stable addresses. Permit your administrative
IP separately. All hosts also need outbound registry and package access.

APP needs its application S3 instance-role permissions independently of GitHub.
Keep bucket `workspacehub-s3` and APP `AWS_REGION=ap-southeast-2`. EC2's default SDK
credential chain can use the instance profile; IMDSv2 tokens should be required
with response hop limit 2 for bridge containers. Verify bucket access inside an
application container. REALTIME needs S3 access if future Egress jobs write there.
Deployment does not modify bucket data or require an artifact bucket.

## Operator-managed env files

Create and edit these ignored local files. Do not commit them, upload them to GitHub,
or include them in a deployment bundle.

| Local file | EC2 file |
| --- | --- |
| `deploy/prod/app/.env` | `/opt/workspacehub/app/.env.production` |
| `deploy/prod/infra/.env` | `/opt/workspacehub/infra/.env.production` |
| `deploy/prod/realtime/.env` | `/opt/workspacehub/realtime/.env.production` |

| Role | Required env names |
| --- | --- |
| APP | `DOCKERHUB_USERNAME`, `INFRA_PRIVATE_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `FRONTEND_URL`, `JWT_SECRET_KEY`, `INTERNAL_SERVICE_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME`, `GOOGLE_CLIENT_ID`, `LIVEKIT_URL`, `LIVEKIT_PUBLIC_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |
| INFRA | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `INFRA_BIND_HOST`, `KAFKA_ADVERTISED_HOST` |
| REALTIME | `INFRA_PRIVATE_HOST`, `LIVEKIT_URL`, `LIVEKIT_PUBLIC_IP`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_WEBHOOK_URL` |

Optional APP names: `AWS_CLOUDFRONT_URL`, `MAIL_FROM`, `MAIL_PORT` (587),
`FRONTEND_PORT` (3000), `KONG_PORT` (8000). Match PostgreSQL credentials on APP/INFRA
and LiveKit credentials on APP/REALTIME. Use a shared JWT secret of at least 32
random characters. Internal credentials are shared by the services on APP.
Generate valid VAPID keys with your notification service's web-push dependency.
Match backend Google client ID to the frontend build variable.

Use dotenv `NAME=value` syntax, quoting special characters. The pinned
[python-dotenv parser](https://github.com/theskumar/python-dotenv) reads the file
without shell execution or `${...}` expansion. Malformed, missing, empty required,
multiline and NUL-containing values fail validation. Do not put `IMAGE_TAG` or
`PREVIOUS_IMAGE_TAG` or any `*_IMAGE_TAG` in this file. The renderer derives the percent-encoded DB
password and writes `.env.runtime` plus LiveKit/Egress runtime configs at mode 600.
It never writes `.env.production`.

From PowerShell, use your verified known_hosts file and deploy key. Replace all
placeholder hosts before running. Upload into the SSH account's home, then install
the destination privately and remove the temporary file:

```powershell
$DeployKey = "$env:USERPROFILE\.ssh\workspacehub_deploy"
$KnownHosts = "$env:USERPROFILE\.ssh\known_hosts"
$DeployUser = "ubuntu"
$DeployPort = "22"
$AppHost = "APP_PUBLIC_IP_OR_DNS"
$InfraHost = "INFRA_PUBLIC_IP_OR_DNS"
$RealtimeHost = "REALTIME_PUBLIC_IP_OR_DNS"

ssh -i $DeployKey -p $DeployPort -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$KnownHosts" "${DeployUser}@${AppHost}" 'umask 077; mkdir -p ~/.workspacehub-env; chmod 700 ~/.workspacehub-env'
scp -i $DeployKey -P $DeployPort -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$KnownHosts" deploy/prod/app/.env "${DeployUser}@${AppHost}:.workspacehub-env/app.env"
ssh -i $DeployKey -p $DeployPort -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$KnownHosts" "${DeployUser}@${AppHost}" 'sudo -n install -o root -g root -m 600 ~/.workspacehub-env/app.env /opt/workspacehub/app/.env.production && rm ~/.workspacehub-env/app.env'

ssh -i $DeployKey -p $DeployPort -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$KnownHosts" "${DeployUser}@${InfraHost}" 'umask 077; mkdir -p ~/.workspacehub-env; chmod 700 ~/.workspacehub-env'
scp -i $DeployKey -P $DeployPort -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$KnownHosts" deploy/prod/infra/.env "${DeployUser}@${InfraHost}:.workspacehub-env/infra.env"
ssh -i $DeployKey -p $DeployPort -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$KnownHosts" "${DeployUser}@${InfraHost}" 'sudo -n install -o root -g root -m 600 ~/.workspacehub-env/infra.env /opt/workspacehub/infra/.env.production && rm ~/.workspacehub-env/infra.env'

ssh -i $DeployKey -p $DeployPort -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$KnownHosts" "${DeployUser}@${RealtimeHost}" 'umask 077; mkdir -p ~/.workspacehub-env; chmod 700 ~/.workspacehub-env'
scp -i $DeployKey -P $DeployPort -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$KnownHosts" deploy/prod/realtime/.env "${DeployUser}@${RealtimeHost}:.workspacehub-env/realtime.env"
ssh -i $DeployKey -p $DeployPort -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$KnownHosts" "${DeployUser}@${RealtimeHost}" 'sudo -n install -o root -g root -m 600 ~/.workspacehub-env/realtime.env /opt/workspacehub/realtime/.env.production && rm ~/.workspacehub-env/realtime.env'
```

Check `$LASTEXITCODE` after every command; stop if it is nonzero. Later env changes
use this same procedure followed by the affected deployment workflow. Ordinary
releases retain the files already on EC2.

## Networking and first deployment

Use private IP/DNS for cross-host traffic. APP `INFRA_PRIVATE_HOST` and INFRA
`KAFKA_ADVERTISED_HOST` point to INFRA; `INFRA_BIND_HOST` is its private interface IP.
APP's `LIVEKIT_URL` points to REALTIME privately; `LIVEKIT_PUBLIC_URL` is reachable
by browsers. REALTIME's `LIVEKIT_URL` is its local/private WebSocket URL and
`LIVEKIT_PUBLIC_IP` is its public ICE address. Use webhook URL
`http://<APP_PRIVATE_HOST>:8000/api/meetings/livekit/webhook` (adjust Kong port).
LiveKit/Egress share INFRA Redis and use host networking.

| Security group | Inbound rule |
| --- | --- |
| All three | SSH port from authorized administrators and runner egress |
| APP | TCP 3000/8000 from intended clients during IP testing; later proxy 80/443 |
| APP | TCP 8000 from REALTIME for signed webhooks |
| REALTIME | TCP 7880 signaling, TCP 7881 fallback, UDP 7882 media from clients |
| REALTIME | TCP 7880 from APP for server API calls |
| INFRA | TCP 5432 from APP only |
| INFRA | TCP 6379 from APP and REALTIME only |
| INFRA | TCP 9092 from APP only |

Do not expose backend ports 8081–8086, Kong Admin 8001/8444, Egress health/metrics
9090/9091, or database/cache/broker ports publicly. Redis/Kafka private plaintext
listeners require VPC isolation. Browser camera/microphone and web push require a
secure context; configure domains/TLS and Google origins/S3 CORS for full testing.

1. Prepare hosts, Docker Hub, SSH keys/verified host keys, security groups and the
   GitHub environment; install the parser and operator env on all hosts.
2. Merge into main. An early automatic APP release fails if INFRA is not ready.
3. Dispatch **Deploy infra** on main; verify databases, Redis, Kafka and topics.
4. Dispatch **Deploy realtime** on main; verify signaling, ICE and webhook access.
5. Dispatch **Release production** on main, or push a new main commit. CI must pass
   before selected images publish and the APP configuration is sent by SCP. A new
   APP host builds all 17 images; later releases build only affected images.
6. The host verifies SHA-256 before extraction, acquires its deployment lock, renders
   runtime env, pulls selected images, runs selected migrations, rolls out selected
   APP containers and checks their health/readiness. Bootstrap runs all six
   migrations. Success records `.release-state.json`, `.image-tags.env` and a private
   resolved configuration snapshot. These runtime files must not be committed.

SCP/SSH/host-key/checksum failures fail the workflow. Installer output stays in a
root-owned `deployment.log.*` on the affected host, avoiding secret-bearing provider
errors in GitHub logs. A SHA bundle contains only allowlisted Compose/templates,
runtime scripts and INFRA init files from that commit, including no env files.

## Migrations, rollback and verification

Four Prisma runners use `migrate deploy`. User/project SQL runners order filenames,
record checksums, lock migration sessions and transact each file. The two existing
project V20 files retain separate filename identities. Changed applied files fail.
Migration failure prevents rollout; partial database progress is retained. Spring
production validates its schema instead of generating it.

For existing databases created by `db push`, Hibernate update or manual SQL, review
and reconcile the migration baseline after backing up and comparing actual schemas.
Never automatically reset/baseline populated databases or accept data loss. Postgres
init runs only on empty volumes; new databases require an administrative operation.

APP rollback restores `.previous-state.json`, `.previous-compose.yml`,
`.previous-env.runtime` and the previous tag/effective-configuration snapshots.
It pulls the previous selected images and recreates only the containers touched
by that release, then checks health. It leaves
the current operator `.env.production` intact. A failed candidate keeps the workflow
failed even after successful rollback. The first release has no previous version.

```bash
sudo bash /opt/workspacehub/app/scripts/rollback.sh
```

Rollback does **not** reverse database migrations. Use backward-compatible
expand/contract migrations for safe application rollback; breaking schema changes
need coordinated maintenance. Retain current/previous images and private env
snapshots. INFRA/REALTIME do not implement automatic data rollback.
Never run `docker compose down -v` in production unless intentionally deleting data.

Check the affected host using `.env.runtime`; APP also reads its per-image tags:

```bash
cd /opt/workspacehub/app
sudo bash -c 'docker compose --env-file .env.runtime --env-file .image-tags.env -f compose.yml ps; bash scripts/health-check.sh'
cd /opt/workspacehub/infra
sudo docker compose --env-file .env.runtime -f compose.yml ps
cd /opt/workspacehub/realtime
sudo docker compose --env-file .env.runtime -f compose.yml ps
```

Use the same Compose flags for private logs and infra readiness checks. Verify login,
WebSockets, meeting join, S3 upload and calendar notifications on the actual hosts.
The recording worker adds no recording-start business API.

Local/CI configuration verification on Linux:

```bash
python3 -m venv .tmp/deploy-checks
source .tmp/deploy-checks/bin/activate
python3 -m pip install -r deploy/scripts/requirements.txt PyYAML==6.0.3
bash deploy/scripts/validate-config.sh
```

Checks create a disposable fake env shared by all Compose validations, remove it
on exit, and cover image pins, safe migrations, YAML, shell, actionlint, renderer,
release rollback and transport regression tests. Only designated Dockerfiles and
deployment configurations are scanned for unsafe image/command patterns.
Node lint remains advisory because of existing lint debt; tests/builds and deployment
checks are required. Production/migration Docker targets are built during CI.

Pinned image upgrades require release-note review, exact version/digest edits,
configuration/build checks and data backups before merging. Relevant INFRA/REALTIME
changes now deploy automatically on main; the manual workflows remain available.
PostgreSQL major upgrades need dump/restore or a planned `pg_upgrade`; reverting an
image does not reverse stateful changes.
