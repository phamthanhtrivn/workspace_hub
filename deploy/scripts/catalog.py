"""One deployment catalog shared by planning, CI and the EC2 runtime."""
BACKENDS = ('user', 'project', 'communication', 'document', 'calendar', 'notification')
ROLES = ('infra', 'realtime', 'app')
HOST_SERVICES = {'infra': ('postgres', 'redis', 'kafka'), 'realtime': ('livekit', 'egress')}
RUNTIME = tuple(f'{name}-service' for name in BACKENDS) + ('kong', 'frontend-web')
IMAGES = {}
for service in RUNTIME:
    directory = 'frontend/web' if service == 'frontend-web' else f'backend/{"kong-gateway" if service == "kong" else service}'
    IMAGES[service] = dict(service=service, name='web' if service == 'frontend-web' else service,
                           context=directory, dockerfile=f'{directory}/Dockerfile.production', target='production')
for backend in BACKENDS:
    service = f'{backend}-service-migration'
    sql = backend in ('user', 'project')
    IMAGES[service] = dict(service=service, name=service, context='.' if sql else f'backend/{backend}-service',
                           dockerfile='deploy/shared/sql-migrations/Dockerfile' if sql else f'backend/{backend}-service/Dockerfile.production',
                           target=backend if sql else 'migration')


def tag_variable(service):
    return service.upper().replace('-', '_') + '_IMAGE_TAG'


def classify(paths):
    images, roles, checks = set(), set(), set()
    for path in paths:
        if any(part.startswith('.env') for part in path.split('/')):
            continue
        if path.startswith('.github/workflows/') or path in ('deploy/scripts/catalog.py', 'deploy/scripts/plan-release.py', 'deploy/scripts/release_state.py', 'deploy/scripts/read-host-state.py'):
            images.update(IMAGES)
            roles.add('app')
            checks.update(RUNTIME)
        for service in RUNTIME:
            directory = IMAGES[service]['context'] + '/'
            if path.startswith(directory):
                images.add(service)
                checks.add(service)
                roles.add('app')
                relative = path[len(directory):]
                if service.endswith('-service') and (relative.startswith(('prisma/', 'database/migrations/', 'src/main/resources/db/migration/')) or relative in ('package.json', 'package-lock.json', 'pom.xml', '.dockerignore') or relative.startswith('Dockerfile')):
                    images.add(service + '-migration')
        if path == '.dockerignore' or path.startswith('deploy/shared/sql-migrations/'):
            images.update(('user-service-migration', 'project-service-migration'))
            roles.add('app')
            checks.update(('user-service', 'project-service'))
        if path.startswith(('deploy/prod/infra/', 'deploy/shared/postgres-init/', 'deploy/shared/kafka/')):
            roles.add('infra')
        if path.startswith('deploy/prod/realtime/'):
            roles.add('realtime')
        if path.startswith('deploy/prod/app/'):
            roles.add('app')
            checks.update(RUNTIME)
        if path in ('deploy/scripts/render-runtime.py', 'deploy/scripts/bootstrap-app-env.sh', 'deploy/scripts/install-release.sh', 'deploy/scripts/send-deployment.py', 'deploy/scripts/verify-host-plan.py', 'deploy/scripts/release-host.py', 'deploy/scripts/requirements.txt'):
            roles.update(ROLES)
            checks.update(RUNTIME)
        if path in ('deploy/scripts/deploy-app.sh', 'deploy/scripts/release-app.py', 'deploy/scripts/verify-host-plan.py', 'deploy/scripts/common.sh', 'deploy/scripts/health-check.sh', 'deploy/scripts/rollback.sh', 'deploy/scripts/migrate.sh'):
            roles.add('app')
            checks.update(RUNTIME)
    return images, roles, checks
