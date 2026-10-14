"""Transport failures must block deployment; bundles are exact-commit allowlists."""
import hashlib
import io
import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import unittest
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts'
spec = importlib.util.spec_from_file_location('transport', SCRIPTS / 'send-deployment.py')
transport = importlib.util.module_from_spec(spec)
spec.loader.exec_module(transport)
SHA = '1' * 40
SSH_ENV = {'SSH_HOST': '192.0.2.10', 'SSH_PRIVATE_KEY': 'fake-test-key',
           'SSH_KNOWN_HOSTS': '192.0.2.10 ssh-ed25519 fake-test-host-key'}


class PackagingTests(unittest.TestCase):
    def test_all_roles_exclude_env_and_use_the_requested_commit(self):
        with tempfile.TemporaryDirectory() as directory:
            repository = Path(directory)
            shutil.copytree(SCRIPTS.parent / 'prod', repository / 'deploy/prod',
                            ignore=shutil.ignore_patterns('.env*'))
            shutil.copytree(SCRIPTS.parent / 'shared', repository / 'deploy/shared')
            shutil.copytree(SCRIPTS, repository / 'deploy/scripts',
                            ignore=shutil.ignore_patterns('__pycache__'))
            source = repository / 'deploy/prod/app/compose.yml'
            original = source.read_bytes()
            (repository / 'deploy/prod/app/.env.production').write_text('SECRET=must-not-ship')
            subprocess.run(['git', 'init', '-q', str(repository)], check=True)
            subprocess.run(['git', 'add', '.'], cwd=repository, check=True)
            subprocess.run(['git', '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
                            'commit', '-qm', 'fixture'], cwd=repository, check=True)
            sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repository, text=True).strip()
            source.write_text('uncommitted modification')
            for role in transport.ROLES:
                with self.subTest(role=role):
                    archive = repository / f'{role}.tar.gz'
                    digest = transport.package_release(role, sha, archive, repository)
                    self.assertEqual(digest, hashlib.sha256(archive.read_bytes()).hexdigest())
                    with tarfile.open(archive) as bundle:
                        names = bundle.getnames()
                        self.assertTrue(all(name.startswith(('scripts/', 'config/')) for name in names))
                        self.assertFalse(any('.env' in name or 'test' in name or '__pycache__' in name for name in names))
                        if role == 'app':
                            self.assertEqual(bundle.extractfile('config/compose.yml').read(), original)
                        if role == 'infra':
                            self.assertIn('config/kafka-init.sh', names)
                            self.assertIn('config/postgres-init/01-create-service-databases.sql', names)


class TransportTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(os.environ, SSH_ENV)
        self.environment.start()
        self.bundle = patch.object(transport, 'package_release', return_value='0' * 64)
        self.bundle.start()

    def tearDown(self):
        self.bundle.stop()
        self.environment.stop()

    def test_connection_or_host_key_failure_stops_before_scp(self):
        with patch.object(transport.subprocess, 'check_output', side_effect=subprocess.CalledProcessError(255, 'ssh')) as ssh:
            with patch.object(transport.subprocess, 'run') as run:
                with self.assertRaises(subprocess.CalledProcessError):
                    transport.deploy('app', SHA)
                run.assert_not_called()
                self.assertIn('StrictHostKeyChecking=yes', ssh.call_args.args[0])
                self.assertIn('BatchMode=yes', ssh.call_args.args[0])

    def test_scp_failure_blocks_install_and_cleans_up(self):
        calls = []
        def run(command, **kwargs):
            calls.append(command)
            if command[0] == 'scp':
                raise subprocess.CalledProcessError(1, command)
        with patch.object(transport.subprocess, 'check_output', return_value='/tmp/workspacehub.12345678'), patch.object(transport.subprocess, 'run', side_effect=run):
            with self.assertRaises(subprocess.CalledProcessError):
                transport.deploy('app', SHA)
        self.assertEqual(len(calls), 2)
        self.assertIn('StrictHostKeyChecking=yes', calls[0])
        self.assertTrue(calls[1][-1].startswith('rm -rf -- /tmp/workspacehub.'))

    def test_remote_failure_and_timeout_propagate(self):
        for failure in (subprocess.CalledProcessError(1, 'ssh'), subprocess.TimeoutExpired('ssh', 1800)):
            with self.subTest(failure=type(failure).__name__):
                def run(command, **kwargs):
                    if command[-1] == 'bash -se':
                        raise failure
                with patch.object(transport.subprocess, 'check_output', return_value='/tmp/workspacehub.12345678'), patch.object(transport.subprocess, 'run', side_effect=run):
                    with self.assertRaises(type(failure)):
                        transport.deploy('app', SHA)

    def test_corrupted_archive_fails_checksum_before_install(self):
        actual_run = subprocess.run
        with tempfile.TemporaryDirectory(prefix='workspacehub.', dir='/tmp') as directory:
            # Use the strict staging path contract expected by the transport.
            remote = Path(directory)
            if len(remote.name.rsplit('.', 1)[-1]) != 8:
                self.skipTest('Platform temp directory suffix is not eight characters')
            (remote / 'release.tar.gz').write_bytes(b'corrupted transport bytes')
            observed = []
            def run(command, **kwargs):
                if command[-1] == 'bash -se':
                    result = actual_run(['bash', '-se'], input=kwargs['input'], text=True, capture_output=True)
                    observed.append(result)
                    result.check_returncode()
            with patch.object(transport.subprocess, 'check_output', return_value=str(remote)), patch.object(transport.subprocess, 'run', side_effect=run):
                with self.assertRaises(subprocess.CalledProcessError):
                    transport.deploy('app', SHA)
            self.assertIn('FAILED', observed[0].stdout)
            self.assertNotIn('Deployment succeeded', observed[0].stdout)

    def test_remote_installer_exit_status_and_private_logs(self):
        actual_run = subprocess.run
        for status in (0, 17):
            with self.subTest(status=status), tempfile.TemporaryDirectory(prefix='workspacehub.', dir='/tmp') as directory:
                remote = Path(directory)
                logs, binaries = remote / 'logs', remote / 'bin'
                logs.mkdir()
                binaries.mkdir()
                sudo = binaries / 'sudo'
                sudo.write_text('''#!/bin/bash
if [[ "$1" == -n ]]; then shift; fi
if [[ "$1" == mktemp ]]; then mktemp "$TEST_LOG_DIR/deployment.log.XXXXXXXX"; else exec "$@"; fi
''')
                sudo.chmod(0o755)
                def package(role, sha, archive):
                    installer = f'echo private-provider-output\nexit {status}\n'.encode()
                    with tarfile.open(archive, 'w:gz') as bundle:
                        entry = tarfile.TarInfo('scripts/install-release.sh')
                        entry.size = len(installer)
                        bundle.addfile(entry, io.BytesIO(installer))
                    return hashlib.sha256(Path(archive).read_bytes()).hexdigest()
                observed = []
                def run(command, **kwargs):
                    if command[0] == 'scp':
                        shutil.copy(command[-2], remote / 'release.tar.gz')
                    elif command[-1] == 'bash -se':
                        result = actual_run(['bash', '-se'], input=kwargs['input'], text=True,
                                            capture_output=True, env={**os.environ, 'TEST_LOG_DIR': str(logs), 'PATH': str(binaries) + ':' + os.environ['PATH']})
                        observed.append(result)
                        result.check_returncode()
                with patch.object(transport, 'package_release', side_effect=package), patch.object(transport.subprocess, 'check_output', return_value=str(remote)), patch.object(transport.subprocess, 'run', side_effect=run):
                    if status:
                        with self.assertRaises(subprocess.CalledProcessError):
                            transport.deploy('app', SHA)
                    else:
                        transport.deploy('app', SHA)
                self.assertEqual(observed[0].returncode != 0, status != 0)
                self.assertNotIn('private-provider-output', observed[0].stdout + observed[0].stderr)
                self.assertEqual(next(logs.glob('deployment.log.*')).read_text(), 'private-provider-output\n')

    def test_untrusted_remote_path_and_invalid_inputs_are_rejected(self):
        with patch.object(transport.subprocess, 'check_output', return_value='/wrong/path'), patch.object(transport.subprocess, 'run') as run:
            with self.assertRaises(ValueError):
                transport.deploy('app', SHA)
            run.assert_not_called()
        for env in ({'SSH_HOST': '-bad'}, {'SSH_USER': 'user;id'}, {'SSH_PORT': '0'}, {'SSH_KNOWN_HOSTS': ''}):
            with self.subTest(env=env), patch.dict(os.environ, env):
                with self.assertRaises(ValueError):
                    transport.deploy('app', SHA)
