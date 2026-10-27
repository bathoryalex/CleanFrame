# Remote Home → CleanFrame (Alex UE75U8072)

**You authorised this step.** It changes undocumented Samsung settings so the physical **Home** button opens **`AlexFrmH01.FrameHome`**. **Settings → Samsung → Samsung Home** in the app still opens Samsung’s launcher so you can escape.

Read [agent-tv-setup-guide.md](agent-tv-setup-guide.md) stages 6–8 for risks. **Restore before uninstalling CleanFrame** or changing its app id.

## Prerequisites

| Item | Status |
| --- | --- |
| CleanFrame installed (`AlexFrmH01.FrameHome`) | You confirmed |
| TV Developer Mode (Apps → 12345), PC on same Wi‑Fi | Required |
| **Tizen Studio** (or at least **SDB** + **.NET 6 SDK** on PC) | Required for this step — App2Samsung on a phone is not enough |
| `.local/device.json` with TV IP | Create from example below |

App2Samsung installs the `.wgt`; **native Home** needs **SDB** from a PC.

## 1. PC setup (one time)

1. Install [.NET 6 SDK](https://dotnet.microsoft.com/download/dotnet/6.0) (or newer SDK that can target `net6.0`).
2. Install [Tizen Studio](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html) with **TV Extension** and note where `sdb.exe` lives (often `%LOCALAPPDATA%\Samsung\tizen-studio\tools\sdb.exe`).
3. Copy `.local/device.json.example` to `.local/device.json` and set your TV’s IP (from **Settings → General → Network**).
4. On the TV: **Developer Mode** on, enter your **PC’s** IP, restart TV if SDB won’t connect (port **26101**).

Optional: set `SDB_PATH` to `sdb.exe` if it is not in a standard location.

## 2. Build the helper (after any `Control.cs` change)

```powershell
cd C:\Users\Alex\Projects\CleanFrame
python scripts\native-home\build-control.py
```

Output: `.local/native-home/out/CleanFrameHomeControl.dll` (not committed; stays private).

## 3. Inspect (read-only)

```powershell
python scripts\native-home\run-device.py inspect
```

Check output for **arm**, **.NET** on the TV, and current `home_appid` values. Save `.local/native-home/inspect-output.txt`.

## 4. Query (save rollback baseline)

```powershell
python scripts\native-home\run-device.py query
```

On the **first** successful query, the runner creates **`.local/native-home/original.json`**. **Back up that file** (USB/cloud). Never replace it with values after apply.

Review the printed `CLEANFRAME_HOME_JSON` — note `Home`, `Strings`, `Autostart`, `BootSupported` (must be `1` for apply).

## 5. Apply (only after you review the snapshot)

```powershell
python scripts\native-home\run-device.py apply
```

The helper sets the native Home operation to **`AlexFrmH01.FrameHome`**, `db/appfw/home_appid`, and enables Home autostart. On failure it attempts to restore from `original.json`.

### Physical checks

| Test | Pass? |
| --- | --- |
| **Home** from YouTube (or another app) → CleanFrame | |
| **Home** from HDMI (Xbox tile) → CleanFrame | |
| **Settings → Samsung → Samsung Home** → Samsung launcher | |
| Cold start / power cycle (optional, record what you see) | |

## 6. Rollback

```powershell
python scripts\native-home\run-device.py restore
```

Confirm Samsung Home returns on the remote **Home** button.

## Troubleshooting

- **SDB not found** — set `SDB_PATH` or copy `sdb.exe` to `.local/tizen-sdk/tools/`.
- **Connection refused** — Developer Mode, firewall, TV IP, full power cycle.
- **Not eligible for boot** — CleanFrame not installed under `AlexFrmH01`, or TV reports `BootSupported: 0`.
- **Probe incomplete** — read `.local/native-home/query-output.txt` and `query-transport.json`.

Target app id in `scripts/native-home/Control.cs`: **`AlexFrmH01.FrameHome`**.
