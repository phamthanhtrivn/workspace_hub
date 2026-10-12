"""Deliver only committed deployment configuration with verified OpenSSH transport."""
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys
import tarfile
import tempfile
from contextlib import contextmanager

ROOT = Path(__file__).resolve().parents[2]
ROLES = {'app', 'infra', 'realtime'}
RUNTIME_FILES = (
    'bootstrap-app-env.sh', 'common.sh', 'deploy-app.sh', 'health-check.sh',
    'install-release.sh', 'migrate.sh', 'render-runtime.py', 'rollback.sh',
    'requirements.txt',
    'catalog.py', 'release_state.py', 'release-app.py', 'release-host.py', 'verify-host-plan.py',
)


def package_release(role, sha, archive, repository=ROOT, plan=None):
    """Read an explicit allowlist from Git, never local env files or working edits."""
    paths = {f'deploy/prod/{role}/compose.yml': 'config/compose.yml'}
    if role == 'realtime':
        paths.update({f'deploy/prod/realtime/{name}.yaml': f'config/{name}.yaml'
                      for name in ('livekit', 'egress')})
    if role == 'infra':
        paths['deploy/shared/postgres-init/01-create-service-databases.sql'] = 'config/postgres-init/01-create-service-databases.sql'
        paths['deploy/shared/kafka/init-topics.sh'] = 'config/kafka-init.sh'
    paths.update({f'deploy/scripts/{name}': f'scripts/{name}' for name in RUNTIME_FILES})
    with tarfile.open(archive, 'w:gz') as bundle:
        for source, destination in paths.items():
            content = subprocess.check_output(['git', 'show', f'{sha}:{source}'], cwd=repository)
            entry = tarfile.TarInfo(destination)
            entry.size = len(content)
            entry.mode = 0o600
            bundle.addfile(entry, io.BytesIO(content))
        if plan is not None:
            content = json.dumps(plan).encode()
            entry = tarfile.TarInfo('metadata/release-plan.json')
            entry.size, entry.mode = len(content), 0o600
            bundle.addfile(entry, io.BytesIO(content))
    return hashlib.sha256(Path(archive).read_bytes()).hexdigest()


@contextmanager
def connection():
    host = os.environ.get('SSH_HOST', '')
    user = os.environ.get('SSH_USER') or 'ubuntu'
    port = os.environ.get('SSH_PORT') or '22'
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9.-]*', host):
        raise ValueError('SSH_HOST must be an IPv4 address or DNS hostname')
    if not re.fullmatch(r'[a-z_][a-z0-9_-]*', user):
        raise ValueError('Invalid SSH_USER')
    if not port.isdecimal() or not 1 <= int(port) <= 65535:
        raise ValueError('Invalid SSH_PORT')
    private_key = os.environ.get('SSH_PRIVATE_KEY', '')
    known_hosts = os.environ.get('SSH_KNOWN_HOSTS', '')
    if not private_key.strip() or not known_hosts.strip():
        raise ValueError('SSH_PRIVATE_KEY and verified SSH_KNOWN_HOSTS are required')
    target = f'{user}@{host}'
    with tempfile.TemporaryDirectory() as staging:
        root = Path(staging)
        root.chmod(0o700)
        key, hosts = root / 'identity', root / 'known_hosts'
        for path, content in ((key, private_key), (hosts, known_hosts)):
            path.write_text(content.rstrip() + '\n', encoding='utf-8')
            path.chmod(0o600)
        options = ['-F', '/dev/null', '-i', str(key), '-o', 'IdentitiesOnly=yes',
                   '-o', 'BatchMode=yes', '-o', 'PreferredAuthentications=publickey',
                   '-o', 'StrictHostKeyChecking=yes',
                   '-o', f'UserKnownHostsFile={hosts}', '-o', 'GlobalKnownHostsFile=/dev/null',
                   '-o', 'ConnectTimeout=30', '-o', 'ServerAliveInterval=15',
                   '-o', 'ServerAliveCountMax=4']
        ssh = ['ssh', *options, '-p', port, target]
        yield root, ssh, ['scp', *options, '-P', port], target


def deploy(role, sha, plan_file=None):
    if role not in ROLES or not re.fullmatch(r'[0-9a-f]{40}', sha):
        raise ValueError('Invalid deployment role or SHA')
    plan = json.loads(Path(plan_file).read_text()) if plan_file else None
    if plan is not None and (plan['sha'] != sha or not plan['roles'][role]['enabled']):
        raise ValueError('Deployment does not match plan')
    with connection() as (root, ssh, scp, target):
        archive = root / 'release.tar.gz'
        digest = package_release(role, sha, archive, plan=plan) if plan else package_release(role, sha, archive)
        remote = subprocess.check_output([*ssh, 'umask 077; mktemp -d /tmp/workspacehub.XXXXXXXX'],
                                         text=True, timeout=60).strip()
        if not re.fullmatch(r'/tmp/workspacehub\.[A-Za-z0-9_]{8}', remote):
            raise ValueError('Unexpected remote staging directory')
        try:
            subprocess.run([*scp, str(archive),
                            f'{target}:{remote}/release.tar.gz'], check=True, timeout=180)
            command = '\n'.join([
                'set -Eeuo pipefail', 'umask 077', f'staging={shlex.quote(remote)}',
                f"printf '%s  %s\\n' {digest} \"$staging/release.tar.gz\" | sha256sum -c -",
                'tar -xzf "$staging/release.tar.gz" -C "$staging"',
                f'log=$(sudo -n mktemp /opt/workspacehub/{role}/deployment.log.XXXXXXXX)',
                f'''if ! sudo -n bash -c 'exec bash "$1" "$2" "$3" "$5" >"$4" 2>&1' -- "$staging/scripts/install-release.sh" {role} sha-{sha} "$log" "$staging/metadata/release-plan.json"; then''',
                '  echo "Deployment failed; inspect $log on EC2." >&2; exit 1', 'fi',
                'echo "Deployment succeeded; private log: $log"',
            ])
            subprocess.run([*ssh, 'bash -se'], input=command, text=True, check=True, timeout=1800)
        finally:
            subprocess.run([*ssh, f'rm -rf -- {shlex.quote(remote)}'], check=True, timeout=60)


if __name__ == '__main__':
    deploy(*sys.argv[1:])
