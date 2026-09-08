"""Vendor one negotiated agreement's body text out of lombard-contracts.

Emits a .txt with a provenance header: which .docx, which repo commit, the
docx's sha256, and how the extraction was done. The header is the thing that
makes the digest worth anything -- see mca/__tests__/sources-are-primary.test.ts.
"""
import hashlib, subprocess, sys, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
REPO = Path.home() / 'github/lombard/lombard-contracts'


def para_text(p):
    parts = []
    for node in p.iter():
        if node.tag == W + 't':
            parts.append(node.text or '')
        elif node.tag == W + 'tab':
            parts.append(' ')
        elif node.tag == W + 'br':
            parts.append(' ')
    return ''.join(parts)


def blocks(path):
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read('word/document.xml'))
    body = root.find(W + 'body')
    for child in body:
        if child.tag == W + 'p':
            t = ' '.join(para_text(child).split())
            if t:
                yield t
        elif child.tag == W + 'tbl':
            rows = []
            for tr in child.findall(W + 'tr'):
                cells = [' '.join(' '.join(para_text(p).split())
                                  for p in tc.findall(W + 'p')).strip()
                         for tc in tr.findall(W + 'tc')]
                rows.append(' | '.join(cells))
            t = ' // '.join(r for r in rows if r.strip(' |'))
            if t:
                yield '[TABLE] ' + t


name = sys.argv[1]
out = Path(sys.argv[2])
docx = REPO / 'sources' / f'{name}.docx'
sha = hashlib.sha256(docx.read_bytes()).hexdigest()
commit = subprocess.run(['git', '-C', str(REPO), 'rev-parse', 'HEAD'],
                        capture_output=True, text=True).stdout.strip()

header = f"""\
{name}.docx -- body text, extracted

Source:    lombard-contracts/sources/{name}.docx
Repository: https://github.com/lombardpay/lombard-contracts at {commit}
docx sha256: {sha}
Retrieved: from the working copy at ~/github/lombard/lombard-contracts, which is
           that repository at the commit above.

WHAT THIS IS. Lombard's own executed-form agreement -- primary text in the only
sense that matters here, because the words are ours and this file is the
document they were published in. It is not a statute and no regulator wrote it,
so the primary/secondary-publisher question `sources-are-primary.test.ts` asks
of `mca/sources/` does not arise; the question this header answers instead is
WHICH document, at WHICH revision.

HOW IT WAS EXTRACTED. word/document.xml, in document order: every <w:p> as one
line with runs joined and whitespace collapsed, every <w:tbl> as one line
prefixed `[TABLE]` with cells joined by ` | ` and rows by ` // `. Field codes,
comments and revision marks are not read. The `<<N>>` markers are the AcroForm
widget anchors the Lombard pipeline injects; they are part of the published
document and are kept.

WHY IT IS HERE. A clause in `mca/clauses/` carries the body a merchant reads.
That body is only worth anything if it is still the body the document ships,
and this file is what re-executes that claim on every test run. If the .docx
moves, the digest breaks and somebody has to look -- which is the event this
exists for.

--- BODY TEXT BEGINS ---
"""

lines = list(blocks(docx))
out.write_text(header + '\n'.join(lines) + '\n', encoding='utf-8')
print(f'{out}: {len(lines)} blocks, {out.stat().st_size} bytes')
