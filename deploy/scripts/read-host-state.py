"""Read only release metadata over the same verified SSH transport as deployment."""
import importlib.util
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
from catalog import ROLES
from release_state import validate

spec = importlib.util.spec_from_file_location('transport', Path(__file__).with_name('send-deployment.py'))
transport = importlib.util.module_from_spec(spec)
spec.loader.exec_module(transport)


def read(role):
    os.environ['SSH_HOST'] = os.environ[f'{role.upper()}_SSH_HOST']
    # The old host may not have our new runtime scripts yet. Use only stdlib and
    # never print operator env, runtime env, resolved Compose or Docker credentials.
    source = f'''import json, pathlib, re
root = pathlib.Path('/opt/workspacehub/{role}')
state = root / '.release-state.json'
legacy = root / '.release.env'
if state.exists():
    value = json.loads(state.read_text())
elif {role == 'app'} and legacy.exists():
    tags = [line[10:] for line in legacy.read_text().splitlines() if line.startswith('IMAGE_TAG=')]
    if len(tags) != 1 or not re.fullmatch(r'sha-[0-9a-f]{{40}}', tags[0]):
        raise ValueError('Invalid legacy state')
    value = {{'legacy_tag': tags[0]}}
else:
    value = None
print(json.dumps(value))
'''
    with transport.connection() as (_, ssh, _, _):
        response = subprocess.check_output([*ssh, 'sudo -n python3 -c ' + shlex.quote(source)], text=True, timeout=60)
    return validate(json.loads(response), role)


if __name__ == '__main__':
    Path(sys.argv[1]).write_text(json.dumps({role: read(role) for role in ROLES}))
