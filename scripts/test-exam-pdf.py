"""실행: reportlab과 pypdf가 있는 Python으로 이 파일을 실행한다."""
import importlib.util
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from pypdf import PdfReader

SCRIPT = Path(__file__).resolve().parents[1] / 'plugins/study-notes/skills/create-exam/scripts/render_exam.py'
spec = importlib.util.spec_from_file_location('render_exam', SCRIPT)
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


def example_exam(count=10):
    return {
        'title': '상태 전이 이해 점검',
        'source_title': '검증용 가상 모델',
        'questions': [{
            'stem': f'문항식별자 {i:02d}. 가상의 상태 모델에서 A가 신호를 받으면 B로 바뀐다. A가 신호를 한 번 받았을 때의 상태는?',
            'choices': ['A를 유지한다.', 'B가 된다.', 'C가 된다.', '종료된다.'],
            'answer': 1,
            'choice_explanations': ['신호를 받으면 상태가 바뀐다.', '모델에서 신호를 받은 A는 B로 전이한다.', 'C로의 전이는 정의되지 않았다.', '종료 전이는 정의되지 않았다.'],
            'source': '원문근거식별자: 신호를 받은 A는 B로 전이한다.',
            'topic': '상태 전이의 조건',
        } for i in range(1, count + 1)],
    }


class ExamTests(unittest.TestCase):
    def test_pdf_separates_questions_and_answers_without_missing_items(self):
        with TemporaryDirectory() as temp:
            questions, answers = renderer.render_exam(example_exam(), temp)
            q_reader, a_reader = PdfReader(questions), PdfReader(answers)
            q_text = '\n'.join(p.extract_text() for p in q_reader.pages)
            a_text = '\n'.join(p.extract_text() for p in a_reader.pages)
            for i in range(1, 11):
                self.assertIn(f'문항식별자 {i:02d}', q_text)
                self.assertRegex(a_text, rf'{i:02d}\s+정답')
            self.assertNotIn('정답 이유', q_text)
            self.assertNotIn('원문근거식별자', q_text)
            self.assertIn('원문근거식별자', a_text)
            self.assertNotIn('\ufffd', q_text + a_text)
            self.assertAlmostEqual(float(q_reader.pages[0].mediabox.width), 595.2756, places=2)

    def test_invalid_questions_rejected_before_writing(self):
        mutations = [
            {'answer': True}, {'answer': 4}, {'choices': ['중복'] * 4},
            {'choice_explanations': ['한 개만 있음']}, {'source': ''},
        ]
        for change in mutations:
            data = example_exam(1)
            data['questions'][0].update(change)
            with self.assertRaises(ValueError):
                renderer.validate_exam(data)

    def test_existing_files_are_preserved(self):
        with TemporaryDirectory() as temp:
            path = Path(temp) / 'questions.pdf'
            path.write_bytes(b'original')
            with self.assertRaises(FileExistsError):
                renderer.render_exam(example_exam(1), temp)
            self.assertEqual(path.read_bytes(), b'original')

    def test_too_long_title_leaves_no_partial_pdf(self):
        data = example_exam(1)
        data['title'] = '매우 긴 제목 ' * 100
        with TemporaryDirectory() as temp:
            with self.assertRaises(ValueError):
                renderer.render_exam(data, temp)
            self.assertFalse(list(Path(temp).glob('*.pdf')))


if __name__ == '__main__':
    unittest.main()
