"""Protect the local host workflow without reading operator envs or starting Docker."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
DOCKER = shutil.which('docker')
FIXTURE_ENV = {
    'POSTGRES_USER': 'postgres',
    'POSTGRES_PASSWORD': 'host-test-only-password',
    'POSTGRES_PORT': '5432',
    'REDIS_PORT': '6379',
    'KAFKA_PORT': '9092',
    'LIVEKIT_PORT': '7880',
    'LIVEKIT_RTC_TCP_PORT': '7881',
    'LIVEKIT_RTC_UDP_PORT': '7882',
    'LIVEKIT_API_KEY': 'host-test-only-key',
    'LIVEKIT_API_SECRET': 'host-test-only-livekit-secret',
    'LIVEKIT_EGRESS_WEBHOOK_URL': 'http://host.docker.internal:8083/api/meetings/livekit/webhook',
}


@unittest.skipUnless(DOCKER, 'Docker Compose CLI is required to validate host configuration')
class HostComposeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        version = subprocess.run([DOCKER, 'compose', 'version'], capture_output=True, text=True)
        if version.returncode:
            raise unittest.SkipTest('Docker Compose CLI is unavailable')
        cls.directory = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.directory.cleanup)
        cls.root = Path(cls.directory.name)
        for relative in (
            'backend/docker/docker-compose.host.yml',
            'deploy/shared/postgres-init/01-create-service-databases.sql',
            'backend/livekit/docker-compose.yml',
            'backend/kong-gateway/kong.host.yml',
        ):
            target = cls.root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / relative, target)
        fake_env = ''.join(f'{key}={value}\n' for key, value in FIXTURE_ENV.items())
        for relative in ('backend/docker/.env', 'backend/livekit/.env'):
            (cls.root / relative).write_text(fake_env, encoding='utf-8')
        (cls.root / 'backend/kong-gateway/.env').write_text(
            'FRONTEND_URL=http://localhost:3000\n'
            'JWT_SECRET_KEY=host-test-only-jwt-secret-32-characters\n', encoding='utf-8')
        environment = dict(os.environ, **FIXTURE_ENV)
        for key in ('COMPOSE_FILE', 'COMPOSE_PROJECT_NAME', 'COMPOSE_PROFILES', 'COMPOSE_ENV_FILES'):
            environment.pop(key, None)
        result = subprocess.run(
            [DOCKER, 'compose', '--env-file', str(cls.root / 'backend/docker/.env'),
             '-f', str(cls.root / 'backend/docker/docker-compose.host.yml'),
             '--profile', 'recording', 'config', '--format', 'json'],
            cwd=cls.root, env=environment, capture_output=True, text=True,
        )
        if result.returncode:
            raise AssertionError('Host Compose validation failed with fake envs: ' + result.stderr)
        cls.configuration = json.loads(result.stdout)

    def test_host_stack_does_not_start_application_services(self):
        self.assertEqual(set(self.configuration['services']), {
            'postgres', 'redis', 'kafka', 'kafka-init', 'kong', 'livekit',
            'egress-storage-init', 'livekit-egress',
        })
        self.assertFalse(self.configuration['services']['kong'].get('depends_on'))

    def test_existing_project_container_and_volume_identity_is_preserved(self):
        self.assertEqual(self.configuration['name'], 'docker')
        for name in ('postgres', 'redis', 'kafka', 'kong', 'livekit'):
            self.assertEqual(self.configuration['services'][name]['container_name'], 'wh_' + name)
        for name in ('postgres_data', 'redis_data'):
            self.assertEqual(self.configuration['volumes'][name]['name'], 'docker_' + name)
        self.assertEqual(self.configuration['networks']['wh_network']['name'], 'wh_network')
        postgres_mount = next(mount for mount in self.configuration['services']['postgres']['volumes']
                              if mount['target'] == '/var/lib/postgresql/data')
        self.assertEqual(postgres_mount['source'], 'postgres_data')

    def test_host_gateway_uses_current_template_renderer(self):
        kong = self.configuration['services']['kong']
        self.assertEqual(kong['build']['dockerfile'], 'Dockerfile.production')
        mount = next(mount for mount in kong['volumes']
                     if mount['target'] == '/usr/local/kong/declarative/kong.template.yml')
        self.assertEqual(Path(mount['source']).resolve(),
                         (self.root / 'backend/kong-gateway/kong.host.yml').resolve())
        self.assertTrue(mount['read_only'])
        template = (ROOT / 'backend/kong-gateway/kong.host.yml').read_text(encoding='utf-8')
        self.assertIsNone(kong.get('command'))  # The image entrypoint owns secret-safe rendering.

    def test_recording_remains_optional_and_kafka_uses_shared_topics(self):
        services = self.configuration['services']
        self.assertEqual(services['livekit-egress']['profiles'], ['recording'])
        self.assertEqual(services['egress-storage-init']['profiles'], ['recording'])
        self.assertEqual(services['kafka-init']['command'], ['/bin/sh', '/init-topics.sh'])
        self.assertEqual(services['kafka-init']['depends_on']['kafka']['condition'], 'service_healthy')
        self.assertEqual(services['livekit-egress']['depends_on']['egress-storage-init']['condition'],
                         'service_completed_successfully')
        initializer = next(mount for mount in services['postgres']['volumes']
                           if mount['target'] == '/docker-entrypoint-initdb.d')
        self.assertEqual(Path(initializer['source']).resolve(),
                         (self.root / 'deploy/shared/postgres-init').resolve())
        self.assertTrue(initializer['read_only'])
