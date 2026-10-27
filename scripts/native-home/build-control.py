"""Build CleanFrameHomeControl.dll for the TV (linux-arm, .NET 6)."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.local/native-home/out'
OUT.mkdir(parents=True, exist_ok=True)
proj = ROOT / 'scripts/native-home/Control.csproj'
env = {
    **dict(__import__('os').environ),
    'DOTNET_CLI_TELEMETRY_OPTOUT': '1',
    'DOTNET_SKIP_FIRST_TIME_EXPERIENCE': '1',
    'DOTNET_CLI_HOME': str(ROOT / '.local/native-home/cli'),
}
cmd = [
    'dotnet', 'publish', str(proj),
    '-c', 'Release',
    '-r', 'linux-arm',
    '--self-contained', 'false',
    '-p:UseAppHost=false',
    '-o', str(OUT),
]
print('Running:', ' '.join(cmd), flush=True)
result = subprocess.run(cmd, env=env)
if result.returncode:
    raise SystemExit('Build failed. Install .NET 6 SDK from https://dotnet.microsoft.com/download')
for name in ('CleanFrameHomeControl.dll', 'CleanFrameHomeControl.deps.json', 'CleanFrameHomeControl.runtimeconfig.json'):
    if not (OUT / name).is_file():
        raise SystemExit('Expected output missing: ' + name)
print('Built helper in', OUT, flush=True)
