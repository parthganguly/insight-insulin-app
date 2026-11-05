"""Prove the default replay is portable and read-only. Stdlib only.

  python -I -X utf8 portable_test.py [--record]

Copies ONLY pair.py, inputs.json, RESULTS.json, ../PLAN.md and ../FREEZE.json into a fresh temporary tree
(no source images), then runs the default --check there twice: byte-identical, and with CRLF line endings.
Every file is hashed before and after to show --check writes nothing. The temporary tree is deleted afterwards.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, subprocess, sys, tempfile

HERE = Path(__file__).resolve().parent
FILES = {'public/opus_pair/pair.py': HERE / 'pair.py',
         'public/opus_pair/inputs.json': HERE / 'inputs.json',
         'public/opus_pair/RESULTS.json': HERE / 'RESULTS.json',
         'public/PLAN.md': HERE.parent / 'PLAN.md',
         'public/FREEZE.json': HERE.parent / 'FREEZE.json'}


def hashes(root):
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*')) if p.is_file()}


def trial(crlf):
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        for rel, src in FILES.items():
            dst = root / rel; dst.parent.mkdir(parents=True, exist_ok=True)
            data = src.read_bytes()
            dst.write_bytes(data.replace(b'\r\n', b'\n').replace(b'\n', b'\r\n') if crlf else data)
        before = hashes(root)
        p = subprocess.run([sys.executable, '-I', '-X', 'utf8', str(root / 'public/opus_pair/pair.py'), '--check'],
                           capture_output=True, text=True)
        return {'line_endings': 'CRLF' if crlf else 'as stored', 'files_present': sorted(before),
                'exit_code': p.returncode, 'output': p.stdout.strip(), 'files_unchanged': before == hashes(root)}


if __name__ == '__main__':
    trials = [trial(False), trial(True)]
    verdict = 'PASS' if all(t['exit_code'] == 0 and t['files_unchanged'] and len(t['files_present']) == len(FILES) for t in trials) else 'FAIL'
    for t in trials: print(t['line_endings'], '->', t['output'], '| unchanged:', t['files_unchanged'])
    print(verdict, 'portable read-only replay')
    if '--record' in sys.argv:
        log = HERE / 'EXECUTION.json'; E = json.loads(log.read_text(encoding='utf-8'))
        E.setdefault('portable_tests', []).append({'utc': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
                                                    'command': 'python -I -X utf8 portable_test.py --record', 'result': verdict, 'trials': trials})
        log.write_text(json.dumps(E, indent=2) + '\n', encoding='utf-8', newline='\n')
    sys.exit(0 if verdict == 'PASS' else 1)
