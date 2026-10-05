# WorkSpaceHub Docker and AWS deployment

## Architecture and repository commands

All commands below run from the repository root unless another directory is shown.
The app, realtime and infrastructure hosts are three Linux **x86_64** EC2 instances
in the same VPC. Use stable private IPs or private DNS between hosts. GitHub builds
images; EC2 downloads deployment artifacts and pulls images without a Git checkout.

| Host | Runtime directory | Services |
| --- | --- | --- |
| EC2-1 APP | `/opt/workspacehub/app` | web, Kong, user, project, communication, document, calendar, notification |
| EC2-2 REALTIME | `/opt/workspacehub/realtime` | LiveKit, Egress |
| EC2-3 INFRA | `/opt/workspacehub/infra` | PostgreSQL, Redis, Kafka, topic initializer |

Development uses one default Compose bridge network and persistent named volumes:

```bash
cp deploy/dev/.env.example deploy/dev/.env
# Edit deploy/dev/.env. Set real provider configuration where you use integrations.
docker compose --env-file deploy/dev/.env -f deploy/dev/compose.yml up -d --build
docker compose --env-file deploy/dev/.env -f deploy/dev/compose.yml --profile realtime up -d --build
docker compose --env-file deploy/dev/.env -f deploy/dev/compose.yml down
```

Frontend: `http://localhost:3000`; Kong: `http://localhost:8000`.
Development service and database ports bind to loopback. Kong Admin is disabled.
Nest and frontend source bind mounts retain hot reload. Maven retains the existing
development command; restart the user container after Java edits when necessary.
Stopping the stack preserves volumes. Old Compose paths have been retired.
Set `DEV_IMAGE_TAG` in the local env file to `sha-<git rev-parse HEAD>` for explicitly
tagged local build images. The example SHA is a placeholder; source bind mounts
still reflect working-tree edits without rebuilding. These images stay local.
The new Compose project uses separate volume names, so existing legacy data is
not automatically adopted. Back up and restore it explicitly before switching.

Prisma migration creation is explicit, for example:

```bash
docker compose --env-file deploy/dev/.env -f deploy/dev/compose.yml exec communication-service npx prisma migrate dev --name change_name
```

Startup applies committed migrations without accepting destructive schema changes.
Project and user schemas use SQL, not Prisma Migrate. Their one-shot development
migration containers finish before the applications start. After adding SQL files,
rerun those migration containers explicitly before restarting the affected service.
Use percent-encoded passwords in `POSTGRES_PASSWORD_URLENCODED`; username should be
a simple PostgreSQL identifier. Production derives the encoded password automatically.

## Pinned image versions and release names

| Component | Image/version | Purpose |
| --- | --- | --- |
| PostgreSQL | `postgres:15.18-alpine` + digest in source | infra and SQL migration runner |
| Redis | `redis:7.4.8-alpine` + digest in source | persistent cache and LiveKit coordination |
| Kafka | `apache/kafka:4.3.1` + digest in source | KRaft single broker and topic initialization |
| Kong | `kong:3.9.1` + digest in source | gateway with `jwt-user-context` |
| LiveKit | `livekit/livekit-server:v1.13.5` + digest in source | preserve existing server pin |
| Egress | `livekit/egress:v1.14.1` + digest in source | recording worker |
| Node | `node:22.22.0-alpine3.23` + digest in source | Node development, builds and runtime |
| Maven development | `maven:3.9.6-eclipse-temurin-21` + digest in source | existing Java development version |
| Maven production builder | `maven:3.9.9-eclipse-temurin-21` + digest in source | existing Java production builder |
| Java runtime | `eclipse-temurin:21.0.7_6-jre-alpine` + digest in source | existing JRE runtime |

PostgreSQL, Redis and Kafka versions were read from the locally used floating
images and then pinned by version and digest. Egress uses the installed explicit
version. Other existing production pins are preserved.
Development Node images now match the repository's already pinned production
Node 22.22.0 toolchain, keeping framework and Prisma builds consistent.
Maven's combined tags
pin Maven and the JDK major; the repository's existing published combination is
retained because a more specific combined JDK patch tag has not been established;
the digest fixes the full combined image, including its JDK build.
Patch tags with digests remain fixed even if their Alpine alias is republished.

