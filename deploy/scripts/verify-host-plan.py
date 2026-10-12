"""Compare host state under flock, and record infra/realtime only after success."""
import json
from pathlib import Path
import sys
from release_state import load, validate, write

role, directory, plan_file, sha = sys.argv[1:5]
plan = json.loads(Path(plan_file).read_text())
if role not in ('app', 'infra', 'realtime') or plan['sha'] != sha:
    raise ValueError('Invalid host plan')
selected = plan['roles'][role]
if not selected['enabled'] or load(directory, role) != validate(selected['expected'], role):
    raise ValueError('Host state changed after planning; rerun the workflow')
validate(selected['state'], role)
if '--commit' in sys.argv[5:]:
    write(Path(directory) / '.release-state.json', selected['state'])
