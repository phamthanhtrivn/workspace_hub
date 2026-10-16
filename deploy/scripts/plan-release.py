"""Classify PR changes or reconcile production against each deployed image baseline."""
import argparse
import copy
import json
import os
from pathlib import Path
import subprocess
from catalog import IMAGES, ROLES, RUNTIME, classify
from release_state import SHA, validate


def diff(base, head, merge_base=False):
    if not base or subprocess.run(['git', 'cat-file', '-e', f'{base}^{{commit}}'], capture_output=True).returncode != 0:
        return None
    if merge_base:
        base = subprocess.check_output(['git', 'merge-base', base, head], text=True).strip()
    elif base != head and subprocess.run(['git', 'merge-base', '--is-ancestor', head, base], capture_output=True).returncode == 0:
        raise ValueError('Requested commit is older than deployed state; run the latest main workflow')
    raw = subprocess.check_output(['git', 'diff', '--name-only', '--no-renames', '-z', base, head])
    return raw.decode().split('\0')[:-1]


def selection(value):
    if value in ('auto', 'all'):
        return value
    names = {name.strip() for name in value.split(',')}
    if not names or not names <= set(RUNTIME):
        raise ValueError('Expected auto, all or comma-separated Compose service names')
    return names


def ci_outputs(images, checks):
    return dict(matrix={'include': [IMAGES[name] for name in IMAGES if name in images]},
                node=[IMAGES[name]['context'] for name in RUNTIME if name in checks and name not in ('user-service', 'kong', 'ai-service', 'ai-worker')],
                python=bool({'ai-service', 'ai-worker'} & checks),
                java='user-service' in checks, has_images=bool(images))


def production(sha, states, scope='auto', services='auto'):
    chosen = selection(services)
    if scope not in ('auto', *ROLES):
        raise ValueError('Invalid host scope')
    states = {role: validate(states.get(role), role) for role in ROLES}
    images, checks = set(), set()
    plans = {}
    for role in ROLES:
        old = states[role]
        permitted = scope == 'auto' or scope == role
        changes = diff(old['config_commit'], sha) if old else None
        if changes is not None:
            checks.update(classify(changes)[2])
        config_paths = None if changes is None else [path for path in changes if not path.startswith(('backend/', 'frontend/', 'deploy/shared/sql-migrations/')) and path != '.dockerignore']
        config_changed = config_paths is None or role in classify(config_paths)[1]
        selected_images = set()
        if role == 'app':
            for name in IMAGES:
                paths = diff(old['images'][name]['source_commit'], sha) if old and name in old['images'] else None
                if paths is None or name in classify(paths)[0]:
                    selected_images.add(name)
            if chosen == 'all':
                selected_images = set(IMAGES)
            elif isinstance(chosen, set) and old:
                selected_images &= chosen | {name + '-migration' for name in chosen if name.endswith('-service')}
                selected_images.update(chosen)
            if old:
                selected_images.update(set(IMAGES) - set(old['images']))
            if not permitted:
                selected_images.clear()
            images.update(selected_images)
            checks.update(name.removesuffix('-migration') for name in selected_images)
            if permitted and config_changed:
                checks.update(RUNTIME)
        enabled = permitted and (old is None or config_changed or bool(selected_images) or scope == role or (role == 'app' and services != 'auto'))
        candidate = copy.deepcopy(old) if old else dict(version=1, config_commit=sha, images={}, last_services=[])
        # Explicit partial APP selection must not mark unselected config as applied.
        if role != 'app' or not isinstance(chosen, set) or old is None:
            candidate['config_commit'] = sha if enabled else candidate['config_commit']
        for name in selected_images:
            candidate['images'][name] = dict(tag=f'sha-{sha}', source_commit=sha)
        runtime = [name for name in RUNTIME if name in selected_images]
        migrations = [name for name in IMAGES if name in selected_images and name.endswith('-migration')]
        candidate['last_services'] = runtime if role == 'app' else []
        plans[role] = dict(enabled=enabled, expected=old, state=candidate, services=runtime,
                           migrations=migrations, restrict_services=sorted(chosen) if isinstance(chosen, set) and old else None,
                           bootstrap=old is None, config_changed=config_changed)
    return dict(sha=sha, roles=plans, **ci_outputs(images, checks))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--sha', required=True)
    parser.add_argument('--base')
    parser.add_argument('--states')
    parser.add_argument('--existing')
    parser.add_argument('--scope', default='auto')
    parser.add_argument('--services', default='auto')
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    if not SHA.fullmatch(args.sha):
        raise ValueError('Invalid target SHA')
    if args.existing:
        result = json.loads(Path(args.existing).read_text())
        if result.get('sha') != args.sha:
            raise ValueError('CI plan SHA mismatch')
    elif args.states:
        result = production(args.sha, json.loads(Path(args.states).read_text()), args.scope, args.services)
    else:
        paths = diff(args.base, args.sha, merge_base=True)
        result = dict(sha=args.sha, **ci_outputs(*((set(IMAGES), set(RUNTIME)) if paths is None else (classify(paths)[0], classify(paths)[2]))))
    Path(args.output).write_text(json.dumps(result), encoding='utf-8')
    if os.environ.get('GITHUB_OUTPUT'):
        outputs = {key: result[key] for key in ('matrix', 'node', 'java', 'python', 'has_images')}
        outputs['plan'] = result
        outputs.update({role: result.get('roles', {}).get(role, {}).get('enabled', False) for role in ROLES})
        with open(os.environ['GITHUB_OUTPUT'], 'a') as stream:
            for key, value in outputs.items():
                stream.write(f'{key}={json.dumps(value, separators=(",", ":"))}\n')


if __name__ == '__main__':
    main()
