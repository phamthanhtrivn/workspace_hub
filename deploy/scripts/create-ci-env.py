"""Create disposable fake Compose inputs; never read operator env files."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
values = {
    'IMAGE_TAG': 'sha-' + '0' * 40,
    'DOCKERHUB_USERNAME': 'workspacehub-ci', 'POSTGRES_USER': 'postgres',
    'POSTGRES_PASSWORD': 'ci-password', 'POSTGRES_PASSWORD_URLENCODED': 'ci-password',
    'NOTEBOOK_POSTGRES_PASSWORD': 'ci-notebook-password-at-least-32-chars',
    'NOTEBOOK_POSTGRES_PASSWORD_URLENCODED': 'ci-notebook-password-at-least-32-chars',
    'INFRA_PRIVATE_HOST': '192.0.2.10', 'INFRA_BIND_HOST': '192.0.2.10',
    'KAFKA_ADVERTISED_HOST': '192.0.2.10', 'AWS_REGION': 'ap-southeast-1',
    'AWS_S3_BUCKET_NAME': 'ci-bucket', 'FRONTEND_URL': 'https://app.example.invalid',
    'APP_DOMAIN': 'app.example.invalid', 'API_DOMAIN': 'api.example.invalid',
    'LIVEKIT_DOMAIN': 'rtc.example.invalid',
    'FRONTEND_PORT': '3000', 'KONG_BIND_HOST': '127.0.0.1', 'KONG_PORT': '8000', 'MAIL_PORT': '587',
    'RAG_MEMORY_LIMIT': '2g',
    'LIVEKIT_URL': 'ws://192.0.2.11:7880', 'LIVEKIT_PUBLIC_URL': 'wss://rtc.example.invalid',
    'NEXT_PUBLIC_API_URL': 'https://api.example.invalid',
    'NEXT_PUBLIC_NOMINATIM_URL': 'https://nominatim.openstreetmap.org',
    'LLM_BASE_URL': 'https://api.example.invalid/v1',
}
names = set()
for area in ('prod/app', 'prod/infra', 'prod/realtime'):
    names.update(re.findall(r'(?<!\$)\$\{([A-Z][A-Z0-9_]*)',
                            (ROOT / f'deploy/{area}/compose.yml').read_text()))
lines = []
for index, name in enumerate(sorted(names), start=1):
    if name in values:
        val = values[name]
    elif name.endswith('_IMAGE_TAG'):
        val = 'sha-' + format(index, '040x')
    elif name.endswith('_KEY'):
        val = f'ci-{name.lower()}-' + format(index, '032x')
    else:
        val = 'ci-placeholder'
    lines.append(f"{name}='{val}'\n")
Path(sys.argv[1]).write_text(''.join(lines), encoding='utf-8')
