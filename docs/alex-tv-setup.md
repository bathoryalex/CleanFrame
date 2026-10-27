# CleanFrame on UE75U8072 (Tizen 9)

Personal fork defaults for Alex’s Samsung TV. Upstream reference: [CleanFrame](https://github.com/nthnclrk/CleanFrame).

## Home shortcuts (default order)

| Tile | What it opens |
| --- | --- |
| Xbox | HDMI 1 (`hdmi-1` in `app/main.js`) |
| Nintendo Switch | HDMI 2 (`hdmi-2`) |
| Nuvio Legacy | [Nuvio native legacy](https://github.com/iqui27/nuvio-native-legacy) |
| YouTube | Samsung YouTube app |
| Spotify | Spotify |
| HBO Max | HBO Max / Max (region-dependent) |
| SmartThings | SmartThings |
| Internet | Samsung browser |

If Xbox or Switch are on different HDMI numbers, change the `hdmi-N` ids and `appId` values in `PRIMARY_APPS` inside `app/main.js` to match **Settings → Connection → External device manager** on the TV.

HDMI tiles switch the port with `tizen.tvwindow`, then open Samsung’s **`org.tizen.tv-viewer`** (same as the build that worked on this TV). If the viewer cannot open, the input is shown inside CleanFrame and **Back** returns to your home row. From the TV viewer, use **Samsung Home** in settings to escape until Home is routed to CleanFrame.

**Settings → Layout → Icon style** switches between **Color** (bundled logos in `app/assets/icons/color/`) and **Minimal** (white SVG marks, with custom PNGs for Nuvio, HBO Max, Internet and SmartThings in `app/assets/icons/minimal/`).

Fork branding for the browser tab and preview label lives in `app/fork.js` (`displayName: 'Frame Home'`). The local preview also mocks your home app list when Tizen APIs are unavailable.

## Nuvio Legacy app ID

From [nuvio-native-legacy](https://github.com/iqui27/nuvio-native-legacy):

| Install type | Tizen application ID |
| --- | --- |
| Native `.tpk` (recommended on Tizen 8–9, including this TV) | `NuvioTV002.Nuvio` |
| WebAssembly `.wgt` (Tizen 5.5+) | `NuvioTV002.NuvioNative` |

This build launches **`NuvioTV002.Nuvio`**. If you installed the `.wgt` instead, change the `nuvio` entry in `PRIMARY_APPS` to use `NuvioTV002.NuvioNative`.

Nuvio ships **unsigned**; you sign it with your own Samsung distributor certificate (DUID of this TV). See the Nuvio repo install section and [agent-tv-setup-guide.md](agent-tv-setup-guide.md) for CleanFrame.

## CleanFrame identity

| Field | Value |
| --- | --- |
| Package | `AlexFrmH01` |
| Application | `AlexFrmH01.FrameHome` |

Generate your own author/distributor certificates; do not reuse the upstream maintainer’s keys.

## Install order (recommended)

1. Enable TV Developer Mode (Apps → 12345), connect from your PC.
2. Install and sign **Nuvio Legacy** (native TPK for 2024+).
3. Build, sign, and install **CleanFrame** from this folder.
4. On first launch, open **All apps** once so installed-app discovery can refresh HBO Max / SmartThings IDs if a shortcut fails.
5. Optional: route the remote **Home** button to CleanFrame — see [alex-native-home.md](alex-native-home.md) and [agent-tv-setup-guide.md](agent-tv-setup-guide.md) stages 7–8. Requires SDB, a saved rollback snapshot, and explicit approval. Not required if you open CleanFrame from the app list.

## When a shortcut fails

Use Tizen Studio **Installed Web App List** on the connected TV and copy the **App ID - WAS** value into the matching `appId` in `PRIMARY_APPS`, or remove the tile and re-add it from **Arrange** after discovery.
