"""Create disposable fake Compose inputs; never read operator env files."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
values = {
    'IMAGE_TAG': 'sha-' + '0' * 40,
    'DOCKERHUB_USERNAME': 'workspacehub-ci', 'POSTGRES_USER': 'postgres',
    'POSTGRES_PASSWORD': 'ci-password', 'POSTGRES_PASSWORD_URLENCODED': 'ci-password',
    'INFRA_PRIVATE_HOST': '192.0.2.10', 'INFRA_BIND_HOST': '192.0.2.10',
    'KAFKA_ADVERTISED_HOST': '192.0.2.10', 'AWS_REGION': 'ap-southeast-2',
    'AWS_S3_BUCKET_NAME': 'ci-bucket', 'FRONTEND_URL': 'http://localhost:3000',
    'FRONTEND_PORT': '3000', 'KONG_PORT': '8000', 'MAIL_PORT': '587',
    'LIVEKIT_URL': 'ws://192.0.2.11:7880', 'LIVEKIT_PUBLIC_URL': 'ws://192.0.2.11:7880',
    'NEXT_PUBLIC_API_URL': 'http://localhost:8000',
    'NEXT_PUBLIC_NOMINATIM_URL': 'https://nominatim.openstreetmap.org',
    'AI_ENABLED': 'false', 'GEMINI_MODEL': 'gemini-3.8-flash',
    'GEMINI_EMBEDDING_MODEL': 'gemini-embedding-2', 'GEMINI_REQUESTS_PER_MINUTE': '5',
    'GEMINI_REQUESTS_PER_DAY': '100', 'GEMINI_TOKENS_PER_MINUTE': '20000',
}
names = set()
for area in ('prod/app', 'prod/infra', 'prod/realtime'):
    names.update(re.findall(r'(?<!\$)\$\{([A-Z][A-Z0-9_]*)',
                            (ROOT / f'deploy/{area}/compose.yml').read_text()))
Path(sys.argv[1]).write_text(''.join(f"{name}='{values.get(name, 'sha-' + format(index, '040x') if name.endswith('_IMAGE_TAG') else 'ci-placeholder')}'\n"
                                   for index, name in enumerate(sorted(names), start=1)), encoding='utf-8')
