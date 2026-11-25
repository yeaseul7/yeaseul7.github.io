"""검토한 객관식 문항 JSON을 문제지와 답지 PDF로 출력한다 (reportlab 필요)."""
import argparse
import json
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, Frame, HRFlowable, KeepTogether, PageTemplate, Paragraph, Spacer


def validate_exam(data):
    def text(value, label):
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f'{label}: 비어 있지 않은 문자열이 필요합니다.')
    text(data.get('title'), 'title')
    questions = data.get('questions')
    if not isinstance(questions, list) or not 1 <= len(questions) <= 50:
        raise ValueError('문항 수는 1~50개여야 합니다.')
    for i, q in enumerate(questions, 1):
        if not isinstance(q, dict):
            raise ValueError(f'{i}번 문항 형식이 잘못되었습니다.')
        for key in ('stem', 'source', 'topic'):
            text(q.get(key), f'{i}번 {key}')
        for key in ('choices', 'choice_explanations'):
            if not isinstance(q.get(key), list) or len(q[key]) != 4:
                raise ValueError(f'{i}번 {key}: 네 항목이 필요합니다.')
            for value in q[key]:
                text(value, f'{i}번 {key}')
        if len({v.strip() for v in q['choices']}) != 4:
            raise ValueError(f'{i}번 보기가 중복됩니다.')
        if type(q.get('answer')) is not int or not 0 <= q['answer'] < 4:
            raise ValueError(f'{i}번 answer는 0~3의 정수여야 합니다.')
    return data


def register_font(font_path=None):
    candidates = [Path(font_path)] if font_path else [
        Path('/usr/share/fonts/truetype/nanum/NanumGothic.ttf'),
        Path('/usr/share/fonts/truetype/noto/NotoSansKR-Regular.ttf'),
        Path('/System/Library/Fonts/Supplemental/AppleGothic.ttf'),
        Path('/System/Library/Fonts/Supplemental/Arial Unicode.ttf'),
    ]
    failures = []
    for path in candidates:
        if not path.is_file():
            continue
        try:
            font = TTFont('ExamKorean', str(path))
            required = '한글이해정답해설①②③④'
            if any(ord(char) not in font.face.charToGlyph for char in required):
                raise ValueError('한글 또는 보기 번호 글리프가 없습니다.')
            pdfmetrics.registerFont(font)
            return 'ExamKorean'
        except Exception as error:
            failures.append(f'{path.name}: {error}')
    raise ValueError('한글 TrueType 폰트가 필요합니다. --font로 지정하세요. ' + '; '.join(failures))


