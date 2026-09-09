#!/usr/bin/env python3
"""Re-vendor the MCA corpus from lombard-contracts, in one command.

    npm run mca:revendor            # do it
    npm run mca:revendor -- --check # report drift and change nothing

WHY THIS EXISTS. Re-vendoring was four steps in a runbook nobody had written
down: run the vendor script once per changed document, regenerate the review
register, run `biome format` over the JSON because CI blocks on it, then find
the new digests by hand and paste them into `instruments.ts`. Every one of
those is mechanical, and the two that are easiest to skip -- the format pass
and the digest paste -- fail in ways that look like something else. The format
failure looks like a lint problem; a missed digest looks like a passing test
suite, because a digest nobody updated is a digest that still matches the copy
nobody re-read.

The gate this DOES NOT remove. Re-vendoring deliberately breaks the digests of
every document whose words moved, and those breaks are the mechanism telling a
human to re-read the clause bodies. This script updates the vendored TEXT and
tells you exactly which clauses now differ; it does NOT touch clause bodies and
it does NOT re-stamp `bodiesVerifiedAt`. Those are the two acts that assert
somebody read the document, and a script cannot do that.

    scripts/mca/vendor-agreement.py     one document, the primitive
    scripts/mca/build-review-register.py the two review manifests, indexed
    this                                 both, plus formatting and a diff report
"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
LOMBARD = Path.home() / 'github' / 'lombard' / 'lombard-contracts'
SOURCE_DOCS = REPO / 'packages/bizrethink/mca/clauses/source-documents'
INSTRUMENTS = REPO / 'packages/bizrethink/mca/clauses/instruments.ts'
REGISTER = SOURCE_DOCS / 'review-register.json'
BODY_MARKER = '--- BODY TEXT BEGINS ---'


def norm(s: str) -> str:
    """The normaliser `mca/provenance/source-text.ts` uses. Must stay identical."""
    s = s.replace('‘', "'").replace('’', "'")
    s = s.replace('“', '"').replace('”', '"')
    s = s.replace('–', '-').replace('—', '-')
    return re.sub(r'\s+', ' ', s).strip()


def digest_of(path: Path) -> str:
    text = path.read_text(encoding='utf-8')
    body = text.split(BODY_MARKER, 1)[1]
    return hashlib.sha256(norm(body).encode()).hexdigest()


def vendored_documents() -> list[str]:
    """Every agreement `instruments.ts` names, read off the file rather than listed here."""
    names = re.findall(r"sourceDocument: '([^']+\.txt)'", INSTRUMENTS.read_text(encoding='utf-8'))
    if not names:
        sys.exit('no sourceDocument entries found in instruments.ts')
    return names


def run(script: str, *args: str) -> None:
    subprocess.run([sys.executable, str(REPO / 'scripts' / 'mca' / script), *args],
                   check=True, cwd=REPO, stdout=subprocess.DEVNULL)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--check', action='store_true',
                        help='report what would change and write nothing')
    args = parser.parse_args()

    if not LOMBARD.exists():
        sys.exit(f'lombard-contracts not found at {LOMBARD} — it is the source of every document here')

    commit = subprocess.run(['git', '-C', str(LOMBARD), 'rev-parse', '--short', 'HEAD'],
                            capture_output=True, text=True).stdout.strip()
    dirty = subprocess.run(['git', '-C', str(LOMBARD), 'status', '--porcelain'],
                           capture_output=True, text=True).stdout.strip()

    print(f'lombard-contracts at {commit}' + ('  (WORKING TREE DIRTY)' if dirty else ''))
    if dirty:
        print('  Vendoring from an uncommitted tree records a commit that does not contain\n'
              '  what was vendored. Commit there first, or accept that the header lies.\n')

    before = {name: (digest_of(SOURCE_DOCS / name) if (SOURCE_DOCS / name).exists() else None)
              for name in vendored_documents()}
    def register_content():
        """The register's DATA, not its bytes.

        `build-review-register.py` writes with one-space indent and `biome
        format` rewrites it to biome's own shape, so a byte comparison in
        --check mode reports CHANGED on every run when nothing has changed --
        a check that always cries wolf is a check people stop reading.
        """
        return json.loads(REGISTER.read_text(encoding='utf-8')) if REGISTER.exists() else None

    register_before = register_content()

    if args.check:
        import tempfile
        scratch = Path(tempfile.mkdtemp())
    for name in before:
        stem = name[:-4]
        target = (scratch / name) if args.check else (SOURCE_DOCS / name)
        run('vendor-agreement.py', stem, str(target))

    register_target = (scratch / 'review-register.json') if args.check else REGISTER
    run('build-review-register.py', str(register_target))

    if not args.check:
        subprocess.run(['npx', 'biome', 'format', '--write', str(SOURCE_DOCS)],
                       check=True, cwd=REPO, stdout=subprocess.DEVNULL)

    after = {name: digest_of((scratch / name) if args.check else (SOURCE_DOCS / name)) for name in before}
    moved = [n for n in before if before[n] != after[n]]
    register_after = json.loads(register_target.read_text(encoding='utf-8'))
    register_moved = register_after != register_before

    print()
    for name in before:
        state = 'CHANGED' if before[name] != after[name] else 'unchanged'
        print(f'  {state:9}  {name}')
    print(f'  {"CHANGED" if register_moved else "unchanged":9}  review-register.json')

    if not moved and not register_moved:
        print('\nNothing moved. The vendored corpus already matches lombard-contracts.')
        return 0

    print(f'\n{len(moved)} document(s) changed.' + ('  --check: nothing was written.' if args.check else ''))

    if not args.check and moved:
        # The digests in instruments.ts are now wrong on purpose. Printing them
        # is the most this script may do: pasting them in would assert that
        # somebody re-read the clause bodies, which is the one claim the digest
        # exists to make un-fakeable.
        print('\nNEW DIGESTS — paste into packages/bizrethink/mca/clauses/instruments.ts')
        print('ONLY after re-reading the clause bodies the tests below name as changed:\n')
        for name in moved:
            print(f"  {name}\n    {before[name]}\n    -> {after[name]}")
        print('\nNext:')
        print('  npx vitest run --root packages/bizrethink mca/clauses')
        print('     The red names every clause whose words moved. Re-read each body FROM')
        print('     the re-vendored text — never retype it — then update the digest and')
        print('     re-stamp bodiesVerifiedAt.')

    return 0


if __name__ == '__main__':
    sys.exit(main())
