"""Reconcile INFRA/REALTIME containers and config mounts; never roll back host data."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from catalog import HOST_SERVICES
from release_state import load, write


def prepare_mounts(role, root):
    if role == 'realtime':
        os.chown(root / 'egress.runtime.yaml', 1001, 0)
    else:
        # These tracked init files contain no credentials. Container users need
        # to traverse the mounted directory and read them; operator env stays 600.
        directory = root / 'postgres-init'
        directory.chmod(0o755)
        for path in directory.glob('*.sql'):
            path.chmod(0o644)
        (root / 'kafka-init.sh').chmod(0o644)


def affected(role, previous, current, hashes):
    services = set(HOST_SERVICES[role])
    if previous is None:
        return services, role == 'infra'
    changed = {name for name in services if previous['services'].get(name) != current.get(name)}
    old_hashes = previous['hashes']
    if role == 'realtime':
        for name in services:
            if old_hashes.get(name) != hashes.get(name):
                changed.add(name)
    initializer = role == 'infra' and ('kafka' in changed or previous['services'].get('kafka-init') != current.get('kafka-init') or old_hashes.get('kafka-init') != hashes.get('kafka-init'))
    return changed, initializer


def deploy(role, directory, plan_file):
    if role not in HOST_SERVICES:
        raise ValueError('Invalid infrastructure host role')
    root = Path(directory)
    plan = json.loads(Path(plan_file).read_text())['roles'][role]
    if not plan['enabled'] or load(root, role) != plan['expected']:
        raise ValueError('Host state changed after planning; rerun the workflow')
    snapshot = root / '.host-config.json'
    if load(root, role) and not snapshot.is_file():
        raise ValueError('Missing host configuration snapshot')
    previous = json.loads(snapshot.read_text()) if snapshot.is_file() else None
    subprocess.run([sys.executable, str(root / 'scripts/render-runtime.py'), role, str(root)], check=True)
    prepare_mounts(role, root)
    prefix = ['docker', 'compose', '--env-file', str(root / '.env.runtime'), '-f', str(root / 'compose.yml')]
    def compose(*args):
        subprocess.run([*prefix, *args], check=True)
    current = json.loads(subprocess.check_output([*prefix, 'config', '--format', 'json'], text=True))['services']
    if not set(HOST_SERVICES[role]) <= set(current):
        raise ValueError('Required host services are missing')
    paths = {name: root / f'{name}.runtime.yaml' for name in HOST_SERVICES[role]} if role == 'realtime' else {'kafka-init': root / 'kafka-init.sh'}
    hashes = {name: hashlib.sha256(path.read_bytes()).hexdigest() for name, path in paths.items()}
    changed, initializer = affected(role, previous, current, hashes)
    selected = [name for name in HOST_SERVICES[role] if name in changed]
    if selected:
        compose('pull', *selected)
        args = ['up', '-d']
        if previous is not None:
            args.append('--no-deps')
        if role == 'infra':
            args.append('--wait')
        else:
            # Bind-mounted file contents do not change the Compose model.
            args.append('--force-recreate')
        compose(*args, *selected)
    if initializer:
        compose('pull', 'kafka-init')
        compose('run', '--rm', '--no-deps', 'kafka-init')
    if role == 'realtime':
        subprocess.run(['timeout', '180', 'bash', '-c', 'until curl -fsS http://127.0.0.1:7880/ >/dev/null && curl -fsS http://127.0.0.1:9090/ >/dev/null; do sleep 5; done'], check=True)
    else:
        for name in HOST_SERVICES[role]:
            container = subprocess.check_output([*prefix, 'ps', '-q', name], text=True).strip()
            if not container or subprocess.check_output(['docker', 'inspect', '--format', '{{.State.Health.Status}}', container], text=True).strip() != 'healthy':
                raise RuntimeError('Infrastructure readiness check failed: ' + name)
    write(snapshot, dict(services=current, hashes=hashes))
    print(f'Deployed {role} containers: ' + (', '.join(selected) or 'configuration metadata only'))


if __name__ == '__main__':
    os.umask(0o077)
    deploy(*sys.argv[1:])
