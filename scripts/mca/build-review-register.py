"""Derive the review register vendored into pacta from the two full finding files.

Two steps, and both are part of regenerating it:

    python3 scripts/mca/build-review-register.py \\
        packages/bizrethink/mca/clauses/source-documents/review-register.json
    npx biome format --write packages/bizrethink/mca/clauses/source-documents

The second is not optional and not cosmetic: `biome format` is a BLOCKING CI
gate on packages/bizrethink, and biome and json.dumps disagree about when a
short array stays on one line. Skipping it produces a file that is correct and
red. Run both and the output is byte-stable, so a regeneration against an
unchanged lombard-contracts is an empty diff.

Deterministic and re-runnable: anyone holding lombard-contracts can run this and
diff the result. What it drops is `evidence`, `consequence` and `fix` -- the
long-form fields -- because what a clause in pacta needs from a review is that
the finding EXISTS, what it was about and where it routed, not the argument.
"""
import hashlib, json, subprocess, sys
from pathlib import Path

REPO = Path.home() / 'github/lombard/lombard-contracts'
# A survived finding and a refuted one have different shapes in the source
# files: refuted entries carry `id`, `finding` and `why` and nothing else.
# Both are kept as they are rather than padded into one schema, because a
# refuted finding genuinely has no severity or route -- it was withdrawn.
KEEP = ('id', 'severity', 'category', 'document', 'locus', 'finding', 'decides', 'why')

commit = subprocess.run(['git', '-C', str(REPO), 'rev-parse', 'HEAD'],
                        capture_output=True, text=True).stdout.strip()

# BOTH reviews now record what was done about each finding. REVIEW-02's
# manifest landed in lombard-contracts PR #9; before it, every one of that
# review's 48 findings was `unrecorded` -- unknown, and counted as outstanding
# because unknown is not done. `unrecorded` stays in the vocabulary rather than
# being deleted: it is the honest answer for a review that has no manifest, and
# the next review to arrive without one should land on it rather than on a
# default that looks like an answer.
MANIFESTS = {'REVIEW-01': 'REVIEW-01-manifest.json', 'REVIEW-02': 'REVIEW-02-manifest.json'}
DISPOSITION, MANIFEST_SHA = {}, {}
for _review, _file in MANIFESTS.items():
    _raw = (REPO / _file).read_bytes()
    DISPOSITION[_review] = {e['id']: e['status'] for e in json.loads(_raw)['entries']}
    MANIFEST_SHA[_review] = hashlib.sha256(_raw).hexdigest()

reviews = []
for review, fname in (('REVIEW-01', 'REVIEW-01-findings.json'),
                      ('REVIEW-02', 'REVIEW-02-findings.json')):
    raw = (REPO / fname).read_bytes()
    doc = json.loads(raw)
    entries = []
    for status in ('survived', 'refuted'):
        for f in doc.get(status, []):
            e = {k: f[k] for k in KEEP if k in f}
            e['status'] = status
            e['review'] = review
            e['disposition'] = DISPOSITION.get(review, {}).get(f['id'], 'unrecorded')
            entries.append(e)
    entries.sort(key=lambda e: e['id'])
    reviews.append({
        'review': review,
        'file': fname,
        'sha256': hashlib.sha256(raw).hexdigest(),
        'manifest': MANIFESTS.get(review),
        'manifestSha256': MANIFEST_SHA.get(review),
        'survived': len(doc.get('survived', [])),
        'refuted': len(doc.get('refuted', [])),
        'coverageGaps': [g if isinstance(g, str) else g.get('id', g.get('gap', str(g)))
                         for g in doc.get('coverageGaps', [])],
        'findings': entries,
    })

out = {
    '_what': ('The two adversarial reviews of the Lombard negotiated agreements, '
              'indexed. Derived from lombard-contracts by '
              'scripts/mca/build-review-register.py; regenerate and diff rather '
              'than editing this file.'),
    '_repository': 'https://github.com/lombardpay/lombard-contracts',
    '_commit': commit,
    '_dispositions': ('Each finding carries the status from its review manifest '
                      '(implemented / open / handoff / rejected / wont-fix). A '
                      'finding absent from its manifest is `unrecorded` -- '
                      'unknown, which is not the same as open and not the same '
                      'as done, and which counts as outstanding. REVIEW-02 had '
                      'no manifest at all until lombard-contracts PR #9.'),
    '_whatThisProves': ('That a finding id a clause names is a finding that was '
                        'actually raised, what it was about and where it routed. '
                        'It does NOT prove the finding says what a clause claims '
                        'it says -- the argument lives in the source repository '
                        'and is not reproduced here.'),
    '_dropped': ['evidence', 'consequence', 'fix'],
    '_knownDefect': ('REVIEW-01 uses the id `frpa-cross-reference-titles-wrong` '
                     'for TWO different findings -- one against FL/GA/KS, one against '
                     'LA/MO/TX/UT. Finding ids are therefore not unique and this file '
                     'does not pretend otherwise; `examination.ts` resolves an id to a '
                     'LIST and names the ambiguity rather than silently keeping one.'),
    'reviews': reviews,
}

path = Path(sys.argv[1])
path.write_text(json.dumps(out, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
total = sum(len(r['findings']) for r in reviews)
print(f'{path}: {total} findings, {path.stat().st_size} bytes')
