import json
import fcntl
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
import sys

SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts'
OLD = 'sha-' + '1' * 40
NEW = 'sha-' + '2' * 40


class RuntimeRenderingTests(unittest.TestCase):
    def render(self, root, role='infra'):
        return subprocess.run([sys.executable, str(SCRIPTS / 'render-runtime.py'), role, str(root)], text=True, capture_output=True)

    def test_literals_and_password_encoding(self):
        with tempfile.TemporaryDirectory() as directory:
            secret = "p$#a'ss\\word"
            source = Path(directory) / '.env.production'
            source.write_text("POSTGRES_USER=postgres\nINFRA_BIND_HOST=192.0.2.10\nKAFKA_ADVERTISED_HOST=192.0.2.10\nPOSTGRES_PASSWORD='" + secret.replace('\\', '\\\\').replace("'", "\\'") + "'\nLITERAL='${HOME} $(touch sentinel) `whoami`'\n")
            original = source.read_bytes()
            result = self.render(directory)
            self.assertEqual(result.returncode, 0, result.stderr)
            text = (Path(directory) / '.env.runtime').read_text()
            self.assertIn('POSTGRES_PASSWORD=' + json.dumps(secret).replace('$', '$$'), text)
            self.assertIn('$${HOME} $$(touch sentinel) `whoami`', text)
            self.assertIn('POSTGRES_PASSWORD_URLENCODED', text)
            self.assertEqual((Path(directory) / '.env.runtime').stat().st_mode & 0o777, 0o600)
            self.assertEqual(source.read_bytes(), original)
            self.assertNotIn(secret, result.stdout)

    @unittest.skipUnless(shutil.which('docker'), 'Docker Compose CLI required')
    def test_compose_receives_exact_secret_literals(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            secrets = ["p$#a'ss\\word", 'ends-in-backslash\\', '${HOME} $(touch sentinel) `whoami`', 'two\\\\slashes "quote"']
            (root / 'compose.yml').write_text('services:\n  probe:\n    image: postgres:15.18-alpine\n    environment:\n      SECRET: ${POSTGRES_PASSWORD}\n')
            for secret in secrets:
                with self.subTest(secret=secret):
                    (root / '.env.production').write_text("POSTGRES_USER=postgres\nINFRA_BIND_HOST=192.0.2.10\nKAFKA_ADVERTISED_HOST=192.0.2.10\nPOSTGRES_PASSWORD='" + secret.replace('\\', '\\\\').replace("'", "\\'") + "'\n")
                    rendered = self.render(root)
                    self.assertEqual(rendered.returncode, 0, rendered.stderr)
                    # Compose re-escapes dollar signs when serializing a resolved
                    # model. --environment exposes the actual parsed input values.
                    resolved = subprocess.check_output(['docker', 'compose', '--env-file', str(root / '.env.runtime'), '-f', str(root / 'compose.yml'), 'config', '--environment'], text=True)
                    parsed = dict(line.split('=', 1) for line in resolved.splitlines() if '=' in line)
                    self.assertEqual(parsed['POSTGRES_PASSWORD'], secret)

    def test_release_tag_cannot_override_candidate(self):
        with tempfile.TemporaryDirectory() as directory:
            (Path(directory) / '.env.production').write_text(f'IMAGE_TAG={OLD}\n')
            result = self.render(directory)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse((Path(directory) / '.env.runtime').exists())

    def test_missing_source_or_required_values_stop_rendering(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertNotEqual(self.render(directory).returncode, 0)
            (Path(directory) / '.env.production').write_text('POSTGRES_USER=postgres\n')
            self.assertNotEqual(self.render(directory).returncode, 0)
            self.assertFalse((Path(directory) / '.env.runtime').exists())

    def test_invalid_dotenv_stops_rendering(self):
        for content in ("POSTGRES_PASSWORD='unclosed", 'bad line with spaces', 'POSTGRES_PASSWORD=\n'):
            with self.subTest(content=content), tempfile.TemporaryDirectory() as directory:
                (Path(directory) / '.env.production').write_text(content)
                self.assertNotEqual(self.render(directory).returncode, 0)
                self.assertFalse((Path(directory) / '.env.runtime').exists())

    def test_realtime_configuration_is_generated_from_operator_env(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ('livekit', 'egress'):
                shutil.copy(SCRIPTS.parent / f'prod/realtime/{name}.yaml', root)
            source = 'INFRA_PRIVATE_HOST=192.0.2.10\nLIVEKIT_URL=ws://192.0.2.11:7880\nLIVEKIT_PUBLIC_IP=192.0.2.11\nLIVEKIT_API_KEY=ci-key\nLIVEKIT_API_SECRET=ci-secret\nLIVEKIT_WEBHOOK_URL=http://192.0.2.12:8000/api/meetings/livekit/webhook\n'
            (root / '.env.production').write_text(source)
            result = self.render(root, 'realtime')
            self.assertEqual(result.returncode, 0, result.stderr)
            livekit = json.loads((root / 'livekit.runtime.yaml').read_text())
            egress = json.loads((root / 'egress.runtime.yaml').read_text())
            self.assertEqual(livekit['keys'], {'ci-key': 'ci-secret'})
            self.assertEqual(egress['redis']['address'], '192.0.2.10:6379')
            self.assertEqual((root / '.env.production').read_text(), source)


if __name__ == '__main__':
    unittest.main()
