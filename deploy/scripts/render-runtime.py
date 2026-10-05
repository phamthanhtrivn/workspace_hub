"""Render dotenv and LiveKit config without evaluating secrets as shell code."""
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import quote

role, directory = sys.argv[1:]
parameters = json.load(sys.stdin)['Parameters']
values = {entry['Name'].rsplit('/', 1)[-1]: entry['Value'] for entry in parameters}
for key, value in values.items():
    if not re.fullmatch(r'[A-Z][A-Z0-9_]*', key) or '\n' in value or '\r' in value:
        raise ValueError('Invalid runtime parameter name or multiline value')
    if key in {'IMAGE_TAG', 'PREVIOUS_IMAGE_TAG'}:
        raise ValueError('Release tags must not be stored in runtime secrets')
if 'POSTGRES_PASSWORD' in values:
    values['POSTGRES_PASSWORD_URLENCODED'] = quote(values['POSTGRES_PASSWORD'], safe='')
if not values:
    raise ValueError('No runtime parameters found')
root = Path(directory)
root.mkdir(parents=True, exist_ok=True)

def atomic_write(name, text):
    candidate = root / (name + '.new')
    candidate.write_text(text, encoding='utf-8')
    candidate.chmod(0o600)
    os.replace(candidate, root / name)

# Compose dotenv single quotes preserve literal $, #, spaces and backslashes.
atomic_write('.env.production', ''.join(f"{key}='" + value.replace("'", "\\'") + "'\n" for key, value in sorted(values.items())))
if role == 'realtime':
    livekit = json.loads((root / 'livekit.yaml').read_text())
    livekit['keys'] = {values['LIVEKIT_API_KEY']: values['LIVEKIT_API_SECRET']}
    livekit['redis']['address'] = values['INFRA_PRIVATE_HOST'] + ':6379'
    livekit['rtc']['node_ip'] = values['LIVEKIT_PUBLIC_IP']
    livekit['webhook'] = {'api_key': values['LIVEKIT_API_KEY'], 'urls': [values['LIVEKIT_WEBHOOK_URL']]}
    egress = json.loads((root / 'egress.yaml').read_text())
    egress.update(api_key=values['LIVEKIT_API_KEY'], api_secret=values['LIVEKIT_API_SECRET'], ws_url=values['LIVEKIT_URL'])
    egress['redis']['address'] = values['INFRA_PRIVATE_HOST'] + ':6379'
    atomic_write('livekit.runtime.yaml', json.dumps(livekit, indent=2))
    atomic_write('egress.runtime.yaml', json.dumps(egress, indent=2))
