"""Validate deployment contracts with the shared disposable CI Compose env."""
import json
import os
from pathlib import Path
import re
import subprocess
import yaml
from catalog import BACKENDS, IMAGES, PINNED_APP_SERVICES, RUNTIME

ROOT = Path(__file__).resolve().parents[2]
RUNTIME_SERVICES = set(RUNTIME)
MIGRATION_SERVICES = {f'{name}-service-migration' for name in BACKENDS} | {'notebook-db-bootstrap', 'ai-service-migration'}
ALLOWED_APP_VOLUMES = {'caddy', 'notebook-qdrant', 'rag-worker', 'notebook-db-bootstrap'}
VOLUME_CHECKED_SERVICES = RUNTIME_SERVICES - {'caddy', 'notebook-qdrant', 'rag-worker'}


def configuration(area, profile=None):
    command = ['docker', 'compose', '--env-file', os.environ['CI_COMPOSE_ENV'], '-f', f'deploy/{area}/compose.yml']
    if profile:
        command.extend(['--profile', profile])
    return json.loads(subprocess.check_output(command + ['config', '--format', 'json'], cwd=ROOT, text=True))


def require(condition, message):
    if not condition:
        raise AssertionError(message)


for name, entry in IMAGES.items():
    dockerfile = ROOT / entry['dockerfile']
    require((ROOT / entry['context']).is_dir(), f'Missing image context: {name}')
    require(dockerfile.is_file(), f'Missing release Dockerfile: {name}')
    targets = re.findall(r'^FROM\s+\S+\s+AS\s+(\S+)', dockerfile.read_text(), re.MULTILINE | re.IGNORECASE)
    require(entry['target'] in targets, f'Missing release target: {name}')


app = configuration('prod/app', 'migration')['services']
tags = set()
for name, service in app.items():
    require('build' not in service, f'Production build found: {name}')
    if name not in ALLOWED_APP_VOLUMES:
        require(not service.get('volumes'), f'Application source/runtime mount found: {name}')
    if name not in PINNED_APP_SERVICES and name != 'notebook-db-bootstrap':
        tag = service['image'].rsplit(':', 1)[-1]
        require(re.fullmatch(r'sha-[0-9a-f]{40}', tag), f'Non-SHA application tag: {name}')
        tags.add(tag)
    require(set(service.get('depends_on', {})).issubset(RUNTIME_SERVICES), f'Remote dependency found: {name}')
    if name in RUNTIME_SERVICES and name != 'notebook-qdrant':
        require(service.get('healthcheck'), f'Missing health check: {name}')
        require(service['restart'] == 'unless-stopped', f'Missing restart policy: {name}')
    if name.endswith('-service'):
        require(not service.get('ports'), f'Public backend port found: {name}')
        env = service['environment']
        require('kafka:' not in env.get('KAFKA_BROKER', ''), f'Cross-host Docker Kafka DNS: {name}')
require(all(re.fullmatch(r'sha-[0-9a-f]{40}', tag) for tag in tags), 'Invalid per-image release tags')
require(set(app) == (RUNTIME_SERVICES | MIGRATION_SERVICES), 'Application services do not match deployment catalog')
require(app['project-service']['environment']['NOTIFICATION_SERVICE_URL'] == 'http://notification-service:8084', 'Project notification URL is not configured')
require(app['communication-service']['environment']['USER_SERVICE_URL'] == 'http://user-service:8081', 'Communication user URL is not configured')
require(app['communication-service']['environment']['DOCUMENT_SERVICE_URL'] == 'http://document-service:8085', 'Communication document URL is not configured')
require(app['kong']['environment'].get('KONG_DNS_VALID_TTL') == '5', 'Kong DNS TTL is not bounded')
require(not app['frontend-web'].get('ports'), 'frontend-web should not expose direct public port when fronted by Caddy')
require(all(port['target'] == 8000 for port in app['kong'].get('ports', [])), 'Kong management port published')

