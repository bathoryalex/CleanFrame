# Interaction behaviour — 0.6.1

## Home

- Dock and Tiles: Left/Right scrolls the apps without wrapping. Up enters the top-right controls (Alexa switches first, then Wi‑Fi, All apps and Settings); Left/Right moves between them, and Left from the first one focuses the song when Spotify shows one. Down or Back returns to the selected app. The clock is at the top left, or centred.
- OK opens the selected item. Focus alone never launches an app.
- Icons-only apps and controls reveal their names when focused. App presentation and control presentation are independent.
- Back from the app list or Dock opens a choice to stay or open Samsung Home.
- A panel keeps focus within its own controls. Back closes one panel at a time.
- Returning to the running launcher (the remote's Home button, or coming back from another app) always shows the Home screen: open panels close the way Back would close them (the remote test stays open) and focus goes to the apps, with the last app still selected. There is no auto-return timer. Held OK and Back keys act once until the key is released.

## Settings and appearance

Settings opens a grouped overview of large cards in a grid of four columns (each arrow moves to the neighbouring card; the Background card shows the current wallpaper and Typography previews the chosen font): Background, Layout, Typography, Focus, Apps on Home, Language and clock, Wifi QR code settings and Connections (Alexa and Spotify), followed by a Samsung Home card that opens Samsung's Home screen directly. With the Alexa card the nine cards form a 3 x 3 grid with shorter rows. OK opens a group. Appearance groups use a two-pane screen with visible choices on the left and the committed Home preview on the right.

| Group | Choices |
| --- | --- |
| Background | Photo or Dark (Light was removed in 0.30; a saved Light opens as Photo); Wallpaper and Rotation when Photo is active; Picture from phone |
| Layout | Two titled groups. Bottom bar: Dock, Tiles or Modern dock, app display (Text, Icons, Both), colour or minimal icons. Top bar: Separate widgets or Dock, and Text, Icons or Both for Wi‑Fi/All apps/Settings and for Alexa switches |
| Typography | Manrope, Neue Montreal, Mori, Pangram Sans, Geist and Newsreader, when available |
| Focus | Type or Glass; Soft, Frost or Clear tint material |
| Apps on Home | Membership and arrangement editor |
| Language and clock | English or Magyar; 24-hour or 12-hour clock; clock in the Corner, Centre or Large centre; weather Off, Basic (temperature) or Full (with today's high and low) |
| Wifi QR code settings | Network name, password and security for the home-screen QR code |

Up/Down moves between rows (see Settings pages, 0.30). Focus alone changes neither the preview nor saved preferences in these appearance groups. Wallpaper has its own temporary photo preview, described below. OK applies the focused value. A checkmark identifies the applied value; the filled plate identifies remote focus. Applying the current value does not write again.

Material applies with a photo background (the Dock's shelf, and the focused tile in Tiles). Inactive material choices remain visible with an explanation and are skipped during navigation. Their stored value is retained. Wallpaper and rotation are also inactive on flat backgrounds.

A font or photo change applies only after its resources are ready and storage succeeds. A load or storage failure keeps the previous appearance and checkmark, with a Try again action. Back cancels a pending change, leaves the group and keeps completed changes. Late load callbacks cannot apply a cancelled choice. There is no Save button. Returning to a group restores its last choice focus; returning to Settings restores its category focus. Rotation is nested within Background, and Back returns to its Rotation row.

The selected font applies to Home app names, the clock and Home controls, including Newsreader. Settings, All apps, the Home editor and status text retain Manrope. The preview shows the committed Home appearance and its clock continues to update. Pangram faces are available in Nathan's private build when the local files are present; their binaries are not included in the public source. An unavailable optional face is omitted. If the baseline font is slow or missing, Home remains usable with a local fallback and can recover when the font loads.

## Streaming apps

The nine default apps keep their known native IDs. Other installed consumer apps can also be added to Home. Launching uses the public `tizen.application.launch` API with the app's native ID. Missing apps and denied launches produce a real error. No web player, placeholder success page or account credential is embedded.

## All apps

The panel reads `tizen.application.getAppsInfo` on entry and shows the filtered consumer apps alphabetically. Samsung's visibility flag alone also exposes system utilities, so EP packages, background services, ad players, account utilities, placeholders and duplicates are omitted. Known brands use bundled marks. Other apps use their local installed icon, with initials as a fallback.

The five-column grid scrolls with remote focus. OK launches an app; its On Home badge shows membership. Up from the first row reaches Apps on Home, which opens the editor. An API failure shows a retry and keeps saved Home choices. Browser previews report that installed-app discovery and launching require the TV.

## Apps on Home

Open the editor from Settings or All apps. On Home shows the current order on the left. Not on Home shows Recently removed first, followed by other installed apps on the right. Home holds one to nine apps.

- Reorder: OK on an app name picks it up. Up/Down moves it. OK places it and saves the order. Back puts an unplaced app back without saving that move.
- Remove: Right from an app name reaches Remove from Home. OK saves the removal and moves focus to the same app in Recently removed. The app stays installed.
- Add: OK on an app in Not on Home adds it and saves. A recently removed app returns to its previous position within the editing session; another app is added at the end. Focus follows the app to its Remove from Home control, so another OK can reverse the addition.
- Undo reverses a completed addition, removal or reorder from the current editing session. Done or Back closes the editor and keeps completed changes. Undo history ends when the editor closes.

Removing the last Home app or adding a tenth app is prevented. A failed storage write keeps the committed choices and order, with a retry message. Saved native app IDs and names survive a restart or a failed catalogue refresh.

## Art Mode and Samsung screens

Art Mode sends an application control to the installed `org.tizen.art-app`, with `mode=fullscreen` and `requester=mobile`. This aims to enter native Art Mode with its current artwork, without toggling power or changing the selected artwork.

This mode comes from [research on Samsung's Art app](https://github.com/TheFab21/ha-samsungtv-smart/blob/master/notes/QN55LS03FAFXZA/ART_MODE_DECOMPILED.md), on another Tizen 9 Frame model. It is an internal Samsung contract, not a documented public Art API. Its visible behaviour on this exact firmware must be confirmed on the TV.

Samsung Home explicitly launches the original `com.samsung.tv.csfs` app, independently of the new Home assignment. The earlier `com.samsung.tv.coba.newhome` component did not open Smart Hub visibly and is no longer the escape target. Exact on-device destinations are recorded in docs/tv-status.md; launch callbacks alone are not visual proof. There is no blind power-key fallback.

All calls have bounded response handling. A failure leaves CleanFrame usable. No simulated device success views remain. Browser validation cannot confirm the visible Samsung destination.

## Preferences and wallpaper

The launcher stores appearance, Home order, recently removed apps, the last launched Home app, wallpaper and rotation locally. Dock and Tiles share these preferences. The existing `cleanframe.home.v1` key is retained, with a fallback read from `cleanframe.shore.v1`. Every older layout (List, Glass Dock, Glass Grid) now opens as Photo + Dock + Glass; a saved List appearance keeps its other choices and opens as the Dock. App order, wallpaper, rotation and the last Home app are preserved.

The gallery contains 15 bundled wallpapers. Settings → Background → Wallpaper keeps the two-pane Settings frame. Up/Down browses a vertical thumbnail list without wrapping; the right-hand Home preview shows the candidate while the surrounding Settings backdrop stays on the applied photo. OK applies the focused photo and stays in Wallpaper. The tick marks the applied photo and preview status distinguishes unsaved browsing. Back restores the latest applied photo, cancels pending loading and returns to Background’s Wallpaper row. Photo and material assets change as one complete bundle; a failed load restores the applied preview and offers retry. Preview loading waits briefly for remote focus to settle. OK during loading queues application for that photo; another browse move or Back cancels it. Browsing never saves, and repeated OK on the applied photo does not write again.

Settings → Background → Rotation offers Fixed, Each time Home opens, Every 5 minutes, Every 15 minutes and Every hour. Each time Home opens advances once when the launcher loads; a return to the already-running launcher does not advance it. Timed rotation counts only visible Photo Home time in Dock or Tiles. Panels, flat backgrounds and time spent in other apps pause the cycle. Changing the photo or rotation mode starts a new interval.

Launcher wallpaper is separate from native Art Mode. Runtime photos, materials and available fonts are local assets; they do not require the Mac or a network download.

## Sources

- [Samsung Application API](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/application-api.html): installed-app discovery and application control.
- [Samsung application termination guide](https://developer.samsung.com/smarttv/develop/guides/fundamentals/terminating-applications.html): exiting is not treated as a deterministic Samsung Home route.

The native Home operation and startup configuration from 19 October remain separate from this app update. Home from Netflix was confirmed for that configuration; power-on after Netflix remains provisional. Streaming apps retain their own Back navigation. Netflix did not exit on repeated Back in the observed test, so there was no app-exit destination to verify. No global Back interception or key-filter hook was installed. See [TV status](tv-status.md) for device evidence; this behaviour specification is not an installation or visual-verification record for 0.6.0.

## Clock and rendering

## Your picture

Background → Picture from phone shows a QR code for a private ntfy.sh channel (`framehome-` plus 20 random characters, created on the TV and kept in its preferences). The code opens the send page (`docs/send/`, `sendPage` in `app/fork.js`) with the channel in the URL fragment; it resizes photos to at most 1.9 MB, sends videos up to 16 MB unchanged (split into `frame-home-part` messages tagged `u-<id>`, `i-<index>`, `n-<count>` when over 1.9 MB), re-encodes larger ones (up to 60 seconds) at 1080p or 720p with WebCodecs and mp4-muxer, and sends a tagged still before a video. The TV queues a parted video once every part has arrived, downloads the parts in order and joins them. Without `sendPage` it opens the ntfy.sh web page, where the full publish dialog's Attach local file is used. Replayed messages are handled once per session. At power-on, storage can be slow or briefly unavailable: Home starts after four seconds on the first wallpaper's files while the slot waits, load errors are retried, and the saved choice is never changed in the meantime. Only a picture that storage reports as missing switches the background (saved), and the Your picture screen asks for it again. Persistent storage is requested so the browser does not clear it when space runs low. Once the channel exists the TV keeps one streaming request open to it while the app is visible (ntfy.sh allows about one request per five seconds per visitor, so frequent polling is refused), replays messages since the last handled one on reconnect, and falls back to polling every 15 seconds if the stream never opens. A photo sent after the QR screen is closed is therefore still applied. Connection errors show their cause, for example HTTP 429. When an image attachment arrives the TV downloads it, crops it to 16:9 from the centre, and once prepares the same files a bundled wallpaper has: photo, thumbnail, panel backdrop and the four glass materials (the recipe from `scripts/build-materials.mjs`, blurred layers at half resolution). The files are stored in IndexedDB and appear as "Your picture" at the end of the wallpaper list; a new photo replaces the previous one. A video attachment (MP4/H.264, WebM, MOV) is stored as well. Samsung TVs play video on a hardware plane, so a frame copied to canvas is black there; the still for the photo, thumbnail and materials therefore comes from the MP4's embedded cover art when present (scripts/animate-glow.py writes it), then from a canvas grab, and otherwise a neutral dark field is used and the screen says so. The video itself and a muted looping `<video>` layer plays over that photo while Home or a Settings preview shows Your picture; it pauses under sheets and while the app is hidden, and is released when another wallpaper is chosen. Files that are neither pictures nor videos, and files the TV cannot decode (for example HEIC), are reported and leave the background unchanged. The relay host is `relay` in `app/fork.js`.

Home shows the TV's local time in 24-hour format by default, or 12-hour with AM/PM (Hungarian: de./du. before the time). It updates at the minute boundary and on return to the launcher. Date can be switched on: "15 November" in English, "November 15" in Hungarian. In the corner it is a quiet second line under the clock; with a centred clock it shares the smaller line under the clock with the weather.

Centre and Large place a display-size clock with the weather beneath it in the open space above the Dock, over a soft static shade on photos. Proportional digits are used at display size, so the centred clock can shift by a few pixels when a minute changes.

Beside the clock, the weather for the place in `app/fork.js` comes from Open-Meteo (no key) and is cached for an hour: a line icon, the current temperature and, by default, today's high and low. If the request fails, the clock is shown alone.

Language applies at once to every screen. A missing translation falls back to the English text. App names stay as installed.

Photographic materials and blurred panel backgrounds are generated before packaging and stay aligned with the full-screen image. Photo colour and contrast metadata are also prepared offline. Navigation does not sample image pixels, run an optics engine or apply live backdrop blur. Flat backgrounds use matching light or dark panel colours. Focus feedback uses transforms and opacity; reduced motion removes animated scaling and movement while retaining opacity feedback.

## Alexa

Settings → Connections lists Alexa, Spotify and Remote buttons; Alexa and Spotify open their own group, whose Back returns to Connections. Alexa shows **Connect Alexa** until the TV is signed in: OK opens a QR screen (Back or Close cancels; after a failure OK tries again). Once connected the group has **Readings** and **Switches** (On Home), **Groups**, and **Device details** and **Sign out of Alexa** (Account). Each opens a list screen: Up/Down move, OK ticks or opens, Back returns. Readings allow three ticks and Switches four; a further OK says to remove one first. Groups: the first row creates a group with the on-screen keyboard (Up/Down move by a row of 26 keys), then opens its light list; an existing group offers its lights, Rename and Delete (asks first). Remote buttons live only in Connections (they used to be repeated under Alexa and Spotify; it was the same screen): each button opens a list with Nothing, then Spotify actions, the groups and lights, and the apps (see Remote buttons below).

On Home, the readings follow the weather in the caption. The switches come first among the Home controls; OK switches, the tile glows warm while on, and a failed switch reverts. Settings → Layout → Alexa switches chooses Text, Icons or Both; with icons only the focus label names the focused one. An assigned remote button switches its light or group from any screen except the keyboard; an unassigned colour button says where to assign it. Every switch shows a short message above the Dock for about three seconds. Values are read every 5 seconds while there are switches or assigned buttons (otherwise every two minutes) and once on return to the app; nothing is read while the app is hidden. Sign out asks first and clears readings, switches and Alexa button assignments; groups are kept.

## Spotify

Settings → Connections → Spotify shows **Connect Spotify** until the TV is signed in; OK opens the same QR screen as Alexa. Once connected the group has **Now playing on Home** (On/Off, with a note on Play/Pause and skipping) and **Sign out of Spotify** (asks first; also clears buttons set to Spotify). On Home the song shows under the clock (and the date) with its cover, or on its own card at the top left when the clock is centred; paused songs are dimmed with a pause mark. Media keys work from every screen except the keyboard: Play/Pause toggles (Play and Pause keys do what they say), Fast-forward/Next skips forward, Rewind/Previous skips back. Each press shows a short message; while one request is on its way a further press is ignored. Without Premium, with nothing playing, or with an expired sign-in the message says so and the shown state reverts.

## Home layout and Now playing

The Dock sits 48 px above the bottom edge and the clock and Home controls 52 px below the top; the Arrange action and the icons-only app name go above the Dock. The Dock's glass is cropped from the full-frame material at its position, so it follows the move.

When Spotify shows a song, the song is a focusable Home element: Left from the first Home control focuses it, Right returns to the controls, Down/Back go to the apps, OK or a click opens **Now playing**, which fades in over Home like the Wi‑Fi QR code (pre-blurred panel image and shade fade in, the content rises) and fades out on Back. Now playing shows the large cover, device, title, artists, album, a progress bar and four buttons (previous, play/pause, next, Lyrics; play/pause focused first); Left/Right move, OK presses, Back returns. Lyrics toggles a lyrics panel: the cover and controls shrink to the left column, the lines fill the right; synced lines keep the current one bright in the middle, plain lyrics scroll with the progress, and missing lyrics say so. The song's focus is the shared top-row ring (see Top row and Tiles focus). Progress moves every second without a full render; when a song ends, Spotify is asked for the next one.

Assigned remote buttons are shown as a legend above the Dock or Tiles (see Remote buttons). The remote's on-screen colour picker (the 123/colour button) does not reach the app (checked with Remote buttons → Test the remote).

In the icons-only Dock the tiles are 176 px tall with the icons centred; the focused icon moves up and its name rises in under it, inside the tile, sized to fit (24 px down to 18 px, then an ellipsis). Lyrics toggle with a fade (200 ms out, switch, back in) while the lyrics slide in from the right and the cover column settles; lines fade by their distance from the current one (no CSS mask, which on the TV lets the video plane show through).

The song's title and artists scroll slowly back and forth when they do not fit. With the clock centred, the song shares the top row with the Home controls and stops 40 px before the first one; under the clock it may be 760 px wide. Settings → Layout has separate styles for **Wi‑Fi, All apps and Settings** and for **Alexa switches** (Text, Icons, Both); icons-only switches name the focused one in the focus label. Opening the lyrics places the current line at once; only later line changes glide.

## Remote buttons

Settings → Connections → **Remote buttons** lists the red, green, yellow and blue buttons, CH +, CH − and Guide. Each can switch a light or group, run a Spotify action (play or pause, next, previous) or open any app on the TV (the list has Spotify, Alexa and Apps sections; headings are skipped by Up/Down). CH +, CH − and Guide are registered only while something is assigned, so otherwise they keep the TV's own job. The remote's 123/colour button itself does not reach the app. Assigned buttons show as chips centred above the Dock (coloured dot or a CH+/CH−/GUIDE badge and the name; lights on have a warm edge): Show the buttons on Home: **When Home opens and a button is pressed** (six seconds when Home opens or returns, five seconds after an assigned button; default), **Only when a button is pressed** (five seconds after an assigned button), **Always** or **Off**; OK cycles through them.

Alexa switches on Home are toggle tiles: a rounded glass rectangle with the lamp and a small switch, warm when on; the focused one gets a white ring and a slight lift. A group shows as on only when every one of its lights is on; OK on a group that is not fully on turns every light on. Their state is read every 5 seconds while Home is visible, so lights switched elsewhere (for example by voice) catch up. The glass focus behind the Home controls and the song is a rounded rectangle too. The message after a button sits above the legend row, above the Dock. The song widget is always 570 px wide (less only when the Home controls would be closer). In Now playing, Up from the controls focuses the progress bar: Left/Right move 10 seconds and the song jumps there 0.7 seconds after the last press (OK jumps at once). With lyrics open the device line stays, long titles scroll, and lyric lines keep a margin so the enlarged current line is never clipped.

## Clock styles, seconds and Tiles

Settings → Typography → **Clock style**: Classic (the chosen font), Thin (single-stroke SVG numerals), LED (seven-segment SVG digits with faint unlit segments) or Flip (dark split cards; a changing digit's top half folds down in 0.22 s and the lower half follows in 0.24 s, so a second never runs into the next). Settings → Language and clock → **Seconds** adds seconds to every style. The clock ticks just after each whole second (the timer is re-aimed every tick, so it does not drift). Only the time is repainted, never the rest of the caption, and Flip updates only the cards whose digit changed. LED colons glow like lit segments.

Settings → Layout → Layout offers **Dock** and **Tiles**. (The List layout was removed in 0.25; a saved List opens as the Dock.) Tiles is the Dock row without the shelf: every app is its own rounded glass tile with a 12 px gap (one row fits up to 1760 px), using the same focus, paging and names as the Dock. While focus is in the Home controls or on the song, no app tile looks selected; Down still returns to the app last used. Titles keep room for descenders (g, y, p).

## Date details

Language and clock ends with a one-line **Date details** entry (its summary lists what is on) that opens Hungarian holidays (Off/On), Name days (Off/On) and Calendar. With a calendar connected, the page shows Calendar on Home (On/Off) and Disconnect calendar with the time it was last read. On Home the date line reads "22 November · holiday" (holiday in warm yellow), followed by the weather in the centred clock. Below it, each on its own small glass card: today's name days (smaller type, no label), then the calendar card, which starts with a calendar icon and shows up to two of today's remaining events with their start time (all-day events without one), or "Tomorrow" and tomorrow's first events. A new year's holidays are fetched when the year changes (a failed fetch is retried hourly); the calendar is read every 15 minutes while Home is visible and not while the screen is hidden.

## Top row and Tiles focus

Every item in the top row is a card on dark glass: each Alexa switch, one shared card for Wi‑Fi, All apps and Settings, and the song widget (which always has its card, focused or not). Focus looks the same on all of them: lighter glass and a 3 px bright ring, with no moving lens. With the clock in the centre the song card sits at the top left, its top edge level with the other cards (56 px from the top) and its left edge 112 px in, mirroring the controls on the right.

In Tiles, the Focus card (Settings → Style since 0.32) applies: **Glass** turns the focused tile into lighter glass with a soft bright edge, shaped by the Material choice (Soft: even light glass; Frost: brighter at the top; Clear tint: clearer glass with a stronger edge); **Type** keeps the tile dark, rings it and dims the other tiles' icons and names.

## Spotify devices

In Now playing, Up from the progress bar (or from the buttons when there is no progress) focuses the **Playing on …** line, shown with a speaker icon and a chevron (**Choose a device** when nothing is playing). OK opens a **Play on** list over the right side, its top edge fixed 150 px from the top so it does not move when the devices arrive (it shows "Looking for your Spotify devices…" in the same frame first; when the devices arrive the card behind the list grows open over 0.32 s with a transform only, and the rows fade and rise in one after another, 25 ms apart; renders in the meantime wait until the rows are in, so nothing restarts): the devices Spotify reports now, with an icon by type, the current one in green with a tick and focused first, restricted ones dimmed with "Can't be controlled here". Up/Down move (at most seven rows show at once; the window follows the focus, with arrows above and below and an "11 / 14" style counter when there are more), OK on another device moves playback there with the current play or pause state (with nothing playing it asks Spotify to resume there), OK on the current device or Back closes the list. A short message confirms the move or says why it failed (for example Premium required); Now playing reads the player again 1.5 seconds later. With no devices on, the list says to open Spotify on the wanted device; after an error OK tries again.

## Top bar: Separate widgets or Dock

Settings → Layout → Top bar → **Style**. **Separate widgets** is the card row described above. **Dock** draws one glass bar across the full width of the screen at the top edge (152 px tall). Inside it the song card sits on the left (always there, even with the corner clock) and the Alexa switches and Wi‑Fi, All apps and Settings sit on the right as separate tiles, each as tall as the song card (120 px): icon above name, names only or icons only (120 x 120), as set for each group; a switch shows its small toggle under the name and glows warm while on. Focus is the same ring on lighter glass. The corner clock and its lines move below the bar, and the centred clock starts lower. Navigation is unchanged: Up from the apps enters the controls, Left from the first one reaches the song.

## Tiles shadow

In Tiles each tile keeps only a short contact shadow, and the bottom darkening that the Dock's shelf needs is lighter, so no shadow band forms under the row.

## Top Dock bar, refined (0.27)

The Dock bar is 116 px tall. The song card and every tile are 88 px tall, 14 px from the top, and the song starts 14 px from the left edge while the last tile ends 14 px from the right edge. The Alexa switches form their own group, set off from Wi‑Fi QR, All apps and Settings by a gap and a thin divider. Tile names are at most 150 px wide and end with an ellipsis; group names are limited to 12 characters when typed. With Icons chosen for Wi‑Fi QR/All apps/Settings or for the Alexa switches, neither the tile nor a focus label shows a name while moving (a save error is still spelled out). Wi‑Fi is labelled **Wi‑Fi QR**, with a Wi‑Fi icon carrying a small QR mark (also on the Settings card).

## Switch icons

Settings → Connections → Alexa → **Switch icons** lists the current switches with their icon; OK on one opens Light bulb, Fan, Air conditioning, Heating, Plug, TV, Speaker and Switch. The choice is stored per light or group id (`alexaIcons`), so it stays when a switch is removed and added again. A light bulb keeps its lit and unlit drawings; other icons turn warm while on.

## Home button signals

Frame Home returns to the Home screen on a `visibilitychange` to visible (coming back from another app), and also listens for `appcontrol` on `window` and `document` and a `tizenhwkey` named home. On the UE75U8072 (Tizen 9) none of these arrives when the remote's Home button is pressed while Frame Home is already open: the remote test lists nothing. Holding Back was tried as a substitute and did not work on the TV, so it was removed; any remote button can be set to **Frame Home → Home screen** in Remote buttons.

In the Dock bar every Alexa switch tile is 132 px wide (88 px with icons only), names cut with an ellipsis; the divider before Wi‑Fi QR has 18 px on each side.

## 0.27.2

Switches: up to six devices or groups with the top Dock bar (the separate widget row shows the first four); the Switches text says devices, not lights. The Dock bar is lighter glass that fades out over its lower 60 px instead of ending in a line. Switches that are on use a soft warm tint (thin warm edge, muted toggle) instead of bright yellow, in both top bar styles.

## 0.28

**Switches** list: the switches on Home come first, numbered in their Home order, then a "More devices and groups" heading and the rest. OK adds or removes one and keeps the focus on it. Right on a chosen one lifts it (warm outline, up/down mark); Up/Down move it and save the new order at once; OK, Back, Left or Right put it down.

**Top Dock bar** fade: the glass holds to just below the tiles and then thins out along an eased curve over about 110 px (no hard step that reads as a light stripe); the photo's own top shade is off under the bar so two gradients do not overlap.

**Modern dock** (Settings → Layout → Bottom bar → Layout): a full-width glass bar along the bottom edge (380 px, fading upwards with the same eased curve), the photo's bottom scrim off, and app tiles drawn like the top widgets: flat light glass with 16 px corners and a white 3 px ring with lighter glass on focus (in both Focus styles). Geometry, paging and names are those of Tiles.

## 0.28.1

Modern dock: the app row is drawn at 80 % (scaled about its bottom centre) and lowered so the tiles end 14 px above the bottom edge, matching the 14 px above the top bar's widgets; with the smaller tiles up to nine icon tiles fit without paging. The glass behind it is as tall as the tiles plus 14 px, then fades out over 120 px along the same eased curve as the top bar (the script sets its height and gradient). Page cues, the Arrange action and the button legend follow the scaled row. Both bars are a little darker (62 % at the solid part).

## 0.29

The Modern dock is the top bar mirrored: low 96 px tiles 14 px above the bottom edge on a glass band as tall as the tiles plus 14 px, fading upwards over the same height. Icons only: see 0.29.1. Both: flat tiles of one width with the icon on the left and the name beside it (ends with an ellipsis if too long). Text: 232 px tiles with the name centred. When the apps do not fit, as many whole tiles as fit (up to six in Both) are shown and the row pages. Marks are drawn at the smaller size (no scaling), so minimal and colour icons stay crisp.

## 0.29.1

Modern dock, Icons only: back to the 0.28.1 look and behaviour, the Tiles row drawn at 80 % with the focused app's name rising in under its icon. Both: seven 236 px tiles across (short names: Nintendo Switch → Nintendo, Nuvio Legacy → Nuvio), icon and name centred vertically in each tile; the page cues stay on screen.

## Settings pages (0.30)

Every settings page is a column of cards. A card has an optional uppercase heading and rows: Layout has a Bottom bar: apps card and a Top bar: widgets and controls card; Language and clock has the language, a Clock card and a Date and weather card; Background, Focus, Typography and Wi‑Fi QR group their rows the same way; Alexa, Spotify, Connections and Date details keep their own sections as cards.

- **Setting rows** show the name on the left and the current value on the right with a down chevron. OK opens a short list under the row (the applied choice focused and ticked); Up/Down move in it, OK applies and closes it, Back or Left closes it without applying. Left and Right do nothing on a row, so focus alone never changes anything. Inactive choices are shown dimmed in the list and skipped; a setting whose choices are all inactive is skipped by the remote and its note says why.
- **Link rows** (wallpaper, rotation, Picture from phone, Alexa and Spotify screens, Wi‑Fi fields, Date details) show a value or summary and a right chevron; OK opens them. A one-item section reads as "Title · value", for example Wallpaper · Misty coast with its thumbnail, or Rotation · Fixed.
- Long pages scroll so the focused row, or the open list, stays in view, keeping its whole card visible when it fits.
- The live Home preview stays on the right for Background, Layout, Typography, Focus, Language and clock, and Date details, where a change shows on Home. Wi‑Fi QR, Connections, Alexa, Spotify and Rotation hide it and use the full width.

The Light background is removed with its styles; Photo and Dark remain.

## 0.31

- **Settings overview** is grouped in framed sections on one screen: Personalization (Background, Layout, Typography, Focus) across the top; Home and clock (Apps on Home, Language and clock, Wi‑Fi QR) beside Connections and system (Connections, Samsung Home) below. Left/Right move along a row, across groups; Up/Down go to the nearest card above or below.
- **Lists** open over the rows below (opaque, above everything else on the page) instead of pushing them down. The live preview's top edge lines up with the first card.
- **List screens** (Readings, Switches, Remote buttons, Groups, Switch names and icons, device details) use the same card look: one framed list, uppercase section headings, 74 px rows.
- **Switch names**: Alexa → Switch names and icons → a switch → **Name on Home** opens the on-screen keyboard (up to 12 characters); the name is stored per light or group (`alexaNames`) and shown on Home, in lists and messages; **Use the Alexa name** removes it. The page also lists the icons under an Icon heading.
- **Moving a switch** (Right in Switches): the row turns warm (filled), lifts slightly and says "Up and Down move it · OK places it".
- **Top bar names** keep room for descenders, so g, p and y are no longer cut off.

## 0.32

- **Settings overview**: every card is the same size (296 x 262) and each group frame sizes to its cards. Personalization (Background, Layout, Style) and Home (Apps on Home, Wi‑Fi QR) share the top row; Connections and system (Date and time, Language, Connections, Samsung Home) is below.
- **Style** combines Typography and Focus on one page: Clock (clock style), Home text (font) and Focus (focus style, material) cards. Its card shows the font and the focus style.
- **Date and time** replaces Language and clock (time format, clock position, seconds, date, weather, Date details) and sits under Connections and system.
- **Language** is a tile of its own: it shows EN or HU, and OK switches between English and Magyar at once, without a page.

## 0.33

- **Settings overview**: three equal columns that fill the width, each a framed group of three equal wide cards (picture or icon left, name and value right): Personalization (Background, Layout, Style), Home and time (Apps on Home, Wi‑Fi QR, Date and time), System (Language, Connections, Samsung Home). Up/Down move within a column; Left/Right go to the same place in the next column.
- **Day panel** under the date and weather: one glass panel with a soft top-to-bottom gradient, as tall as its lines: the Hungarian holiday (warm, with a dot), the name days, a TOMORROW heading when the events are tomorrow's, then up to three events. It is not drawn when there is nothing to show. The holiday is no longer on the date line.
- **More calendars**: up to three (stored as `{ cals: [{ id, url, name }] }`; a 0.22 single address is read as the first). Date details → Calendars lists them; OK on one opens Name (on-screen keyboard, up to 16 characters) and Disconnect this calendar; **Add another calendar** pairs one more from a phone, and when it is the second or third the name keyboard opens after Done. With more than one calendar each event row starts with a coloured dot (blue, pink, green) and the calendar's name; unnamed ones read "Calendar 2" and so on.
- **Live preview** beside the settings: Background, Layout, Style, Date and time and Date details. The other pages (Wi‑Fi QR, Connections, Alexa, Spotify, Rotation) use the full width.


## 0.34

- **System card**: the third card of the System column (last on the overview) is now **System**, not Samsung Home. It opens a page with a **Backup** section (Create a backup, Restore from a backup, both only when a backup page is set in `fork.js`) and a **This TV** section (Samsung Home, the same escape as before — now one step deeper, Settings → System → Samsung Home). The overview stays three equal columns of three equal cards.
- **Backup and restore** (`app/assets/backup.js`, `window.FrameBackup`): one file holds everything the TV keeps — the look and layout preferences and Wi‑Fi QR (`cleanframe.home.v1`), and the Alexa, Spotify and calendar sign-ins (`cleanframe.alexa.v1`, `cleanframe.spotify.v1`, `cleanframe.calendar.v1`). Weather and holiday caches are left out. On restore only those four exact keys are written back, then the app reloads.
- **Pass-phrase and encryption**: you type a pass-phrase on the TV. The file is `{ v, kdf:{salt,iters}, nonce, d, m }`: the key is stretched from the pass-phrase with repeated SHA-256 over a random salt (20000 rounds), the body is the project keystream = SHA-256(key | nonce | counter) XORed over the bytes (the same cipher as the calendar), and a 16-byte MAC over (key | plaintext) detects a wrong pass-phrase or a damaged file. All of it runs on the TV with the bundled SHA-256; the pass-phrase and the readable settings never leave the TV.
- **Transfer**: the encrypted file moves through a private ntfy.sh channel (`framehome-bk-…`) in numbered parts of 1200 characters (`{id,i,n,code}`), since a channel message is short. Export: the TV publishes the parts (and re-publishes every 8 s so a late phone still catches them); the [backup page](docs/backup/index.html) collects them, rebuilds the file and offers it to **save or share** (Google Drive, Files, email — the phone's own share sheet). Restore: the page reads a chosen file and sends it back in the same parts; the TV joins them, asks for the pass-phrase, decrypts, writes the keys and reloads. The relay and the saved file only ever hold ciphertext.
- **Screens**: Create a backup and Restore both use the QR + steps + status panel (the same frame as the sign-ins). The pass-phrase uses the on-screen keyboard (shown as dots). A wrong pass-phrase, a file from a newer version, or a file that is not a backup each say so and OK tries again.

## 0.35

- **Spotify volume** on the big Now playing screen: a focusable row under the transport controls. Down from the controls reaches it; Left/Right step it 5 %, OK mutes and restores the previous level. The change shows at once and the `PUT /me/player/volume` is sent after a short pause, so holding a key does not flood the API. It controls the Spotify playback volume on the device the music plays on, not the TV's own volume. Premium is required, like every playback control. The row is hidden when the active device reports `supports_volume: false` (and when nothing is playing); the mini Home widget has no volume control.

## 0.35.1

The volume row now looks like the progress bar above it: the same 6 px bar with the same left and right ends, the same focus (the bar grows to 12 px with a white fill and a light ring, and the hint appears underneath), a speaker-with-waves icon (a crossed speaker when muted) and the level on the right where the song length is.

## 0.35.2

- **Volume beside Lyrics**: the volume is a short bar (340 px) in the same row as the buttons, after Lyrics. Right from Lyrics focuses it; Left/Right step 5 %, OK mutes and restores, Back returns to Lyrics (it no longer closes Now playing from there), Up goes to the progress bar. With lyrics open the column is 400 px wide, so the volume sits under the buttons at the cover's width.
- **Cover height**: without lyrics the text column is exactly as tall as the 560 px cover: "Playing on" at its top edge, the buttons and volume at its bottom edge, the progress bar just above them; the title block stays at the top.
- **No jump on focus**: the progress hint and the volume hint are drawn in reserved space (absolutely positioned), so focusing the progress bar or the volume moves nothing. The volume hint is right-aligned under the row (under the buttons with lyrics open).

## 0.35.3

- **Volume pill**: the volume is a pill as tall as the Lyrics button, with a − button, the level (speaker icon and percentage; a crossed speaker at 0 %) and a + button. − and + are ordinary buttons: OK steps the volume by 5 %, there is no special mode and no hint. Without lyrics the pill follows Lyrics in the button row (Right from Lyrics reaches −, Left from − returns to Lyrics, Up goes to the progress bar). With lyrics open it is the row under the buttons (Down reaches it, Up returns; Right from Lyrics no longer jumps down to it). Back closes Now playing from the pill as from any other button. The OK-mute of 0.35–0.35.2 is gone: − down to 0 % mutes.

## 0.35.4

With lyrics open the buttons are two rows, both centred under the progress bar: previous, play/pause and next; then Lyrics with the volume pill beside it. Down from the first row goes to Lyrics, Up from the second row returns to the button you came from (play/pause by default); Right from Lyrics reaches −, Left from − returns to Lyrics. Down from the progress bar lands in the first row. Without lyrics nothing changes.

## 0.36

- **Song facts** (`app/assets/songfacts.js`, `window.FrameSongFacts`) on the large Now playing screen without lyrics. Looked up once per song (cached for the session; a failed request is retried next time).
- **Year**: on the album line ("Album · 1987"). Wikidata's earliest publication date (P577) of the matched article's item; otherwise Spotify's album `release_date` year, left out when `album_type` is `compilation`.
- **Fact**: one sentence from English Wikipedia, between the album line and the progress bar, prefixed by a small "From Wikipedia" label, two lines at most (one if the title wraps, hidden if even that would push the buttons off the cover's bottom edge; measured on layout boxes, since a focused button's scale would count as overflow). Hidden with lyrics open.
- **Matching** (search `<title> <artist> song` on en.wikipedia.org, 6 results with intro extracts): the article title without its parenthetical must equal the cleaned song title (" - Remastered …", "(feat. …)", "(Live)" and similar removed), a parenthetical must say song or single, the introduction must contain the main artist and the word song/single/track, and disambiguation pages are skipped. No match → year only.
- **Sentence choice** from the full plain text: a "story" sentence (inspired, wrote, idea, originally, recorded in, shower, dream, …) in a Background / Writing / Composition / Recording / Inspiration / History section; else such a sentence in the introduction after its first one; else the first sentence of such a section; never from Charts, Track listing, Personnel and similar. 40–240 characters. Nothing is generated or paraphrased.
- The Now playing rows no longer shrink to make room (a shrinking line was cut in half); the space above the buttons reserved for the progress hint is 44 px.

## 0.36.1

Long titles on the large Now playing screen first get smaller to stay on one line (68 → 60 → 52 → 48 px, measured against the 944 px text column); only a title that does not fit at 48 px wraps onto two lines, at 52 px. Before, a long title such as "I'll Be There for You - Theme From "Friends"" wrapped at 68 px and left no room for the song fact, which was then hidden.

## 0.36.2

Sentence choice for the song fact is now scored instead of taking the first match: strong signs of a story (originally, initially, inspired, last-minute, turned down, rejected, by accident, shower, dream, looped, in N minutes …) count three, plain ones (wrote, written, idea, based on, demo, recorded in …) one; a sentence that starts with a pronoun loses one (it leans on the one before), and one longer than 160 characters loses one (two lines on screen). Candidates are the introduction (not its first sentence) and Background / Writing / Composition / Recording / Inspiration / History sections, up to 220 characters. "Bros.", "Mt.", "Corp." and similar no longer end a sentence. With the real "I'll Be There for You" article this picks "American rock band R.E.M. was originally asked to allow their song "Shiny Happy People" to be used for the Friends theme, but they turned the opportunity down." instead of a sentence that starts "When Stipe rejected the offer"; that article is a test fixture.

## 0.36.3

- **Song facts on the TV**: `en.wikipedia.org` and `www.wikidata.org` were missing from the `<access>` list in `config.xml`, so Tizen blocked every lookup (the browser preview does not enforce it) and only Spotify's album year showed. Both are allowed now, and `scripts/check.py` fails when a host used in the app's JavaScript is not allowed there (the GitHub Pages host is only in phone QR codes and is skipped).
- **Alexa readings stay**: a reading missing from one Alexa answer (battery sensors often answer without their value) keeps its last value on Home for up to an hour instead of disappearing until the next full answer. Opening Readings had brought it back only because it reads again.
- **Day panel without a frame**: the holiday / name day / calendar panel is one tone of glass that fades out to the left, right and bottom like the docks; its top edge stays (rounded top corners). The fade is a box-shadow of the same colour (24 px blur, 24 px spread, pushed 48 px down so nothing shows above the panel); no mask, no filter. The thin inset edge lines are gone.

## 0.37

- **Liked Songs heart** on the large Now playing screen, after the volume pill (after Lyrics when the device has no volume; in the second row with lyrics open). White outline when the song is not in your Liked Songs, filled Spotify green (#1ed760) when it is, wherever it was added; OK adds or removes it and a toast confirms. Liked state is read when the song changes and again every 30 seconds while the screen is open. Endpoints: Spotify's 2026 library API (`GET /me/library/contains?uris=`, `PUT` / `DELETE /me/library?uris=spotify:track:…`), falling back to the older `/me/tracks` endpoints when the new one answers with an error. Hidden for podcast episodes. Needs the `user-library-read` and `user-library-modify` scopes: sign-ins made before 0.37 lack them, and the heart then says to sign out of Spotify in Settings and connect again instead of failing silently.
- **Lyrics** is a round button like the others now (its name stays in `aria-label`), and the row gaps are 24 px, so previous, play/pause, next, Lyrics, the volume pill and the heart fit the 944 px text column.
- **Volume that a speaker ignores**: Spotify accepts a volume change before the speaker takes it, and some speakers never do (an Alexa multi-room group such as "Everywhere" reported wandering values, 42 → 38 → 41, while the real volume stayed the same). The pill now keeps showing the volume you chose while Spotify catches up (polling every 2 seconds) for up to 8 seconds; if Spotify still reports something more than 2 % off, the pill shows what Spotify reports and a toast says the speaker kept its own volume. Before, the pill showed whatever Spotify reported each time, which looked like the presses were miscounted.
- **Song fact panel**: the fact is focusable (Up from the progress bar; Down from the device line). OK opens a panel over the text column with the sentence and the one or two after it from the same article (up to 520 characters), the article title, "From Wikipedia" and the licence; Back or OK closes it. Not focusable while hidden or with lyrics open.
- **Song fact quality**:
  - *Covers*: the main artist must be named in the article's **first sentence**. An article about an earlier original that mentions this artist's cover further on (Madcon's "Beggin'" and the Four Seasons' 1967 original) no longer matches, so neither its sentence nor its 1967 year is shown; the year comes from Spotify's album.
  - *Bare surnames*: a sentence that names someone only by surname ("Parker stated …") while the article introduces them in full ("Kevin Parker") is skipped, unless the surname is part of the artist's name.
  - *Dull sentences*: a sentence must score at least 2 (one strong story sign, or two plain ones); the old fallback to a section's first sentence is gone, so a song with only "written by …" shows no fact rather than a dull one.

## 0.37.1

**Volume, corrected.** The 0.37 explanation was wrong: the speaker does take the new volume, also a single Echo, it only reports back a value near the one set (set 42 %, Spotify then reports 38 %, then 41 %). 0.37's toast saying the speaker "kept its own volume" would therefore have been false and is removed. Now, after you change the volume, the pill keeps showing the value you chose as long as Spotify's reports for the same device stay within 8 % of it, and the next − or + steps from that value. A report further off (or another device) means the volume was changed elsewhere, such as on the phone or by voice, and the pill shows Spotify's value again. Polling is back to its normal pace.

## 0.38

**Ticker for long titles and artists**, on Home and on the large Now playing screen.
- Before: the text waited, eased slowly to its end, waited, and eased back (about 25 px/s).
- Now: it waits 1 second at its start, then moves left at a steady 2.6 font sizes per second (78 px/s for the 30 px Home title, 177 px/s for the 68 px Now playing title; 1.8 since 0.38.2). It runs out of the box on the left and comes back in from the right. A copy follows 2.5 font sizes behind, so one lap is the text plus that gap and the loop never jumps. The copy is added only while the text moves.
- The edges fade over 0.8 em with a mask on the text box (the only element masked). While the text waits only the right edge fades, so the first letter is not dimmed; both edges fade once it runs.
- On the large Now playing screen the title and the artists are always one line, at full size. The 0.36.1 shrinking (68 → 48 px) and the two-line wrap are gone, so the song fact always has its two lines.
- With reduced motion the text does not move and ends in an ellipsis.

## 0.38.1

- **Alexa and Spotify polling cannot be stopped by a drawing error.** The next read is now scheduled before Home is redrawn; before, an exception while drawing would have ended the 5-second Alexa read loop (and Spotify's) until Home was reopened. A light switched elsewhere not showing on the TV (reported on 0.37.1) could not be reproduced in the browser: there the change shows within one read, also after switching the same light from the TV and with a sensor answering without its value. So this is a safeguard, not a confirmed fix.
- **Settings → Alexa → Device details** now says how often Home reads Alexa, how long ago the last answer came and, if the last read failed, why. A recent answer while the light still shows the old state means Alexa itself reports the old state (open the device to see its power value); an old answer means reading stalled.

## 0.38.2

- **Alexa switches on Home update again while you watch.** On the TV the reads kept arriving (Device details said "last answer 0–4 s ago") but the switches only showed the new state after visiting a Settings screen. Home is drawn top to bottom: the clock line (weather, readings, date, day panel, song) first, then the switches. An error while drawing the first part leaves the switches as they were. Each part (clock line, switches, song) is now drawn on its own, so an error in one cannot hold back the others. The error itself is still thrown afterwards (console, checks) and is shown in Settings → Alexa → Device details as "Drawing error N s ago: where: message". Which part fails on the TV is not known yet; that line will say.
- **Ticker slower**: 1.8 font sizes per second (was 2.6), starting after 1.2 s (was 1 s).

## 0.38.3

**Alexa switches: one unknown device no longer freezes the rest.** On the TV, a light switched by voice did not change on Home, while Device details (which loads the full device list) showed the right state, and Home was right after coming back from it. Home reads only the devices it shows, in one request. When one id in such a request is no longer known to Alexa (a device removed, or added again under a new id), Alexa can answer the whole request with no devices and no error, so nothing on Home changed, and readings stayed on screen through the 0.36.3 one-hour keep. Now, when a request for several devices comes back empty (or with errors only), each device is asked on its own. A device that gets no answer even then is left out for ten minutes. Device details list such devices: "No answer for: …"; remove or choose them again in Readings / Switches. That this is what happens on the TV is the likeliest explanation that fits what was seen, but it is not confirmed: the Device details line will show it.

## 0.38.4

**The actual cause of the frozen Alexa switches.** Device details on the TV said "No answer for: frame:home". `frame:home` is not an Alexa device: it is the "Home screen" target of a remote button (0.27.1). `targetMembers` treated every id that was not Spotify, an app or a group as an Alexa device, so with a remote button set to the Home screen, `frame:home` was sent to Alexa with the devices on Home. Alexa then answered the whole read with no devices and no error, and nothing on Home changed until a full device list was loaded (Device details). It worked before the remote button was set to the Home screen. Now `frame:` targets are excluded like Spotify and apps, and a check asserts that only Alexa endpoint ids are read. The 0.38.3 one-by-one retry stays as a safeguard for devices that really disappear.

## 0.39

- **Tomorrow in the evening**: the day panel shows today's events that are still on (all-day events count all day), at most three. From 18:00 it also shows tomorrow's first two under a TOMORROW heading, with at most two of today's above. When today has nothing left, tomorrow's first three show at any time, as before. Before, an all-day event today kept tomorrow's events off Home all day.
- **Event size**: calendar events are 20 px, as large as the calendar's name chip (they were 26–28 px, larger than the name days above them).
- **Calendar colours**: each calendar's dot colour can be chosen in Date details → the calendar → Colour on Home (Connections → Calendar since 0.42): blue, pink, green, yellow, orange, red, purple, teal or white. The default stays by position (blue, pink, green). The colour is kept with the calendar (`cleanframe.calendar.v1`, so backups carry it).

## 0.39.1

The TOMORROW heading is a small label again: 15 px with spaced capitals and 8 px more room above it. With the centred clock it had taken the larger 28 px row size.

## 0.40

**Day panel layout.** Same glass background, new order and separation, left-aligned under the corner and the centred clock alike:
1. The holiday (26 px, bold, warm yellow; the dot before it is gone) and the name days (24 px, semibold).
2. A thin line.
3. TODAY (small spaced capitals) and today's events.
4. A thin line, TOMORROW and tomorrow's events (from 18:00, or when today has nothing left).

Events are one grid, so names, times and titles line up in columns across both days. With several calendars each event starts with its calendar's name on a chip: all chips as wide as the widest, the name centred in the panel's light text, the chip tinted with the calendar's colour (36 % over the glass, a 55 % edge); the separate dot is gone. The nine calendar colours are soft pastels. All-day events say "All day" in the time column. Sections with nothing in them, and the lines around them, are left out. The single-calendar icon is gone; the headings say what the rows are.

## 0.41

**Settings look: Original or Metro** (Settings → Style → Settings, `settingsLook`, default Original; kept in the preferences and in backups).

- **Metro overview**: the title is "settings" in thin lowercase Geist (the bundled OFL file, as 'Frame Metro'), and the group headings are lowercase too. Each group is a grid of two 228 px columns and three 216 px rows. The tiles are glass with a soft pastel tint (the calendar palette), 20 px corners, and on focus a light 4 px ring and a 3 % lift.
  - Personalization: Background 2×2, showing the wallpaper; Layout and Style 1×1, Style showing "Aa" in the Home font.
  - Home and time: Apps on Home, Wi‑Fi QR and Date and time, each 2×1. Apps on Home shows the first seven app icons; Date and time shows the time, redrawn every minute.
  - System: Language 1×1 (EN/HU, OK switches it); System 1×1; Connections 2×2, listing Alexa, Spotify and the calendars with a teal dot when connected.
- **Navigation**: Up, Down, Left and Right go to the nearest tile in that direction across all groups. A tile overlapping on the other axis wins, then the closest centre.
- **Pivots**: a page opened from the overview shows its name and its group's other pages dimmed beside it, with a short underline under the current one. Above sits a small SETTINGS label, which is the Back row. On a row, Left and Right move to the previous or next page of the pivot, with no wrap. Back returns to the overview with that page's tile focused. The pivots are Background · Layout · Style, Wi‑Fi QR · Date and time, and Connections · System. Pages opened from another page (Rotation, Alexa, Spotify, Date details, Wallpaper) stand alone. An open list still closes with Left, as before.
- **Rows**: the name is thin Geist 32 px with the current value under it (21 px, soft blue), the chevron on the right.
- Original is unchanged.

## 0.42

- **Calendars moved to Connections.** Connections lists Calendar beside Alexa and Spotify (its value names the connected calendars). Its page holds Calendar on Home, the calendars (name, colour, disconnect), Add another calendar and when it was last read. Date details keep the holidays and name days, plus a **Calendars** row ("Set in Connections"). OK on it goes to Connections → Calendar as if opened from the Settings overview, so Back leads through Connections to Settings. The Connections card and tile also count the calendar.
- **Pivot slide** (Metro look): moving to another page slides the title strip in by 160 px and the rows by 70 px, with a fade, from the side you moved towards (320 ms, transform and opacity only; none with reduced motion).
- **System pivot order**: System, then Connections, the order the tiles read.
- **Tile values wrap** onto a second line instead of ending in "…".

## 0.43

- **Apps on Home and All apps in the card style.**
  - Apps on Home: the rows are glass cards, and the focused or lifted one turns light like a Settings row (with Glass focus; Type focus keeps its bare, scaled look). The column headings and "Recently removed" / "Other installed apps" are small spaced capitals. Undo and Done are pill buttons.
  - All apps: every app is a glass tile. The focused one has a light ring, and "On Home" is a small teal pill.
  - With the Metro look the titles of both use the thin pivot face.
- **Apps on Home joins the Home and time pivot** (Metro look): Apps on Home · Wi‑Fi QR · Date and time. The pivot strip uses short names. Left on Wi‑Fi QR opens Apps on Home. In Apps on Home, Right past the right edge goes on to Wi‑Fi QR: from Not on Home, from Done, or from Remove when there is nothing to add. Undo and Done move down beside the column headings to make room for the strip.
- **Where Home starts to scroll**: the "Then scroll" line follows the dock that is set, at as many apps as it shows at once (seven in the Modern dock). With no more apps than that, the line is not shown. It was fixed after the fifth app.
- **Type focus in the Modern dock**: no frame; the focused app is full brightness at 108 %, the others dimmed to 55 %. Before, it differed from Glass only by a 6 % scale, so it looked as if the setting did nothing there. In the Dock and Tiles layouts, and in the All apps and Apps on Home lists, it already changed the focus look.
- **One hint for the overview**: the System card says "Open selected group" like the others. Language still says "Switch the language", because OK switches it directly.

## 0.44

**Sheets open with a fade, like the Wi‑Fi QR card.** A sheet opened from Home (Settings, All apps, a message …) fades in over Home in 320 ms. Its content rises 24 px and grows from 98.5 % into place in 420 ms, starting 60 ms later. Home stays drawn underneath until then (`.sheet-opening` on the stage, about 560 ms), so the two cross-fade instead of cutting to black. Only opacity and transform are animated; nothing moves with reduced motion. Moving between sheets that are already open (Settings → Apps on Home) does not replay it.

