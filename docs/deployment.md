# WorkspaceHub Docker and EC2 deployment

Commands run from the repository root unless stated otherwise. Three Ubuntu 24.04
x86_64 EC2 instances share a VPC in Sydney. GitHub builds images and sends only the
configuration and scripts from the release commit through SCP. EC2 pulls images;
it needs neither a Git checkout nor application build tools.

| Host | Runtime directory | Services |
| --- | --- | --- |
| APP | `/opt/workspacehub/app` | web, Kong, user, project, communication, document, calendar, notification |
| REALTIME | `/opt/workspacehub/realtime` | LiveKit, Egress |
| INFRA | `/opt/workspacehub/infra` | PostgreSQL, Redis, Kafka, topic initializer |

## Development

Create your local, ignored `deploy/dev/.env`; the deleted example files are not
required. Use the APP env names below, plus `DEV_IMAGE_TAG=sha-<full commit SHA>`,
`POSTGRES_PASSWORD_URLENCODED` (percent-encoded password), and `NEXT_PUBLIC_API_URL`,
`NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_NOMINATIM_URL`, `NEXT_PUBLIC_ASSET_HOST`.
Development does not need `DOCKERHUB_USERNAME`, `INFRA_PRIVATE_HOST` or `LIVEKIT_URL`.
Use `FRONTEND_URL=http://localhost:3000` and browser API URL `http://localhost:8000`.

```bash
docker compose --env-file deploy/dev/.env -f deploy/dev/compose.yml up -d --build
docker compose --env-file deploy/dev/.env -f deploy/dev/compose.yml --profile realtime up -d --build
docker compose --env-file deploy/dev/.env -f deploy/dev/compose.yml down
```

Source bind mounts retain hot reload. Local SHA images are not published. The
default bridge network uses persistent named volumes; stopping preserves data.
Legacy volumes are not automatically adopted: back up and restore explicitly.
Kong Admin is disabled. Development service/database ports bind to loopback.

Create Prisma migrations explicitly, for example:

```bash
docker compose --env-file deploy/dev/.env -f deploy/dev/compose.yml exec communication-service npx prisma migrate dev --name change_name
```

Startup applies committed migrations. User/project one-shot SQL jobs complete
before applications start; rerun those jobs when adding SQL files.

## Images and GitHub configuration

Production publishes eight application repositories: `workspacehub-web`,
`workspacehub-kong`, and `workspacehub-{user,project,communication,document,calendar,notification}-service`.
Six more `workspacehub-<service>-migration` repositories contain migration tools.
All 14 use `sha-<full Git commit SHA>`. Enable immutable SHA tags in Docker Hub;
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

Expose public build values at repository level too if PR builds should use them.
Remove obsolete workflow settings `AWS_ROLE_ARN`, `DEPLOY_ARTIFACT_BUCKET`,
`APP_EC2_INSTANCE_ID`, `INFRA_EC2_INSTANCE_ID`, `REALTIME_EC2_INSTANCE_ID`,
`DOCKERHUB_PRIVATE_REPOSITORIES`, and GitHub variable `AWS_REGION`.
The application's `AWS_REGION` remains required. No GitHub OIDC role, SSM command,
artifact bucket, or Parameter Store lookup participates in deployment.

PRs targeting main run lint, unit tests, configuration checks, and trial builds;
they never publish or deploy. Push/merge to main invokes the same reusable CI once,
then publishes and deploys APP. Manual **Release production** is restricted to main
and runs the same checks. **Deploy infra** and **Deploy realtime** are manual main
workflows; APP releases do not restart their services.

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
`PREVIOUS_IMAGE_TAG` in this file. The renderer derives the percent-encoded DB
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
   before all 14 images publish and the APP configuration is sent by SCP.
6. The host verifies SHA-256 before extraction, acquires its deployment lock, renders
   runtime env, pulls images, runs all six migrations, rolls out APP, checks container
   health and six readiness routes through Kong, then records `.release.env`.

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

APP rollback restores `.previous-release.env`, `.previous-compose.yml` and
`.previous-env.runtime`, then pulls the old SHA images and checks health. It leaves
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

Check the affected host using `.env.runtime`; APP also needs its saved release tag:

```bash
cd /opt/workspacehub/app
sudo bash -c 'export IMAGE_TAG=$(sed -n "s/^IMAGE_TAG=//p" .release.env); docker compose --env-file .env.runtime -f compose.yml ps; bash scripts/health-check.sh'
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
configuration/build checks, data backups and manual infra/realtime deployment.
PostgreSQL major upgrades need dump/restore or a planned `pg_upgrade`; reverting an
image does not reverse stateful changes.