# Verify directional service key contracts across callers and receivers.
directional_pairs = [
    ('project-service', 'user-service', 'PROJECT_TO_USER_KEY'),
    ('communication-service', 'user-service', 'COMMUNICATION_TO_USER_KEY'),
    ('document-service', 'user-service', 'DOCUMENT_TO_USER_KEY'),
    ('calendar-service', 'user-service', 'CALENDAR_TO_USER_KEY'),
    ('notification-service', 'user-service', 'NOTIFICATION_TO_USER_KEY'),
    ('notebook-api', 'user-service', 'AI_TO_USER_KEY'),
    ('project-service', 'communication-service', 'PROJECT_TO_COMMUNICATION_KEY'),
    ('communication-service', 'project-service', 'COMMUNICATION_TO_PROJECT_KEY'),
    ('project-service', 'document-service', 'PROJECT_TO_DOCUMENT_KEY'),
    ('document-service', 'project-service', 'DOCUMENT_TO_PROJECT_KEY'),
    ('project-service', 'notification-service', 'PROJECT_TO_NOTIFICATION_KEY'),
    ('calendar-service', 'communication-service', 'CALENDAR_TO_COMMUNICATION_KEY'),
    ('notebook-api', 'project-service', 'AI_TO_PROJECT_KEY'),
    ('notebook-api', 'calendar-service', 'AI_TO_CALENDAR_KEY'),
    ('notebook-api', 'communication-service', 'AI_TO_COMMUNICATION_KEY'),
    ('communication-service', 'notebook-api', 'COMMUNICATION_TO_AI_KEY'),
    ('calendar-service', 'document-service', 'CALENDAR_DOCUMENT_SERVICE_KEY'),
    ('notebook-api', 'document-service', 'AI_DOCUMENT_SERVICE_KEY'),
    ('kong', 'notebook-api', 'AI_GATEWAY_KEY'),
]
for caller, receiver, key_name in directional_pairs:
    c_val = app[caller]['environment'].get(key_name)
    r_val = app[receiver]['environment'].get(key_name)
    require(c_val and c_val == r_val, f'Mismatched directional key {key_name} between {caller} and {receiver}')

infra = configuration('prod/infra')['services']
require('localhost' not in infra['kafka']['environment']['KAFKA_ADVERTISED_LISTENERS'], 'Remote Kafka advertises localhost')
for name in ('postgres', 'redis', 'kafka'):
    require(any(mount['type'] == 'volume' for mount in infra[name]['volumes']), f'Missing persistent {name} volume')
realtime = configuration('prod/realtime')['services']
for name, service in realtime.items():
    require('redis' not in service.get('depends_on', {}), f'Remote Redis dependency: {name}')
    require(service.get('network_mode') == 'host', f'Realtime host networking missing: {name}')

for config in (app, infra, realtime):
    for name, service in config.items():
        image = service.get('image')
        if not image:
            require('build' in service, f'No build or image: {name}')
            continue
        tag = image.split('@')[0].rsplit(':', 1)[-1]
        # PostgreSQL 10+ uses major.patch numbering, such as 15.18.
        pinned = re.match(r'^(sha-[0-9a-f]{40}|v?\d+\.\d+\.\d+)', tag)
        pinned = pinned or re.match(r'^postgres:\d+\.\d+-alpine', image)
        require(pinned, f'Unpinned image: {image}')
        require('accept-data-loss' not in json.dumps(service.get('command', '')), f'Destructive command: {name}')

dockerfile_dirs = [
    ROOT / 'frontend/web',
    *(ROOT / 'backend' / f'{name}-service' for name in BACKENDS),
    ROOT / 'backend/kong-gateway',
    ROOT / 'backend/ai-service/api',
    ROOT / 'backend/ai-service/rag-worker',
    ROOT / 'backend/ai-service/speech-worker',
    ROOT / 'deploy/shared/sql-migrations',
]
for directory in dockerfile_dirs:
    for dockerfile in directory.glob('Dockerfile*'):
        for base in re.findall(r'^FROM\s+(\S+)', dockerfile.read_text(), flags=re.MULTILINE):
            if ':' in base:
                require(re.search(r':v?\d+\.\d+\.\d+', base) or re.match(r'^postgres:\d+\.\d+-alpine', base), f'Unpinned base image: {dockerfile}')
for template in ('livekit', 'egress'):
    json.loads((ROOT / f'deploy/prod/realtime/{template}.yaml').read_text())
for directory in (ROOT / '.github', ROOT / 'deploy'):
    for path in (*directory.rglob('*.yml'), *directory.rglob('*.yaml')):
        yaml.safe_load(path.read_text())
print('Deployment contract checks passed')
