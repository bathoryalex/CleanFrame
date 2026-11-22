"""Zip tools/alexa-check into an unsigned widget in dist/."""
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'tools/alexa-check'
target = ROOT / 'dist/AlexaCheck-0.2.0-unsigned.wgt'
target.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as package:
    for name in ['config.xml', 'index.html', 'check.js', 'icon.png']:
        package.write(SOURCE / name, name)
    package.write(ROOT / 'app/assets/qrcode.js', 'qrcode.js')
print(target)