Eight runtime repositories are `workspacehub-web`, `workspacehub-kong`, and
`workspacehub-{user,project,communication,document,calendar,notification}-service`.
Six additional `workspacehub-<service>-migration` repositories hold migration tools.
Every image in a release uses `<namespace>/<repository>:sha-<full Git commit SHA>`.
EC2 never deploys branch aliases or floating tags.

Create a Docker Hub namespace and these 14 repositories. Enable immutable SHA tags
in Docker Hub (all tags, or a `sha-` tag rule). Create an access token with push access
and add it as the GitHub production environment secret `DOCKERHUB_TOKEN`.
Add `DOCKERHUB_USERNAME` as a variable. Existing SHA images are reused on redeployment;
changing public browser configuration requires a new commit and frontend build.

Private repositories: set GitHub variable `DOCKERHUB_PRIVATE_REPOSITORIES=true`,
and create `/workspacehub/prod/dockerhub/username` (String) and
`/workspacehub/prod/dockerhub/token` (SecureString, pull-only token). EC2-1 logs in
through stdin. Public repositories need neither host parameter.

## GitHub, IAM and EC2 bootstrap

Create a GitHub Environment named **production**, restrict deployment branches to
`main`, and configure reviewers if desired. PR CI does not publish images or assume
AWS credentials. Keep these variables in the production environment; expose public
build values at repository level too if PR images should use the same public values.

| Name | Type | Use |
| --- | --- | --- |
| `DOCKERHUB_TOKEN` | secret | GitHub image publication only |
| `DOCKERHUB_USERNAME` | variable | image namespace, also an APP runtime parameter |
| `DOCKERHUB_PRIVATE_REPOSITORIES` | variable, optional, default false | host pull authentication |
| `AWS_REGION` | variable | AWS workflow region |
| `AWS_ROLE_ARN` | variable | GitHub OIDC role |
| `APP_EC2_INSTANCE_ID` | variable | app SSM target |
| `REALTIME_EC2_INSTANCE_ID` | variable | realtime SSM target |
| `INFRA_EC2_INSTANCE_ID` | variable | infra SSM target |
| `DEPLOY_ARTIFACT_BUCKET` | variable | private S3 configuration bundle bucket |
| `NEXT_PUBLIC_API_URL` | public build variable | browser API base URL, without `/api` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | public build variable | Google browser client |
| `NEXT_PUBLIC_NOMINATIM_URL` | public build variable | geocoding URL |
| `NEXT_PUBLIC_ASSET_HOST` | public build variable, optional | asset hostname, without scheme |

Set API URL consistently with the frontend's existing API client; the example is
`http://<APP_PUBLIC_IP>:8000`. Google client IDs are public; provider passwords and
JWT secrets are runtime values. No permanent AWS keys or SSH keys are needed in GitHub.

