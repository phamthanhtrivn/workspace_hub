"""Strict, non-secret release state and atomic host metadata writes."""
import json
import os
from pathlib import Path
import re
from catalog import IMAGES, LEGACY_IMAGES, RUNTIME

SHA = re.compile(r'[0-9a-f]{40}')


def validate(state, role='app'):
    if state is None:
        return None
    if not isinstance(state, dict):
        raise ValueError('Invalid release state')
    if set(state) == {'legacy_tag'}:
        tag = state['legacy_tag']
        if role != 'app' or not isinstance(tag, str) or not re.fullmatch(r'sha-[0-9a-f]{40}', tag):
            raise ValueError('Invalid legacy tag')
        return dict(version=1, config_commit=tag[4:], images={key: dict(tag=tag, source_commit=tag[4:]) for key in LEGACY_IMAGES}, last_services=[name for name in RUNTIME if name in LEGACY_IMAGES])
    if state.get('version') != 1 or not isinstance(state.get('config_commit'), str) or not SHA.fullmatch(state['config_commit']):
        raise ValueError('Invalid release version or config commit')
    if not isinstance(state.get('last_services'), list) or any(name not in RUNTIME for name in state['last_services']):
        raise ValueError('Invalid release service list')
    images = state.get('images')
    allowed = (set(IMAGES), LEGACY_IMAGES) if role == 'app' else (set(),)
    if not isinstance(images, dict) or set(images) not in allowed:
        raise ValueError('Incomplete image state')
    for image in images.values():
        if not isinstance(image, dict) or not isinstance(image.get('tag'), str) or not re.fullmatch(r'sha-[0-9a-f]{40}', image['tag']) or not isinstance(image.get('source_commit'), str) or not SHA.fullmatch(image['source_commit']):
            raise ValueError('Invalid image tag or source commit')
        if image['tag'][4:] != image['source_commit']:
            raise ValueError('Image tag does not match its source commit')
    return state


def load(root, role='app'):
    path = Path(root) / '.release-state.json'
    if path.exists():
        return validate(json.loads(path.read_text()), role)
    legacy = Path(root) / '.release.env'
    if role == 'app' and legacy.exists():
        matches = [line[10:] for line in legacy.read_text().splitlines() if line.startswith('IMAGE_TAG=')]
        if len(matches) != 1:
            raise ValueError('Invalid legacy release file')
        return validate({'legacy_tag': matches[0]})
    return None


def write(path, value):
    path = Path(path)
    candidate = path.with_name(path.name + '.new')
    with open(candidate, 'w', encoding='utf-8', opener=lambda name, flags: os.open(name, flags, 0o600)) as stream:
        os.chmod(candidate, 0o600)
        json.dump(value, stream, sort_keys=True)
    os.replace(candidate, path)
