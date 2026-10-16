import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts'
sys.path.insert(0, str(SCRIPTS))
from catalog import IMAGES, LEGACY_IMAGES, ROLES, RUNTIME, classify
from release_state import validate

spec = importlib.util.spec_from_file_location('planner', SCRIPTS / 'plan-release.py')
planner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(planner)
OLD, NEW = '1' * 40, '2' * 40


def states():
    return {role: dict(version=1, config_commit=OLD,
                       images={name: dict(tag='sha-' + OLD, source_commit=OLD) for name in IMAGES} if role == 'app' else {},
                       last_services=[]) for role in ROLES}


class ClassificationTests(unittest.TestCase):
    def test_local_only_inputs_do_not_select_production(self):
        for path in ('backend/docker/docker-compose.host.yml', 'backend/livekit/docker-compose.yml',
                     'backend/kong-gateway/kong.host.yml', 'deploy/dev/compose.yml',
                     'backend/calendar-service/Dockerfile'):
            with self.subTest(path=path):
                self.assertEqual(classify([path])[:2], (set(), set()))

    def test_ci_harness_selects_python_without_images(self):
        images, roles, checks = classify(['.github/ci/ai/compose.yml'])
        self.assertEqual((images, roles), (set(), set()))
        self.assertEqual(checks, {'ai-service', 'ai-worker'})

    def test_calendar_code_only(self):
        images, roles, checks = classify(['backend/calendar-service/src/main.ts'])
        self.assertEqual(images, {'calendar-service'})
        self.assertEqual(roles, {'app'})
        self.assertEqual(checks, {'calendar-service'})

    def test_migration_and_shared_inputs(self):
        for path in ('prisma/migrations/new/migration.sql', 'prisma/schema.prisma', 'package-lock.json', 'Dockerfile.production'):
            self.assertEqual(classify(['backend/calendar-service/' + path])[0], {'calendar-service', 'calendar-service-migration'})
        self.assertEqual(classify(['deploy/shared/sql-migrations/migrate.sh'])[0], {'user-service-migration', 'project-service-migration'})

    def test_hosts_frontend_gateway_and_documents(self):
        for path, images, roles in (
            ('frontend/web/app/page.tsx', {'frontend-web'}, {'app'}),
            ('backend/kong-gateway/kong.docker.yml', {'kong'}, {'app'}),
            ('deploy/prod/infra/compose.yml', set(), {'infra'}),
            ('deploy/shared/kafka/init-topics.sh', set(), {'infra'}),
            ('deploy/prod/realtime/livekit.yaml', set(), {'realtime'}),
            ('deploy/scripts/render-runtime.py', set(), set(ROLES)),
            ('docs/deployment.md', set(), set()),
            ('deploy/tests/test_deployment.py', set(), set()),
            ('deploy/prod/app/.env', set(), set()),
        ):
            with self.subTest(path=path):
                result = classify([path])
                self.assertEqual(result[0], images)
                self.assertEqual(result[1], roles)

    def test_multiple_services_and_pipeline_changes(self):
        self.assertEqual(classify(['backend/calendar-service/src/x.ts', 'backend/document-service/src/x.ts'])[0], {'calendar-service', 'document-service'})
        self.assertEqual(classify(['.github/workflows/ci.yml'])[0], set(IMAGES))


