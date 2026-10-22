"""Portable regression checks for the new per-caller runtime credentials."""
import ast
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RENDERER = ROOT / 'deploy/scripts/render-runtime.py'


class ServiceCredentialTests(unittest.TestCase):
    def test_app_preflight_requires_strong_calendar_key_and_preserves_optional_ai_keys(self):
        tree = ast.parse(RENDERER.read_text(encoding='utf-8'))
        names = next(ast.literal_eval(node.value)['app'].split() for node in tree.body
                     if isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id == 'required' for target in node.targets))
        base = ''.join(f'{name}=fixture\n' for name in names)
        with tempfile.TemporaryDirectory(prefix='workspace-credentials-') as directory:
            root = Path(directory)
            source = root / '.env.production'

            def render(extra):
                source.write_text(base + extra, encoding='utf-8')
                return subprocess.run([sys.executable, str(RENDERER), 'app', directory], capture_output=True, text=True)

            for value in ('', 'local-internal-key'):
                result = render('CALENDAR_DOCUMENT_SERVICE_KEY=' + value + '\n')
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse((root / '.env.runtime').exists())
            calendar = 'fixture-calendar-document-not-production-000'
            gateway = 'fixture-gateway-proof-not-production-000'
            extra = f'CALENDAR_DOCUMENT_SERVICE_KEY={calendar}\nAI_GATEWAY_KEY={gateway}\n'
            original = base + extra
            result = render(extra)
            self.assertEqual(result.returncode, 0, result.stderr)
            runtime = (root / '.env.runtime').read_text(encoding='utf-8')
            self.assertIn('CALENDAR_DOCUMENT_SERVICE_KEY=' + json.dumps(calendar), runtime)
            self.assertIn('AI_GATEWAY_KEY=' + json.dumps(gateway), runtime)
            self.assertEqual(source.read_text(encoding='utf-8'), original)
            self.assertNotIn(calendar, result.stdout + result.stderr)
            result = render(extra + 'AI_DOCUMENT_SERVICE_KEY=weak\n')
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual((root / '.env.runtime').read_text(encoding='utf-8'), runtime)


if __name__ == '__main__':
    unittest.main()