Create an IAM OIDC provider with URL `https://token.actions.githubusercontent.com`
and audience `sts.amazonaws.com`. Create `GitHubActionsWorkspaceHubRole` with:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"},
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {"StringEquals": {
      "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      "token.actions.githubusercontent.com:sub": "repo:phamthanhtrivn/workspace_hub:environment:production"
    }}
  }]
}
```

The environment restriction and workflow main-branch guards are both required.
Give this role `ssm:SendCommand` on the three instance ARNs and
`arn:aws:ssm:<REGION>::document/AWS-RunShellScript`, `ssm:GetCommandInvocation` on `*`
(that operation has no instance resource scope), and `s3:PutObject` on
`arn:aws:s3:::<ARTIFACT_BUCKET>/workspacehub/*`. It does not need runtime secret access.
Create a private encrypted artifact bucket with public access blocked and retention
long enough to retain the previous releases. SSE-S3 works without an extra KMS grant;
for SSE-KMS grant only the required encryption/decryption rights to the respective roles.

Each EC2 role needs `AmazonSSMManagedInstanceCore`, `s3:GetObject` on its own
`workspacehub/<role>/*` artifact prefix, and `ssm:GetParametersByPath` on
`arn:aws:ssm:<REGION>:<ACCOUNT_ID>:parameter/workspacehub/prod/<role>/*`.
Add `kms:Decrypt` for the customer managed key if SecureStrings use one.
EC2-1 alone needs optional Docker Hub `ssm:GetParameter` on the two Docker Hub
parameters and application S3 access scoped to the bucket/object prefixes used.
EC2-2 needs recording bucket access if Egress outputs to S3.
Use the default SDK credential chain, not static AWS keys. For bridge-network
containers to reach IMDSv2, set the EC2 metadata response hop limit to **2**, keep
IMDSv2 tokens required, and validate role access from the application containers.

Bootstrap each **Ubuntu 24.04 x86_64** host through an administrative SSM session or
emergency SSH. Install Docker from its official Ubuntu repository, Compose v2,
AWS CLI v2, Python 3, curl, tar, sha256sum and flock. Example:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl unzip python3 util-linux
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo 'deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu noble stable' | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
curl -fsSL https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp
sudo /tmp/aws/install --update
sudo systemctl enable --now docker
sudo mkdir -p /opt/workspacehub/{app,infra,realtime}
sudo aws configure set region <AWS_REGION>
docker compose version
aws --version
```

Attach each IAM instance profile, install/enable the SSM agent if the AMI does not
include it, and verify the instance is Online in Systems Manager. SSM requires
outbound HTTPS to its service endpoints (or VPC endpoints); image pulls require
registry internet access, and S3 needs internet or its VPC endpoint. No inbound SSH
is required for normal releases. Give INFRA sufficient EBS capacity and establish
database/EBS backup and restore procedures before keeping production data.

EC2 instance-role trust uses `ec2.amazonaws.com` with `sts:AssumeRole`.
On Ubuntu AMIs using the snap SSM agent, verify/install it with:

```bash
sudo snap list amazon-ssm-agent || sudo snap install amazon-ssm-agent --classic
sudo systemctl enable --now snap.amazon-ssm-agent.amazon-ssm-agent.service
```

Official references: [AWS OIDC providers](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html),
[SSM Run Command](https://docs.aws.amazon.com/systems-manager/latest/userguide/run-command.html),
[LiveKit Egress deployment](https://docs.livekit.io/transport/self-hosting/egress/).

## Runtime parameters, networking and first deployment

Parameter Store names are `/workspacehub/prod/<role>/<ENV_NAME>`. Use the exact
uppercase names below. Sensitive values use SecureString; others use String.
These host-specific prefixes intentionally differ from the suggested domain
prefixes in the original brief so IAM access is limited by host role.

| Role | Required parameter names |
| --- | --- |
| APP | `DOCKERHUB_USERNAME`, `INFRA_PRIVATE_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `FRONTEND_URL`, `JWT_SECRET_KEY`, `INTERNAL_SERVICE_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME`, `GOOGLE_CLIENT_ID`, `LIVEKIT_URL`, `LIVEKIT_PUBLIC_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |
| INFRA | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `INFRA_BIND_HOST`, `KAFKA_ADVERTISED_HOST` |
| REALTIME | `INFRA_PRIVATE_HOST`, `LIVEKIT_URL`, `LIVEKIT_PUBLIC_IP`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_WEBHOOK_URL` |

Optional APP parameters: `AWS_CLOUDFRONT_URL`, `MAIL_FROM`, `MAIL_PORT` (587),
`FRONTEND_PORT` (3000), `KONG_PORT` (8000). APP and INFRA PostgreSQL credentials must
match. APP and REALTIME LiveKit credentials must match. JWT secret must be at least
32 random characters and shared by user-service, the Nest services and Kong.
Generate valid VAPID keys, for example with the installed notification dependency:
`node -e "console.log(require('./backend/notification-service/node_modules/web-push').generateVAPIDKeys())"`.
Keep the private result in Parameter Store. Google secret is not used by current
application configuration and is therefore not requested.

Use SecureString for `POSTGRES_PASSWORD`, `JWT_SECRET_KEY`, `INTERNAL_SERVICE_KEY`,
`LIVEKIT_API_SECRET`, `MAIL_PASSWORD`, `VAPID_PRIVATE_KEY` and the optional Docker Hub
pull token. Service HTTP URLs are derived from local Compose DNS on EC2-1;
`INTERNAL_SERVICE_KEY` is shared by the services that protect internal operations.

Create values in the AWS console, or with protected local files rather than
placing secrets into shell history:

```bash
aws ssm put-parameter --name /workspacehub/prod/app/JWT_SECRET_KEY --type SecureString --value file:///path/to/private-secret.txt
```

Value files must contain one line without a trailing newline. The dotenv renderer
rejects multiline values; this application does not require PEM-style env values.

Do not store `IMAGE_TAG` in Parameter Store; the release script controls it.
Deployment fetches parameters on EC2 without logging values, writes mode-0600
dotenv files, URL-encodes the DB password, and generates LiveKit/Egress runtime
config. Committed realtime YAML contains configuration templates, not keys.
Use stable host addresses: APP `INFRA_PRIVATE_HOST` and INFRA `KAFKA_ADVERTISED_HOST`
both address EC2-3; `INFRA_BIND_HOST` is EC2-3's actual private interface IP.
Kafka metadata advertises that reachable private endpoint on 9092.

REALTIME `LIVEKIT_URL` is its local/private websocket URL; APP `LIVEKIT_URL` addresses
EC2-2 privately. APP `LIVEKIT_PUBLIC_URL` addresses EC2-2 from browsers.
`LIVEKIT_PUBLIC_IP` is EC2-2's public IP used by ICE. Set webhook URL to
`http://<APP_PRIVATE_HOST>:8000/api/meetings/livekit/webhook` (adjust Kong port).
Egress shares EC2-3 Redis with LiveKit. Both realtime services use host networking
to make advertised WebRTC ports match the host. Egress's health port 9090 and metrics
9091 need no public access. The repository currently has LiveKit meetings and S3
media storage but no recording-start operation; Egress provides the worker without
inventing recording business logic. Future S3 egress outputs should use EC2-2's
role and the configured recording bucket.

| Security group | Inbound rule |
| --- | --- |
| APP | TCP 3000 and 8000 from intended clients during initial IP-based testing; later 80/443 at your proxy |
| APP | TCP 8000 from REALTIME group for the signed LiveKit webhook |
| REALTIME | TCP 7880 signaling, TCP 7881 fallback, UDP 7882 media from intended clients |
| REALTIME | TCP 7880 from APP group for server API calls |
| INFRA | TCP 5432 from APP group only |
| INFRA | TCP 6379 from APP and REALTIME groups only |
| INFRA | TCP 9092 from APP group only |

Do not publish 8081–8086, Kong 8001/8444, or Egress management ports publicly.
Do not allow 5432/6379/9092 from `0.0.0.0/0`. Redis and Kafka use private plaintext
listeners in this initial VPC design; network isolation is required.

First deployment order:

1. Prepare VPC, instances, security groups, IAM, SSM, Docker Hub, GitHub environment,
   artifact bucket and host parameters. These must exist before workflows can run.
2. Merge the reviewed deployment changes into `main`. Do not commit `.env` files.
   If automatic APP release runs before INFRA is ready, it fails without marking success.
3. Dispatch **Deploy infra** on main. PostgreSQL creates the six service databases;
   Redis and Kafka persist data; the initializer creates existing application topics.
4. Dispatch **Deploy realtime** on main and verify signaling, ICE and webhook reachability.
5. Dispatch **Release production** on main (or use the next main push). It builds the
   eight runtime and six migration images, uploads the app bundle to S3, authenticates
   with OIDC, and executes SSM. All build jobs must succeed before deployment.
6. EC2-1 locks the release, retains previous config/environment, pulls candidate
   images, runs all six migrations, starts applications, verifies container health
   and six readiness routes through Kong, then atomically records `.release.env`.

SSM completion is polled; failures fail the workflow. Artifact SHA-256 is checked
before extraction. INFRA/REALTIME deployments are manual and do not run on every
application push. The deployed artifact contains only host configuration, scripts
and (for INFRA) database init files. No full checkout or application build is needed.

Before domains exist, use public IP URLs for basic HTTP testing. Browser microphone,
camera and web push need a secure browser context; full meeting capture requires
HTTPS (or a local trusted testing setup). Configure Google's permitted origins and
S3 CORS to match the actual frontend URL. Later configure `app.<domain>`,
`api.<domain>`, `live.<domain>`, TLS certificates and a reverse proxy, update frontend
build variables and runtime URLs, and release a new commit. No Compose host split
changes are needed. IP-only HTTP is not claimed to support all browser features.

## Migrations, verification, rollback and upgrades

Four Prisma migration images run the installed Prisma 6 `migrate deploy` command.
User/project SQL migration images execute files in numeric filename order, record
filenames and SHA-256 checksums, lock the database migration session, and transact
each file. The two existing project V20 files are distinct filename identities.
Changed applied SQL files fail instead of silently reapplying. Partial migration
progress is recorded; a failed migration blocks container rollout. Spring production
continues to validate its schema rather than generate it.

Existing databases previously created with `db push`, Hibernate update, manual SQL
or another history format require a reviewed baseline before this first deployment.
Compare actual schema to migration histories, back up, and reconcile/mark history
only after verifying equivalence. Never automatically baseline populated databases,
reset databases, or accept data loss. Applying historical migrations blindly to an
existing database will intentionally fail. PostgreSQL init files run only for empty
volumes; adding a database later requires an explicit administrative operation.

On each host:

```bash
cd /opt/workspacehub/<app-or-infra-or-realtime>
sudo docker compose --env-file .env.production -f compose.yml ps
# APP additionally needs the release tag exported:
cd /opt/workspacehub/app
sudo bash -c 'export IMAGE_TAG=$(sed -n "s/^IMAGE_TAG=//p" .release.env); docker compose --env-file .env.production -f compose.yml ps; bash scripts/health-check.sh'
curl -fsS http://<APP_PUBLIC_HOST>:3000/ >/dev/null
curl -fsS http://<APP_PUBLIC_HOST>:8000/health/user
curl -fsS http://<REALTIME_HOST>:7880/
```

For logs, use the same Compose invocation with `logs --tail 100 <service>` and
handle logs as private operational data. Inspect SSM command status in AWS if the
workflow fails; the workflow intentionally does not copy secret-bearing provider
error output into GitHub logs. Check `docker compose exec postgres pg_isready`,
`docker compose exec redis redis-cli ping`, and Kafka topic list using the host's
Compose invocation. Verify a browser login, websocket connection, meeting join,
S3 upload and calendar notification after the first release.

Automatic APP rollback uses `.previous-release.env`, `.previous-compose.yml` and
`.previous-env.production`; it restores the old immutable images and checks health.
The workflow remains failed when the candidate failed, even if rollback succeeded.
First release failures have no previous version to restore. Manual rollback:

```bash
sudo bash /opt/workspacehub/app/scripts/rollback.sh
```

Rollback does **not** reverse database migrations. Require backward-compatible
expand/contract migrations when automatic application rollback must remain safe;
breaking schema changes need a separately coordinated maintenance deployment.
Images are not automatically pruned, preserving current/previous rollback images.
Remove old images only after confirming their tags are not referenced by either
release state. Protect mode-0600 previous environment snapshots as runtime secrets.
INFRA/REALTIME updates do not implement application-style automatic data rollback.

**Never run `docker compose down -v` in production unless intentionally deleting data.**

### Updating infrastructure image versions

Pinned images do not follow upstream releases. Read release notes, confirm protocol,
schema and platform compatibility, update the exact version/digest in source, run
CI and local configuration/build checks, back up stateful data, dispatch the affected
workflow, and verify health. App base image changes use a new SHA release. PostgreSQL
major upgrades need a planned dump/restore or `pg_upgrade` procedure; reverting an
image tag is not a data migration or a reliable stateful rollback.

Local configuration checks:

```bash
bash deploy/scripts/validate-config.sh
```

CI validates Compose, shell and deployment regression tests, read-only lint,
available unit tests, Node builds, Maven verify and every production/migration
Docker target. Lint is currently advisory because all six existing Node projects
have pre-existing lint errors (no application code was reformatted to hide them).
Builds, tests and deployment checks remain required. Remove lint's
`continue-on-error` once that separate cleanup is complete. Cloud resources,
provider accounts, public DNS/TLS, network reachability,
and end-to-end S3/WebRTC behavior still require verification in your AWS environment.
