"""One deployment catalog shared by planning, CI and the EC2 runtime."""
BACKENDS = ('user', 'project', 'communication', 'document', 'calendar', 'notification')
ROLES = ('infra', 'realtime', 'app')
HOST_SERVICES = {'infra': ('postgres', 'redis', 'kafka'), 'realtime': ('livekit', 'egress', 'caddy')}
APP_CORE = tuple(f'{name}-service' for name in BACKENDS) + ('kong', 'frontend-web')
AI_IMAGES = ('ai-service', 'rag-worker', 'speech-worker')
AI_RUNTIME = ('notebook-qdrant', 'rag-worker', 'speech-worker', 'notebook-api', 'notebook-jobs')
RUNTIME = APP_CORE + AI_RUNTIME + ('caddy',)
LEGACY_IMAGES = set(APP_CORE) | {f'{name}-service-migration' for name in BACKENDS}
PINNED_APP_SERVICES = ('notebook-qdrant', 'caddy')

IMAGES = {}
for service in APP_CORE:
    directory = 'frontend/web' if service == 'frontend-web' else f'backend/{"kong-gateway" if service == "kong" else service}'
    IMAGES[service] = dict(service=service, name='web' if service == 'frontend-web' else service,
                           context=directory, dockerfile=f'{directory}/Dockerfile.production', target='production')
for backend in BACKENDS:
    service = f'{backend}-service-migration'
    sql = backend in ('user', 'project')
    IMAGES[service] = dict(service=service, name=service, context='.' if sql else f'backend/{backend}-service',
                           dockerfile='deploy/shared/sql-migrations/Dockerfile' if sql else f'backend/{backend}-service/Dockerfile.production',
                           target=backend if sql else 'migration')
IMAGES['ai-service'] = dict(service='ai-service', name='ai-service', context='backend/ai-service/api',
                             dockerfile='backend/ai-service/api/Dockerfile', target='production')
IMAGES['rag-worker'] = dict(service='rag-worker', name='rag-worker', context='backend/ai-service/rag-worker',
                             dockerfile='backend/ai-service/rag-worker/Dockerfile', target='production')
IMAGES['speech-worker'] = dict(service='speech-worker', name='speech-worker', context='backend/ai-service/speech-worker',
                                dockerfile='backend/ai-service/speech-worker/Dockerfile', target='production')

IMAGE_TO_RUNTIME = {
    **{service: (service,) for service in APP_CORE},
    'ai-service': ('notebook-api', 'notebook-jobs'),
    'rag-worker': ('rag-worker',),
    'speech-worker': ('speech-worker',),
}
IMAGE_TO_MIGRATIONS = {
    **{f'{backend}-service-migration': (f'{backend}-service-migration',) for backend in BACKENDS},
    'ai-service': ('notebook-db-bootstrap', 'ai-service-migration'),
}
PYTHON_WORKERS = {'rag-worker': 'backend/ai-service/rag-worker', 'speech-worker': 'backend/ai-service/speech-worker'}


def tag_variable(service):
    return service.upper().replace('-', '_') + '_IMAGE_TAG'


def classify(paths):
    images, roles, checks = set(), set(), set()
    for path in paths:
        if path.startswith('tests/'):
            checks.update(APP_CORE + AI_IMAGES)
        if any(part.startswith('.env') for part in path.split('/')):
            continue
        if path.startswith(('backend/docker/', 'backend/livekit/', 'backend/scripts/', 'deploy/dev/')) or path == 'backend/kong-gateway/kong.host.yml':
            continue
        if path.startswith('.github/workflows/') or path in ('deploy/scripts/catalog.py', 'deploy/scripts/plan-release.py', 'deploy/scripts/release_state.py', 'deploy/scripts/read-host-state.py'):
            images.update(IMAGES)
            roles.add('app')
            checks.update(APP_CORE + AI_IMAGES)
        for service, entry in IMAGES.items():
            if service.endswith('-migration'):
                continue
            directory = entry['context'] + '/'
            if path.startswith(directory):
                relative = path[len(directory):]
                if relative.endswith('.md') or relative == 'Dockerfile' or relative.startswith(('tests/', 'test/')) or relative.endswith(('.spec.ts', '.test.ts', '.test.cjs', '.spec.mjs')):
                    checks.add(service)
                    continue
                images.add(service)
                checks.add(service)
                roles.add('app')
                if service.endswith('-service') and service != 'ai-service' and (
                    relative.startswith(('prisma/', 'database/migrations/', 'src/main/resources/db/migration/', 'migrations/'))
                    or relative in ('package.json', 'package-lock.json', 'pom.xml', '.dockerignore', 'requirements.txt', 'alembic.ini')
                    or relative.startswith('Dockerfile')
                ):
                    images.add(service + '-migration')
        if path == '.dockerignore' or path.startswith('deploy/shared/sql-migrations/'):
            images.update(('user-service-migration', 'project-service-migration'))
            roles.add('app')
            checks.update(('user-service', 'project-service'))
        if path.startswith(('deploy/prod/infra/', 'deploy/shared/postgres-init/', 'deploy/shared/kafka/')):
            roles.add('infra')
        if path.startswith('deploy/prod/realtime/'):
            roles.add('realtime')
        if path.startswith(('deploy/prod/app/', 'deploy/ai/bootstrap-db.sh')):
            roles.add('app')
            checks.update(APP_CORE + AI_IMAGES)
        if path in ('deploy/scripts/render-runtime.py', 'deploy/scripts/install-release.sh', 'deploy/scripts/send-deployment.py', 'deploy/scripts/verify-host-plan.py', 'deploy/scripts/release-host.py', 'deploy/scripts/requirements.txt'):
            roles.update(ROLES)
            checks.update(APP_CORE + AI_IMAGES)
        if path in ('deploy/scripts/deploy-app.sh', 'deploy/scripts/release-app.py', 'deploy/scripts/verify-host-plan.py', 'deploy/scripts/common.sh', 'deploy/scripts/health-check.sh', 'deploy/scripts/rollback.sh'):
            roles.add('app')
            checks.update(APP_CORE + AI_IMAGES)
    return images, roles, checks
