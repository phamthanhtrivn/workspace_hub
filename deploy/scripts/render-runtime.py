"""Render dotenv and LiveKit config without evaluating secrets as shell code."""
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import quote
from dotenv import dotenv_values
from dotenv.parser import parse_stream

role, directory = sys.argv[1:]
if role not in {'app', 'infra', 'realtime'}:
    raise ValueError('Invalid runtime role')
root = Path(directory)
source = root / '.env.production'
if not source.is_file():
    raise ValueError('Operator-managed .env.production is required')
# Reject malformed lines; disable interpolation and never execute env as shell.
with source.open(encoding='utf-8-sig') as stream:
    if any(binding.error for binding in parse_stream(stream)):
        raise ValueError('Invalid dotenv syntax')
values = dotenv_values(source, encoding='utf-8-sig', interpolate=False)
for key, value in values.items():
    if not re.fullmatch(r'[A-Z][A-Z0-9_]*', key) or value is None or any(c in value for c in '\n\r\0'):
        raise ValueError('Invalid runtime parameter name or multiline value')
    if key in {'IMAGE_TAG', 'PREVIOUS_IMAGE_TAG'}:
        raise ValueError('Release tags must not be stored in operator env')
required = {
    'app': 'DOCKERHUB_USERNAME INFRA_PRIVATE_HOST POSTGRES_USER POSTGRES_PASSWORD FRONTEND_URL JWT_SECRET_KEY INTERNAL_SERVICE_KEY AWS_REGION AWS_S3_BUCKET_NAME GOOGLE_CLIENT_ID LIVEKIT_URL LIVEKIT_PUBLIC_URL LIVEKIT_API_KEY LIVEKIT_API_SECRET MAIL_HOST MAIL_USERNAME MAIL_PASSWORD VAPID_SUBJECT VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY',
    'infra': 'POSTGRES_USER POSTGRES_PASSWORD INFRA_BIND_HOST KAFKA_ADVERTISED_HOST',
    'realtime': 'INFRA_PRIVATE_HOST LIVEKIT_URL LIVEKIT_PUBLIC_IP LIVEKIT_API_KEY LIVEKIT_API_SECRET LIVEKIT_WEBHOOK_URL',
}
missing = sorted(key for key in required[role].split() if not values.get(key))
if missing:
    raise ValueError('Missing required env names: ' + ', '.join(missing))
if 'POSTGRES_PASSWORD' in values:
    values['POSTGRES_PASSWORD_URLENCODED'] = quote(values['POSTGRES_PASSWORD'], safe='')
if not values:
    raise ValueError('No runtime parameters found')

def atomic_write(name, text):
    candidate = root / (name + '.new')
    with open(candidate, 'w', encoding='utf-8', opener=lambda path, flags: os.open(path, flags, 0o600)) as stream:
        os.chmod(candidate, 0o600)
        stream.write(text)
    os.replace(candidate, root / name)

# Compose double quotes decode JSON escapes; $$ prevents Compose interpolation.
# This also handles passwords ending in a backslash, where single quotes are unsafe.
atomic_write('.env.runtime', ''.join(f'{key}=' + json.dumps(value, ensure_ascii=False).replace('$', '$$') + '\n' for key, value in sorted(values.items())))
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
