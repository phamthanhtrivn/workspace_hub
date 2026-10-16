"""Validate deployment contracts with the shared disposable CI Compose env."""
import json
import os
from pathlib import Path
import re
import subprocess
import yaml
from catalog import IMAGES

ROOT = Path(__file__).resolve().parents[2]
RUNTIME_SERVICES = {'frontend-web', 'kong', 'user-service', 'project-service',
                    'communication-service', 'document-service', 'calendar-service', 'notification-service', 'ai-service', 'ai-worker'}


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
    require(not service.get('volumes'), f'Application source/runtime mount found: {name}')
    tag = service['image'].rsplit(':', 1)[-1]
    require(re.fullmatch(r'sha-[0-9a-f]{40}', tag), f'Non-SHA application tag: {name}')
    tags.add(tag)
    require(set(service.get('depends_on', {})).issubset(RUNTIME_SERVICES), f'Remote dependency found: {name}')
    if name in RUNTIME_SERVICES:
        require(service.get('healthcheck'), f'Missing health check: {name}')
        require(service['restart'] == 'unless-stopped', f'Missing restart policy: {name}')
    if name.endswith('-service'):
        require(not service.get('ports'), f'Public backend port found: {name}')
        env = service['environment']
        require('kafka:' not in env.get('KAFKA_BROKER', ''), f'Cross-host Docker Kafka DNS: {name}')
require(all(re.fullmatch(r'sha-[0-9a-f]{40}', tag) for tag in tags), 'Invalid per-image release tags')
require(len(app) == 17, 'Expected ten application and seven migration services')
require(app['project-service']['environment']['NOTIFICATION_SERVICE_URL'] == 'http://notification-service:8084', 'Project notification URL is not configured')
require(app['communication-service']['environment']['USER_SERVICE_URL'] == 'http://user-service:8081', 'Communication user URL is not configured')
internal_keys = {app[name]['environment'].get('INTERNAL_SERVICE_KEY') for name in ('user-service', 'project-service', 'communication-service', 'document-service', 'notification-service')}
require(len(internal_keys) == 1 and None not in internal_keys, 'Internal service credentials do not match')
require(all(port['target'] == 8000 for port in app['kong'].get('ports', [])), 'Kong management port published')

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

for directory in [ROOT / 'frontend/web', *(ROOT / 'backend' / name for name in RUNTIME_SERVICES if name.endswith('-service')), ROOT / 'backend/kong-gateway', ROOT / 'deploy/shared/sql-migrations']:
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
