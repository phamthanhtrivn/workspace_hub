import json
import fcntl
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts'
OLD = 'sha-' + '1' * 40
NEW = 'sha-' + '2' * 40


class RuntimeRenderingTests(unittest.TestCase):
    def test_literals_and_password_encoding(self):
        with tempfile.TemporaryDirectory() as directory:
            secret = "p$#a'ss\\word"
            payload = {'Parameters': [{'Name': '/workspacehub/prod/app/POSTGRES_PASSWORD', 'Value': secret}]}
            result = subprocess.run(['python3', str(SCRIPTS / 'render-runtime.py'), 'app', directory], input=json.dumps(payload), text=True, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            text = (Path(directory) / '.env.production').read_text()
            self.assertIn("POSTGRES_PASSWORD='p$#a\\'ss\\word'", text)
            self.assertIn('POSTGRES_PASSWORD_URLENCODED', text)
            self.assertEqual((Path(directory) / '.env.production').stat().st_mode & 0o777, 0o600)
            self.assertNotIn(secret, result.stdout)

    def test_release_tag_cannot_override_candidate(self):
        with tempfile.TemporaryDirectory() as directory:
            payload = {'Parameters': [{'Name': '/workspacehub/prod/app/IMAGE_TAG', 'Value': OLD}]}
            result = subprocess.run(['python3', str(SCRIPTS / 'render-runtime.py'), 'app', directory], input=json.dumps(payload), text=True, capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse((Path(directory) / '.env.production').exists())


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.staging = tempfile.TemporaryDirectory()
        self.root = Path(self.staging.name)
        shutil.copytree(SCRIPTS, self.root / 'scripts', ignore=shutil.ignore_patterns('__pycache__'))
        (self.root / 'compose.yml').write_text('previous configuration')
        (self.root / 'compose.candidate.yml').write_text('candidate configuration')
        (self.root / '.env.production').write_text('previous secrets')
        (self.root / '.release.env').write_text(f'IMAGE_TAG={OLD}\n')
        (self.root / 'scripts/bootstrap-app-env.sh').write_text('#!/bin/bash\nprintf "candidate secrets" > "$APP_DIR/.env.production"\n')
        (self.root / 'scripts/health-check.sh').write_text('#!/bin/bash\n[[ "${TEST_HEALTH_FAILURE:-0}" != 1 || "$IMAGE_TAG" == "'+OLD+'" ]]\n')
        bin_dir = self.root / 'bin'
        bin_dir.mkdir()
        docker = bin_dir / 'docker'
        docker.write_text('''#!/bin/bash
printf '%s|%s\n' "$IMAGE_TAG" "$*" >> "$APP_DIR/operations.log"
if [[ "${TEST_MIGRATION_FAILURE:-0}" == 1 && "$*" == *"run --rm --no-deps"* ]]; then exit 1; fi
if [[ "${TEST_PULL_FAILURE:-0}" == 1 && "$*" == *"pull"* ]]; then exit 1; fi
exit 0
''')
        docker.chmod(0o755)
        self.environment = {**os.environ, 'APP_DIR': str(self.root), 'PATH': str(bin_dir) + ':' + os.environ['PATH']}
        self.environment.pop('DEPLOY_LOCK_HELD', None)

    def tearDown(self):
        self.staging.cleanup()

    def deploy(self, **overrides):
        return subprocess.run(['bash', str(self.root / 'scripts/deploy-app.sh'), NEW], env={**self.environment, **overrides}, capture_output=True, text=True)

    def test_success_records_release_after_rollout(self):
        result = self.deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(f'IMAGE_TAG={NEW}', (self.root / '.release.env').read_text())
        operations = (self.root / 'operations.log').read_text()
        self.assertLess(operations.index('calendar-service-migration'), operations.index('up -d'))

    def test_migration_failure_keeps_existing_release(self):
        result = self.deploy(TEST_MIGRATION_FAILURE='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(OLD, (self.root / '.release.env').read_text())
        self.assertEqual((self.root / 'compose.yml').read_text(), 'previous configuration')
        self.assertNotIn('up -d', (self.root / 'operations.log').read_text())

    def test_pull_failure_restores_configuration(self):
        result = self.deploy(TEST_PULL_FAILURE='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((self.root / '.env.production').read_text(), 'previous secrets')
        self.assertEqual((self.root / 'compose.yml').read_text(), 'previous configuration')

    def test_health_failure_restores_previous_tag_and_environment(self):
        result = self.deploy(TEST_HEALTH_FAILURE='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(OLD, (self.root / '.release.env').read_text())
        self.assertEqual((self.root / '.env.production').read_text(), 'previous secrets')
        self.assertEqual((self.root / 'compose.yml').read_text(), 'previous configuration')
        self.assertIn(OLD + '|', (self.root / 'operations.log').read_text())

    def test_first_release_failure_does_not_claim_success(self):
        (self.root / '.release.env').unlink()
        result = self.deploy(TEST_HEALTH_FAILURE='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.root / '.release.env').exists())
        self.assertIn('no previous release', result.stderr)

    def test_concurrent_deployment_is_rejected_before_changes(self):
        with (self.root / '.deploy.lock').open('w') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            result = self.deploy()
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse((self.root / 'operations.log').exists())
            self.assertEqual((self.root / 'compose.yml').read_text(), 'previous configuration')

    def test_invalid_image_tag_is_rejected(self):
        result = subprocess.run(['bash', str(self.root / 'scripts/deploy-app.sh'), 'latest'], env=self.environment, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.root / 'operations.log').exists())


if __name__ == '__main__':
    unittest.main()