class PlanningTests(unittest.TestCase):
    def test_ci_and_host_changes_do_not_roll_out(self):
        result = self.plan(['.github/ci/ai/compose.yml', 'backend/kong-gateway/kong.host.yml'])
        self.assertTrue(result['python'])
        self.assertFalse(result['has_images'])
        self.assertFalse(any(role['enabled'] for role in result['roles'].values()))

    def plan(self, paths, **kwargs):
        with patch.object(planner, 'diff', return_value=paths):
            return planner.production(NEW, states(), **kwargs)

    def test_calendar_only_has_one_image_and_one_ci_directory(self):
        result = self.plan(['backend/calendar-service/src/main.ts'])
        self.assertEqual([image['service'] for image in result['matrix']['include']], ['calendar-service'])
        self.assertEqual(result['node'], ['backend/calendar-service'])
        self.assertFalse(result['java'])
        self.assertFalse(result['roles']['infra']['enabled'])
        self.assertFalse(result['roles']['realtime']['enabled'])
        app = result['roles']['app']
        self.assertEqual(app['services'], ['calendar-service'])
        self.assertEqual(app['migrations'], [])
        self.assertEqual(app['state']['images']['user-service']['tag'], 'sha-' + OLD)

    def test_failed_and_unselected_changes_are_retried_per_image(self):
        deployed = states()
        deployed['app']['config_commit'] = NEW
        deployed['app']['images']['calendar-service'] = dict(tag='sha-' + NEW, source_commit=NEW)
        def changed(base, head):
            return [] if base == NEW else ['backend/calendar-service/src/x.ts', 'backend/document-service/src/x.ts']
        with patch.object(planner, 'diff', side_effect=changed):
            result = planner.production(NEW, deployed)
        self.assertEqual([image['service'] for image in result['matrix']['include']], ['document-service'])

    def test_manual_partial_does_not_advance_other_images_or_config(self):
        result = self.plan(['backend/document-service/src/x.ts', 'deploy/prod/app/compose.yml'], scope='app', services='calendar-service')
        app = result['roles']['app']
        self.assertEqual(app['state']['config_commit'], OLD)
        self.assertEqual(app['state']['images']['document-service']['source_commit'], OLD)
        self.assertEqual(app['restrict_services'], ['calendar-service'])

    def test_host_configuration_only_needs_no_image_builds(self):
        result = self.plan(['deploy/prod/infra/compose.yml', 'deploy/prod/realtime/egress.yaml'])
        self.assertFalse(result['has_images'])
        self.assertEqual(result['node'], [])
        self.assertTrue(result['roles']['infra']['enabled'])
        self.assertTrue(result['roles']['realtime']['enabled'])
        self.assertFalse(result['roles']['app']['enabled'])

    def test_bootstrap_and_explicit_all(self):
        bootstrap = planner.production(NEW, dict.fromkeys(ROLES))
        self.assertEqual(len(bootstrap['matrix']['include']), 17)
        self.assertTrue(all(bootstrap['roles'][role]['enabled'] for role in ROLES))
        result = self.plan([], scope='app', services='all')
        self.assertEqual(len(result['matrix']['include']), 17)
        self.assertFalse(result['roles']['infra']['enabled'])

    def test_missing_baseline_and_bad_state(self):
        with patch.object(planner, 'diff', return_value=None):
            self.assertEqual(len(planner.production(NEW, states())['matrix']['include']), 17)
        invalid = states()
        del invalid['app']['images']['calendar-service']
        with self.assertRaises(ValueError):
            planner.production(NEW, invalid)
        for selection in ('calendar', 'calendar-service,unknown', ''):
            with self.assertRaises(ValueError):
                self.plan([], services=selection)

    def test_legacy_tag_converts_to_fourteen_references(self):
        state = validate({'legacy_tag': 'sha-' + OLD})
        self.assertEqual(len(state['images']), 14)
        self.assertEqual({image['tag'] for image in state['images'].values()}, {'sha-' + OLD})

    def test_ai_changes_select_python_and_worker_without_node(self):
        result = self.plan(['backend/ai-service/app/main.py'])
        self.assertEqual({entry['service'] for entry in result['matrix']['include']}, {'ai-service', 'ai-worker'})
        self.assertTrue(result['python'])
        self.assertEqual(result['node'], [])
        result = self.plan(['backend/ai-service/migrations/versions/new.py'])
        self.assertEqual(set(result['roles']['app']['migrations']), {'ai-service-migration'})

    def test_existing_release_bootstraps_only_new_ai_images(self):
        old = states()
        old['app']['images'] = {key: value for key, value in old['app']['images'].items() if key in LEGACY_IMAGES}
        with patch.object(planner, 'diff', return_value=[]):
            result = planner.production(NEW, old, scope='app', services='calendar-service')
        selected = {entry['service'] for entry in result['matrix']['include']}
        self.assertEqual(selected, {'calendar-service', 'ai-service', 'ai-worker', 'ai-service-migration'})
        self.assertEqual(set(result['roles']['app']['state']['images']), set(IMAGES))

    def test_git_rename_delete_and_merge_base(self):
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory)
            def git(*args):
                return subprocess.check_output(['git', '-C', str(repo), *args], text=True).strip()
            git('init', '-q')
            (repo / 'old.txt').write_text('fixture')
            git('add', '.')
            git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'first')
            base = git('rev-parse', 'HEAD')
            (repo / 'old.txt').rename(repo / 'new.txt')
            git('add', '-A')
            git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'rename')
            head = git('rev-parse', 'HEAD')
            import os
            current = os.getcwd()
            try:
                os.chdir(repo)
                self.assertEqual(set(planner.diff(base, head, merge_base=True)), {'old.txt', 'new.txt'})
                with self.assertRaises(ValueError):
                    planner.diff(head, base)
            finally:
                os.chdir(current)
