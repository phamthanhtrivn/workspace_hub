"""Package configuration, upload an immutable S3 artifact, and await SSM completion."""
import hashlib
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import tarfile
import tempfile
import time

role, sha, instance, bucket = sys.argv[1:]
if role not in {'app', 'infra', 'realtime'} or len(sha) != 40 or any(c not in '0123456789abcdef' for c in sha):
    raise ValueError('Invalid deployment role or SHA')

def aws(*args):
    return subprocess.check_output(['aws', *args], text=True)

key = f'workspacehub/{role}/{sha}.tar.gz'
with tempfile.TemporaryDirectory() as staging:
    archive = Path(staging) / 'release.tar.gz'
    with tarfile.open(archive, 'w:gz') as bundle:
        bundle.add(f'deploy/prod/{role}', arcname='config', filter=lambda entry: None if Path(entry.name).name.startswith('.env') else entry)
        bundle.add('deploy/scripts', arcname='scripts', filter=lambda entry: None if '__pycache__' in Path(entry.name).parts or entry.name.endswith('.pyc') else entry)
        if role == 'infra':
            bundle.add('deploy/shared/postgres-init', arcname='config/postgres-init')
            bundle.add('deploy/shared/kafka/init-topics.sh', arcname='config/kafka-init.sh')
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    # The bundle is content checked on EC2; retries of this SHA may replace the same artifact safely.
    aws('s3', 'cp', str(archive), f's3://{bucket}/{key}', '--only-show-errors')
command = '\n'.join([
    'set -eu', 'umask 077',
    f'mkdir -p /opt/workspacehub/{role}',
    f'staging=$(mktemp -d /opt/workspacehub/{role}/bundle.XXXXXX)',
    'trap \'rm -rf "$staging"\' EXIT',
    f'aws s3 cp {shlex.quote(f"s3://{bucket}/{key}")} "$staging/release.tar.gz" --only-show-errors',
    f'printf \'%s  %s\\n\' {shlex.quote(digest)} "$staging/release.tar.gz" | sha256sum -c -',
    'tar -xzf "$staging/release.tar.gz" -C "$staging"',
    f'DOCKERHUB_PRIVATE_REPOSITORIES={shlex.quote(os.environ.get("DOCKERHUB_PRIVATE_REPOSITORIES") or "false")} bash "$staging/scripts/install-release.sh" {shlex.quote(role)} sha-{sha}',
])
response = json.loads(aws('ssm', 'send-command', '--instance-ids', instance, '--document-name', 'AWS-RunShellScript', '--parameters', json.dumps({'commands': [command], 'executionTimeout': ['1800']}), '--timeout-seconds', '600', '--output', 'json'))
command_id = response['Command']['CommandId']
print(f'SSM command {command_id} on {instance}', flush=True)
deadline = time.monotonic() + 2100
while time.monotonic() < deadline:
    time.sleep(10)
    try:
        invocation = json.loads(aws('ssm', 'get-command-invocation', '--command-id', command_id, '--instance-id', instance, '--output', 'json'))
    except subprocess.CalledProcessError:
        continue  # SendCommand is eventually consistent.
    status = invocation['Status']
    if status == 'Success':
        print('Deployment succeeded')
        sys.exit(0)
    if status not in {'Pending', 'InProgress', 'Delayed', 'Cancelling'}:
        # Remote output may include provider errors; do not copy it into GitHub logs.
        raise RuntimeError(f'SSM deployment ended with {status}; inspect command {command_id} in AWS')
raise TimeoutError(f'SSM deployment observation timed out: {command_id}')