def render_exam(data, output_dir, font_path=None):
    validate_exam(data)
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    paths = [output / 'questions.pdf', output / 'answers.pdf']
    if any(p.exists() for p in paths):
        raise FileExistsError('기존 PDF가 있습니다. 새 출력 폴더를 사용하세요.')
    font = register_font(font_path)
    width, height = A4
    margin, gutter, top, bottom = 36, 20, 115, 40
    full_width = width - margin * 2
    frame_height = height - top - bottom
    body = ParagraphStyle('body', fontName=font, fontSize=9, leading=14, wordWrap='CJK', spaceAfter=6)
    number = ParagraphStyle('number', parent=body, fontSize=12, leading=17, spaceAfter=8)
    small = ParagraphStyle('small', parent=body, fontSize=8, leading=12, textColor=colors.HexColor('#59616c'))
    heading = ParagraphStyle('heading', parent=body, fontSize=15, leading=21, alignment=TA_CENTER)

    def paragraph(value, style=body):
        return Paragraph(escape(value).replace('\n', '<br/>'), style)

    def question_items(index, q):
        items = [paragraph(f'{index:02d}', number), paragraph(q['stem'])]
        items.extend(paragraph(f'{"①②③④"[i]}  {choice}') for i, choice in enumerate(q['choices']))
        items.extend([Spacer(1, 7), paragraph('풀이 메모', small),
                      HRFlowable(width='100%', color=colors.HexColor('#d9dde2'), thickness=0.4), Spacer(1, 15)])
        return items

    def fits(items, available_width):
        total = 0
        for item in items:
            _, item_height = item.wrap(available_width - 12, frame_height)
            total += item_height + item.getSpaceBefore() + item.getSpaceAfter()
        return total <= frame_height - 12

    column_width = (full_width - gutter) / 2
    columns = 2 if all(fits(question_items(i, q), column_width) for i, q in enumerate(data['questions'], 1)) else 1
    if not all(fits(question_items(i, q), full_width) for i, q in enumerate(data['questions'], 1)):
        raise ValueError('한 문항이 페이지보다 깁니다. 질문과 보기를 줄이거나 문항을 나누세요.')

    def make_document(path, kind, column_count):
        def decorate(canvas, doc):
            canvas.saveState()
            canvas.setStrokeColor(colors.HexColor('#d9dde2'))
            canvas.rect(24, 24, width - 48, height - 48, stroke=1, fill=0)
            title = paragraph(data['title'] + (' - 정답과 해설' if kind == '답지' else ''), heading)
            _, title_height = title.wrap(full_width, 60)
            if title_height > 48:
                raise ValueError('제목이 너무 깁니다. 두 줄 이내로 줄여 주세요.')
            title.drawOn(canvas, margin, height - 35 - title_height)
            canvas.setFont(font, 8)
            canvas.setFillColor(colors.HexColor('#303640'))
            canvas.drawString(margin, height - 91, f'{len(data["questions"])}문항  |  {kind}')
            if kind == '문제지':
                canvas.drawRightString(width - margin, height - 91, '이름: __________________')
            canvas.line(margin, height - 101, width - margin, height - 101)
            canvas.setFont(font, 7)
            canvas.drawRightString(width - margin, 29, f'{kind}  |  {doc.page}')
            if column_count == 2:
                canvas.line(width / 2, bottom, width / 2, height - top)
            canvas.restoreState()

        doc = BaseDocTemplate(str(path), pagesize=A4, title=data['title'] + ' ' + kind)
        usable_width = (full_width - gutter * (column_count - 1)) / column_count
        frames = [Frame(margin + i * (usable_width + gutter), bottom, usable_width, frame_height, id=f'column-{i}')
                  for i in range(column_count)]
        doc.addPageTemplates(PageTemplate(id=kind, frames=frames, onPage=decorate))
        return doc

    exam = [paragraph('각 문항에서 가장 알맞은 답 하나를 고르세요.', small), Spacer(1, 6)]
    for index, q in enumerate(data['questions'], 1):
        exam.append(KeepTogether(question_items(index, q)))

    answers = []
    for index, q in enumerate(data['questions'], 1):
        correct = q['answer']
        answers.append(KeepTogether([
            paragraph(f'{index:02d}  정답 {"①②③④"[correct]} - {q["topic"]}', number),
            paragraph('정답 이유: ' + q['choice_explanations'][correct]),
        ]))
        for i, explanation in enumerate(q['choice_explanations']):
            if i != correct:
                answers.append(paragraph(f'{"①②③④"[i]} 오답 이유: {explanation}'))
        answers.extend([paragraph('원문 근거: ' + q['source'], small), Spacer(1, 12)])
    answers.append(paragraph('다시 확인할 핵심 개념', number))
    for index, q in enumerate(data['questions'], 1):
        answers.append(paragraph(f'{index:02d}  {q["topic"]}'))

    # 두 파일 모두 완성된 뒤 결과 폴더에 옮겨, 실패한 PDF를 완성본으로 남기지 않는다.
    from tempfile import TemporaryDirectory
    with TemporaryDirectory(dir=output) as temp:
        staging = [Path(temp) / p.name for p in paths]
        make_document(staging[0], '문제지', columns).build(exam)
        make_document(staging[1], '답지', 1).build(answers)
        for source, target in zip(staging, paths):
            source.replace(target)
    return paths


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--font', type=Path)
    args = parser.parse_args()
    for result in render_exam(json.loads(args.input.read_text(encoding='utf-8')), args.output_dir, args.font):
        print(result.resolve())
