"""Apply and roll back an APP release without restarting unaffected containers."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from catalog import IMAGES, RUNTIME, tag_variable
from release_state import load, validate, write

ROOT = Path(os.environ.get('APP_DIR', '/opt/workspacehub/app'))
PYTHON = os.environ.get('RUNTIME_PYTHON', '/opt/workspacehub/venv/bin/python')
SNAPSHOTS = {'compose.yml': '.previous-compose.yml', '.env.runtime': '.previous-env.runtime',
             '.image-tags.env': '.previous-image-tags.env', '.resolved.json': '.previous-resolved.json'}


def tags(state):
    validate(state)
    path = ROOT / '.image-tags.env'
    text = ''.join(f'{tag_variable(name)}={image["tag"]}\n' for name, image in state['images'].items())
    # Old manifests used one tag. This supports the first rollback after conversion.
    unique = {image['tag'] for image in state['images'].values()}
    if len(unique) == 1:
        text += 'IMAGE_TAG=' + next(iter(unique)) + '\n'
    candidate = path.with_name(path.name + '.new')
    candidate.write_text(text)
    candidate.chmod(0o600)
    candidate.replace(path)


def compose(*args, capture=False):
    command = ['docker', 'compose', '--env-file', str(ROOT / '.env.runtime'),
               '--env-file', str(ROOT / '.image-tags.env'), '-f', str(ROOT / 'compose.yml'), *args]
    if capture:
        return subprocess.check_output(command, text=True)
    subprocess.run(command, check=True)


def resolved():
    return json.loads(compose('--profile', 'migration', 'config', '--format', 'json', capture=True))['services']


def health(services):
    if services:
        subprocess.run(['bash', str(ROOT / 'scripts/health-check.sh'), *services], check=True)


def restore_files():
    for current, previous in SNAPSHOTS.items():
        source = ROOT / previous
        if source.exists():
            shutil.copyfile(source, ROOT / current)
            (ROOT / current).chmod(0o600)


def rollback():
    previous = validate(json.loads((ROOT / '.previous-state.json').read_text()))
    services = json.loads((ROOT / '.rollback-services.json').read_text())
    if not isinstance(services, list) or any(name not in RUNTIME for name in services):
        raise ValueError('Invalid rollback service list')
    restore_files()
    tags(previous)
    if services:
        compose('pull', *services)
        compose('up', '-d', '--no-deps', *services)
        health(services)
    write(ROOT / '.release-state.json', previous)
    print('Restored selected application containers; database migrations were not reversed.')


def deploy(plan):
    if set(plan['services']) - set(RUNTIME) or set(plan['migrations']) - (set(IMAGES) - set(RUNTIME)):
        raise ValueError('Invalid deployment targets')
    old = load(ROOT)
    if old != plan['expected']:
        raise ValueError('Host state changed after planning; rerun the workflow')
    candidate = validate(plan['state'])
    if old:
        if (ROOT / '.release-state.json').exists() and not (ROOT / '.resolved.json').is_file():
            raise ValueError('Missing effective configuration snapshot')
        tags(old)
        if not (ROOT / '.release-state.json').exists():
            # Validate all references while converting a legacy single-tag release.
            compose('--profile', 'migration', 'pull')
        baseline = json.loads((ROOT / '.resolved.json').read_text()) if (ROOT / '.resolved.json').exists() else resolved()
        write(ROOT / '.resolved.json', baseline)
        for current, previous in SNAPSHOTS.items():
            shutil.copyfile(ROOT / current, ROOT / previous)
            (ROOT / previous).chmod(0o600)
        write(ROOT / '.previous-state.json', old)
    else:
        baseline = {}
    rollout = False
    services = list(plan['services'])
    try:
        shutil.copyfile(ROOT / 'compose.candidate.yml', ROOT / 'compose.yml')
        subprocess.run([PYTHON, str(ROOT / 'scripts/render-runtime.py'), 'app', str(ROOT)], check=True)
        tags(candidate)
        current = resolved()
        changed = {name for name in RUNTIME if current.get(name) != baseline.get(name)}
        if plan['restrict_services'] is not None:
            changed &= set(plan['restrict_services'])
        services = [name for name in RUNTIME if name in changed or name in services]
        migrations = plan['migrations']
        if services or migrations:
            compose('--profile', 'migration', 'pull', *services, *migrations)
        for migration in migrations:
            compose('--profile', 'migration', 'run', '--rm', '--no-deps', migration)
        write(ROOT / '.rollback-services.json', services)
        rollout = True
        if services:
            if old:
                compose('up', '-d', '--no-deps', *services)
            else:
                compose('up', '-d', *services)
            health(services)
        # Keep the effective baseline of running, unselected containers. This is
        # essential when a manual partial deploy skips another service's config.
        effective = dict(baseline)
        for name in services:
            effective[name] = current[name]
        for name in migrations:
            effective[name] = current[name]
        candidate['last_services'] = services
        write(ROOT / '.resolved.json', effective)
        write(ROOT / '.release-state.json', candidate)
        print('Deployed application services: ' + (', '.join(services) or 'configuration metadata only'))
    except Exception:
        if old:
            if rollout:
                rollback()
            else:
                restore_files()
                tags(old)
        else:
            print('First release failed; no previous release exists for rollback.', file=sys.stderr)
        raise


if __name__ == '__main__':
    os.umask(0o077)
    if sys.argv[1] == 'rollback':
        rollback()
    else:
        release = json.loads(Path(sys.argv[1]).read_text())
        if release['sha'] != sys.argv[2]:
            raise ValueError('Deployment SHA mismatch')
        deploy(release['roles']['app'])
