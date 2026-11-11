import io
import unittest
import zipfile
from unittest.mock import patch
from PIL import Image
from app.visual import VisualExtractor


class VisualPolicyTests(unittest.TestCase):
    def document(self):
        picture = io.BytesIO()
        with Image.new('RGB', (160, 160), 'white') as image:
            image.save(picture, format='PNG')
        document = io.BytesIO()
        with zipfile.ZipFile(document, 'w') as archive:
            archive.writestr('word/media/image1.png', picture.getvalue())
        return document.getvalue()

    def test_readable_docx_image_keeps_ocr_text_without_a_remote_vision_call(self):
        extractor = VisualExtractor(lambda *_: [('Original document text', None)])
        with patch.object(extractor, 'read_image', return_value=('Recognized image text', False)):
            result = extractor.extract('test.docx', self.document())
        self.assertEqual(result['images'], [])
        self.assertIn('Recognized image text', [page['text'] for page in result['pages']])

    def test_ambiguous_docx_image_still_requires_vision_and_keeps_ocr(self):
        extractor = VisualExtractor(lambda *_: [('Original document text', None)])
        with patch.object(extractor, 'read_image', return_value=('Partial image text', True)):
            result = extractor.extract('test.docx', self.document())
        self.assertEqual(len(result['images']), 1)
        self.assertIn('Partial image text', [page['text'] for page in result['pages']])


if __name__ == '__main__':
    unittest.main(argv=['test_visual_policy'], verbosity=2)
