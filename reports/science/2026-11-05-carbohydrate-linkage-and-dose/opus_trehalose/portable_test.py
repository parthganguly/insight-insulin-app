"""Prove the default replay is portable and read-only. Stdlib only.

  python -I -X utf8 portable_test.py [--record]

Copies ONLY trehalose.py, inputs.json, RESULTS.json, the plan and its receipt into a fresh temporary tree
(no source files), then runs the default --check there twice:
  1. byte-identical copies;
  2. the same files with LF converted to CRLF, as a Windows/Linux checkout might do.
Each copy is hashed before and after to show --check writes nothing. The temporary tree is deleted afterwards.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, subprocess, sys, tempfile

HERE = Path(__file__).resolve().parent
FILES = {'public/opus_trehalose/trehalose.py': HERE / 'trehalose.py',
         'public/opus_trehalose/inputs.json': HERE / 'inputs.json',
         'public/opus_trehalose/RESULTS.json': HERE / 'RESULTS.json',
         'public/TREHALOSE_PLAN.md': HERE.parent / 'TREHALOSE_PLAN.md',
         'public/receipts/TREHALOSE_FREEZE.json': HERE.parent / 'receipts' / 'TREHALOSE_FREEZE.json'}


def tree_hashes(root):
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*')) if p.is_file()}


def trial(crlf):
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        for rel, src in FILES.items():
            dst = root / rel; dst.parent.mkdir(parents=True, exist_ok=True)
            data = src.read_bytes()
            dst.write_bytes(data.replace(b'\r\n', b'\n').replace(b'\n', b'\r\n') if crlf else data)
        before = tree_hashes(root)
        p = subprocess.run([sys.executable, '-I', '-X', 'utf8', str(root / 'public/opus_trehalose/trehalose.py'), '--check'],
                           capture_output=True, text=True)
        after = tree_hashes(root)
        return {'line_endings': 'CRLF' if crlf else 'as stored', 'files_present': sorted(before),
                'source_download_present': any('source' in k.lower() and 'download' in k.lower() for k in before),
                'exit_code': p.returncode, 'output': p.stdout.strip(), 'files_unchanged': before == after}


if __name__ == '__main__':
    trials = [trial(False), trial(True)]
    verdict = 'PASS' if all(t['exit_code'] == 0 and t['files_unchanged'] and not t['source_download_present'] for t in trials) else 'FAIL'
    for t in trials: print(t['line_endings'], '->', t['output'], '| unchanged:', t['files_unchanged'])
    print(verdict, 'portable read-only replay')
    if '--record' in sys.argv:
        log = HERE / 'EXECUTION.json'; E = json.loads(log.read_text(encoding='utf-8'))
        E.setdefault('portable_tests', []).append({'utc': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
                                                    'command': 'python -I -X utf8 portable_test.py --record', 'result': verdict, 'trials': trials})
        log.write_text(json.dumps(E, indent=2) + '\n', encoding='utf-8', newline='\n')
    sys.exit(0 if verdict == 'PASS' else 1)
