import ast
import copy
import fcntl
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts'
sys.path.insert(0, str(SCRIPTS))
from catalog import IMAGES, LEGACY_IMAGES, RUNTIME, tag_variable
from release_state import validate

OLD, NEW = '1' * 40, '2' * 40


class PartialRolloutTests(unittest.TestCase):
    def setUp(self):
        self.staging = tempfile.TemporaryDirectory()
        self.root = Path(self.staging.name)
        shutil.copytree(SCRIPTS, self.root / 'scripts', ignore=shutil.ignore_patterns('__pycache__'))
        tree = ast.parse((SCRIPTS / 'render-runtime.py').read_text())
        keys = next(ast.literal_eval(node.value)['app'].split() for node in tree.body if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id == 'required' for target in node.targets))
        self.source = ''.join(f'{key}=fixture\n' for key in keys)
        (self.root / '.env.production').write_text(self.source)
        subprocess.run([sys.executable, str(SCRIPTS / 'render-runtime.py'), 'app', str(self.root)], check=True)
        self.runtime = (self.root / '.env.runtime').read_bytes()
        self.old = dict(version=1, config_commit=OLD, images={name: dict(tag='sha-' + OLD, source_commit=OLD) for name in IMAGES}, last_services=[])
        (self.root / '.release-state.json').write_text(json.dumps(self.old))
        (self.root / '.image-tags.env').write_text(''.join(f'{tag_variable(name)}=sha-{OLD}\n' for name in IMAGES))
        configuration = {'services': {name: {'setting': 'original'} for name in IMAGES}}
        (self.root / 'compose.yml').write_text(json.dumps(configuration))
        (self.root / 'compose.candidate.yml').write_text(json.dumps(configuration))
        baseline = copy.deepcopy(configuration['services'])
        for name in IMAGES:
            baseline[name]['image'] = 'sha-' + OLD
        (self.root / '.resolved.json').write_text(json.dumps(baseline))
        candidate = copy.deepcopy(self.old)
        candidate['config_commit'] = NEW
        candidate['images']['calendar-service'] = dict(tag='sha-' + NEW, source_commit=NEW)
        self.plan = dict(sha=NEW, roles={'app': dict(enabled=True, expected=self.old, state=candidate,
                       services=['calendar-service'], migrations=[], restrict_services=None, bootstrap=False, config_changed=False)})
        binaries = self.root / 'bin'
        binaries.mkdir()
        docker = binaries / 'docker'
        docker.write_text('''#!/usr/bin/env python3
import json, os, pathlib, sys
root = pathlib.Path(os.environ['APP_DIR'])
args = sys.argv[1:]
with (root / 'operations.log').open('a') as stream: stream.write(json.dumps(args) + '\\n')
if 'config' in args and '--format' in args:
    services = json.loads((root / 'compose.yml').read_text())['services']
    tags = dict(line.split('=', 1) for line in (root / '.image-tags.env').read_text().splitlines())
    for name in services:
        services[name]['image'] = tags[name.upper().replace('-', '_') + '_IMAGE_TAG']
    print(json.dumps({'services': services}))
if os.environ.get('TEST_MIGRATION_FAILURE') == '1' and 'run' in args: sys.exit(1)
if os.environ.get('TEST_PULL_FAILURE') == '1' and 'pull' in args: sys.exit(1)
''')
        docker.chmod(0o755)
        (self.root / 'scripts/health-check.sh').write_text('''#!/bin/bash
printf '%s\\n' "$*" >> "$APP_DIR/health.log"
if [[ "${TEST_HEALTH_FAILURE:-0}" == 1 ]] && grep -q 'CALENDAR_SERVICE_IMAGE_TAG=sha-'''+NEW+'''\n' "$APP_DIR/.image-tags.env"; then exit 1; fi
''')
        self.environment = {**os.environ, 'APP_DIR': str(self.root), 'RUNTIME_PYTHON': sys.executable,
                            'PATH': str(binaries) + ':' + os.environ['PATH']}
        self.environment.pop('DEPLOY_LOCK_HELD', None)

    def tearDown(self):
        if (self.root / '.env.production').exists():
            self.assertEqual((self.root / '.env.production').read_text(), self.source)
        self.staging.cleanup()

    def deploy(self, **overrides):
        path = self.root / 'plan.json'
        path.write_text(json.dumps(self.plan))
        return subprocess.run(['bash', str(self.root / 'scripts/deploy-app.sh'), 'sha-' + NEW, str(path)],
                              env={**self.environment, **overrides}, text=True, capture_output=True)

    def operations(self):
        path = self.root / 'operations.log'
        return [json.loads(line) for line in path.read_text().splitlines()] if path.exists() else []

    def state(self):
        return json.loads((self.root / '.release-state.json').read_text())

    def test_calendar_code_only_updates_one_container_and_no_migrations(self):
        result = self.deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        operations = self.operations()
        self.assertFalse(any('run' in command for command in operations))
        up = next(command for command in operations if 'up' in command)
        self.assertEqual(up[up.index('up'):], ['up', '-d', '--no-deps', 'calendar-service'])
        self.assertEqual(self.state()['images']['user-service'], self.old['images']['user-service'])
        self.assertEqual(self.state()['last_services'], ['calendar-service'])
        self.assertEqual((self.root / 'health.log').read_text(), 'calendar-service\n')

    def test_migration_failure_prevents_rollout_and_keeps_state(self):
        self.plan['roles']['app']['migrations'] = ['calendar-service-migration']
        self.plan['roles']['app']['state']['images']['calendar-service-migration'] = dict(tag='sha-' + NEW, source_commit=NEW)
        self.assertNotEqual(self.deploy(TEST_MIGRATION_FAILURE='1').returncode, 0)
        self.assertFalse(any('up' in command for command in self.operations()))
        self.assertEqual(self.state(), self.old)
        self.assertEqual((self.root / '.env.runtime').read_bytes(), self.runtime)

    def test_selected_migration_runs_before_selected_rollout(self):
        self.plan['roles']['app']['migrations'] = ['calendar-service-migration']
        self.plan['roles']['app']['state']['images']['calendar-service-migration'] = dict(tag='sha-' + NEW, source_commit=NEW)
        result = self.deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        operations = self.operations()
        self.assertLess(next(index for index, command in enumerate(operations) if 'run' in command), next(index for index, command in enumerate(operations) if 'up' in command))

    def test_health_failure_rolls_back_only_calendar_and_preserves_operator_env(self):
        result = self.deploy(TEST_HEALTH_FAILURE='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.state(), self.old)
        self.assertEqual((self.root / '.env.runtime').read_bytes(), self.runtime)
        up = [command[command.index('up'):] for command in self.operations() if 'up' in command]
        self.assertEqual(up, [['up', '-d', '--no-deps', 'calendar-service']] * 2)

    def test_changed_compose_configuration_selects_additional_service_without_new_tag(self):
        path = self.root / 'compose.candidate.yml'
        candidate = json.loads(path.read_text())
        candidate['services']['document-service']['setting'] = 'changed'
        path.write_text(json.dumps(candidate))
        result = self.deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.state()['last_services'], ['document-service', 'calendar-service'])
        self.assertEqual(self.state()['images']['document-service']['tag'], 'sha-' + OLD)

    def test_manual_partial_preserves_unselected_effective_configuration(self):
        self.plan['roles']['app']['restrict_services'] = ['calendar-service']
        path = self.root / 'compose.candidate.yml'
        candidate = json.loads(path.read_text())
        candidate['services']['document-service']['setting'] = 'changed'
        path.write_text(json.dumps(candidate))
        result = self.deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads((self.root / '.resolved.json').read_text())['document-service']['setting'], 'original')

    def test_missing_env_bad_state_and_concurrent_deploy_do_not_mutate(self):
        with (self.root / '.deploy.lock').open('w') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            self.assertNotEqual(self.deploy().returncode, 0)
            self.assertEqual(self.operations(), [])
        self.plan['roles']['app']['expected']['config_commit'] = '3' * 40
        self.assertNotEqual(self.deploy().returncode, 0)
        self.assertEqual(self.operations(), [])
        (self.root / '.env.production').unlink()
        self.assertNotEqual(self.deploy().returncode, 0)

    def test_pull_and_render_failure_restore_configuration_before_rollout(self):
        self.assertNotEqual(self.deploy(TEST_PULL_FAILURE='1').returncode, 0)
        self.assertEqual(self.state(), self.old)
        self.assertFalse(any('up' in command for command in self.operations()))
        (self.root / 'scripts/render-runtime.py').write_text('raise ValueError("fixture failure")')
        self.assertNotEqual(self.deploy().returncode, 0)
        self.assertEqual(self.state(), self.old)

    def test_missing_effective_snapshot_is_rejected_before_any_docker_operation(self):
        (self.root / '.resolved.json').unlink()
        self.assertNotEqual(self.deploy().returncode, 0)
        self.assertEqual(self.operations(), [])
        self.assertEqual(self.state(), self.old)

    def test_legacy_release_converts_and_failed_first_release_has_no_state(self):
        (self.root / '.release-state.json').unlink()
        (self.root / '.release.env').write_text('IMAGE_TAG=sha-' + OLD + '\n')
        self.plan['roles']['app']['expected'] = validate({'legacy_tag': 'sha-' + OLD})
        old_configuration = json.loads((self.root / 'compose.yml').read_text())
        old_configuration['services'] = {key: value for key, value in old_configuration['services'].items() if key in LEGACY_IMAGES}
        (self.root / 'compose.yml').write_text(json.dumps(old_configuration))
        result = self.deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(self.state()['images']), 17)
        (self.root / '.release-state.json').unlink()
        (self.root / '.release.env').unlink()
        self.plan['roles']['app']['expected'] = None
        self.assertNotEqual(self.deploy(TEST_HEALTH_FAILURE='1').returncode, 0)
        self.assertFalse((self.root / '.release-state.json').exists())
