import copy
import hashlib
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
spec = importlib.util.spec_from_file_location('host_release', SCRIPTS / 'release-host.py')
host = importlib.util.module_from_spec(spec)
spec.loader.exec_module(host)


class HostSelectionTests(unittest.TestCase):
    def test_init_mounts_are_container_readable_and_env_remains_private(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'postgres-init').mkdir(mode=0o700)
            sql = root / 'postgres-init/01-init.sql'
            sql.write_text('SELECT 1;')
            script = root / 'kafka-init.sh'
            script.write_text('echo initializer')
            env = root / '.env.production'
            env.write_text('private fixture')
            for path in (sql, script, env):
                path.chmod(0o600)
            host.prepare_mounts('infra', root)
            self.assertEqual((root / 'postgres-init').stat().st_mode & 0o777, 0o755)
            self.assertEqual(sql.stat().st_mode & 0o777, 0o644)
            self.assertEqual(script.stat().st_mode & 0o777, 0o644)
            self.assertEqual(env.stat().st_mode & 0o777, 0o600)

    def test_realtime_mount_change_only_recreates_corresponding_container(self):
        services = {'livekit': {'image': 'server'}, 'egress': {'image': 'worker'}}
        previous = dict(services=services, hashes={'livekit': 'unchanged', 'egress': 'old'})
        self.assertEqual(host.affected('realtime', previous, services, {'livekit': 'unchanged', 'egress': 'new'}), ({'egress'}, False))
        self.assertEqual(host.affected('realtime', None, services, {}), ({'livekit', 'egress'}, False))

    def test_kafka_initialization_changes_do_not_restart_postgres_or_redis(self):
        services = {name: {'image': name} for name in ('postgres', 'redis', 'kafka', 'kafka-init')}
        previous = dict(services=services, hashes={'kafka-init': 'old'})
        self.assertEqual(host.affected('infra', previous, services, {'kafka-init': 'new'}), (set(), True))
        changed = copy.deepcopy(services)
        changed['redis']['image'] = 'new-redis'
        self.assertEqual(host.affected('infra', previous, changed, {'kafka-init': 'old'}), ({'redis'}, False))

    def test_realtime_rollout_and_health_failure_do_not_commit_host_metadata(self):
        for failure in (False, True):
            with self.subTest(failure=failure), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                services = {'livekit': {'image': 'server'}, 'egress': {'image': 'worker'}}
                old = dict(version=1, config_commit='1' * 40, images={}, last_services=[])
                (root / '.release-state.json').write_text(json.dumps(old))
                for name in services:
                    (root / f'{name}.runtime.yaml').write_text('old configuration')
                digest = hashlib.sha256(b'old configuration').hexdigest()
                previous = dict(services=services, hashes={name: digest for name in services})
                (root / '.host-config.json').write_text(json.dumps(previous))
                plan = root / 'plan.json'
                plan.write_text(json.dumps({'roles': {'realtime': {'enabled': True, 'expected': old}}}))
                commands = []
                def run(command, **kwargs):
                    commands.append(command)
                    if command[0] == sys.executable:
                        (root / 'egress.runtime.yaml').write_text('new configuration')
                    if command[0] == 'timeout' and failure:
                        raise subprocess.CalledProcessError(124, command)
                with patch.object(host.subprocess, 'run', side_effect=run), patch.object(host.subprocess, 'check_output', return_value=json.dumps({'services': services})), patch.object(host.os, 'chown'):
                    if failure:
                        with self.assertRaises(subprocess.CalledProcessError):
                            host.deploy('realtime', directory, str(plan))
                        self.assertEqual(json.loads((root / '.host-config.json').read_text()), previous)
                    else:
                        host.deploy('realtime', directory, str(plan))
                up = next(command for command in commands if 'up' in command)
                self.assertEqual(up[up.index('up'):], ['up', '-d', '--no-deps', '--force-recreate', 'egress'])
                self.assertEqual(json.loads((root / '.release-state.json').read_text()), old)
