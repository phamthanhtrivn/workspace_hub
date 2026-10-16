"""Check deploy failure/skip gating using the actual workflow conditions."""
import ast
from pathlib import Path
import re
import unittest
import yaml

ROOT = Path(__file__).resolve().parents[2]


def condition(expression, results, selected, cancelled=False):
    expression = expression.removeprefix('${{').removesuffix('}}').strip()
    expression = expression.replace('!cancelled()', str(not cancelled))
    expression = re.sub(r'needs\.([a-z]+)\.result', lambda match: repr(results[match[1]]), expression)
    expression = re.sub(r'needs\.plan\.outputs\.([a-z]+)', lambda match: repr('true' if selected.get(match[1]) else 'false'), expression)
    tree = ast.parse(expression.replace('&&', ' and ').replace('||', ' or '), mode='eval')
    def value(node):
        if isinstance(node, ast.Constant):
            return node.value
        if isinstance(node, ast.Compare) and len(node.ops) == 1 and isinstance(node.ops[0], ast.Eq):
            return value(node.left) == value(node.comparators[0])
        if isinstance(node, ast.BoolOp):
            values = [value(child) for child in node.values]
            return all(values) if isinstance(node.op, ast.And) else any(values)
        raise AssertionError('Unsupported deployment condition')
    return value(tree.body)


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.workflow = yaml.safe_load((ROOT / '.github/workflows/production-coordinator.yml').read_text())

    def test_app_runs_with_unselected_hosts_and_no_build(self):
        results = dict(plan='success', ci='success', build='skipped', infra='skipped', realtime='skipped')
        self.assertTrue(condition(self.workflow['jobs']['app']['if'], results, {'app': True}))
        for failure in ('failure', 'cancelled'):
            for job in results:
                with self.subTest(job=job, failure=failure):
                    self.assertFalse(condition(self.workflow['jobs']['app']['if'], {**results, job: failure}, {'app': True}))
        self.assertFalse(condition(self.workflow['jobs']['app']['if'], results, {'app': False}))
        self.assertFalse(condition(self.workflow['jobs']['app']['if'], results, {'app': True}, cancelled=True))

    def test_realtime_waits_for_infra_and_all_changes_use_one_push_entrypoint(self):
        results = dict(plan='success', ci='success', infra='skipped')
        self.assertTrue(condition(self.workflow['jobs']['realtime']['if'], results, {'realtime': True}))
        self.assertFalse(condition(self.workflow['jobs']['realtime']['if'], {**results, 'infra': 'failure'}, {'realtime': True}))
        self.assertIn('infra', self.workflow['jobs']['realtime']['needs'])
        self.assertIn('realtime', self.workflow['jobs']['app']['needs'])
        push = []
        for path in (ROOT / '.github/workflows').glob('*.yml'):
            document = yaml.safe_load(path.read_text())
            if 'push' in document.get('on', {}):
                push.append(path.name)
        self.assertEqual(push, ['release-production.yml'])
        self.assertEqual(self.workflow['concurrency'], {'group': 'workspacehub-production', 'cancel-in-progress': False})
