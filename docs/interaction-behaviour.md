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
| Background | Photo, Light, Dark; Wallpaper and Rotation when Photo is active; Picture from phone |
| Layout | Two titled groups. Bottom bar: Dock or Tiles, app display (Text, Icons, Both), colour or minimal icons. Top bar: Separate widgets or Dock, and Text, Icons or Both for Wi‑Fi/All apps/Settings and for Alexa switches |
| Typography | Manrope, Neue Montreal, Mori, Pangram Sans, Geist and Newsreader, when available |
| Focus | Type or Glass; Soft, Frost or Clear tint material |
| Apps on Home | Membership and arrangement editor |
| Language and clock | English or Magyar; 24-hour or 12-hour clock; clock in the Corner, Centre or Large centre; weather Off, Basic (temperature) or Full (with today's high and low) |
| Wifi QR code settings | Network name, password and security for the home-screen QR code |

Up/Down moves between rows. Left/Right moves between choices in a horizontal row. Focus alone changes neither the preview nor saved preferences in these appearance groups. Wallpaper has its own temporary photo preview, described below. OK applies the focused value. A checkmark identifies the applied value; the filled plate identifies remote focus. Applying the current value does not write again.

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

In Tiles, Settings → Focus applies: **Glass** turns the focused tile into lighter glass with a soft bright edge, shaped by the Material choice (Soft: even light glass; Frost: brighter at the top; Clear tint: clearer glass with a stronger edge); **Type** keeps the tile dark, rings it and dims the other tiles' icons and names.

## Spotify devices

In Now playing, Up from the progress bar (or from the buttons when there is no progress) focuses the **Playing on …** line, shown with a speaker icon and a chevron (**Choose a device** when nothing is playing). OK opens a **Play on** list over the right side, its top edge fixed 150 px from the top so it does not move when the devices arrive (it shows "Looking for your Spotify devices…" in the same frame first; when the devices arrive the card behind the list grows open over 0.32 s with a transform only, and the rows fade and rise in one after another, 25 ms apart; renders in the meantime wait until the rows are in, so nothing restarts): the devices Spotify reports now, with an icon by type, the current one in green with a tick and focused first, restricted ones dimmed with "Can't be controlled here". Up/Down move (at most seven rows show at once; the window follows the focus, with arrows above and below and an "11 / 14" style counter when there are more), OK on another device moves playback there with the current play or pause state (with nothing playing it asks Spotify to resume there), OK on the current device or Back closes the list. A short message confirms the move or says why it failed (for example Premium required); Now playing reads the player again 1.5 seconds later. With no devices on, the list says to open Spotify on the wanted device; after an error OK tries again.

## Top bar: Separate widgets or Dock

Settings → Layout → Top bar → **Style**. **Separate widgets** is the card row described above. **Dock** draws one glass bar across the full width of the screen at the top edge (152 px tall; light glass on a light background). Inside it the song card sits on the left (always there, even with the corner clock) and the Alexa switches and Wi‑Fi, All apps and Settings sit on the right as separate tiles, each as tall as the song card (120 px): icon above name, names only or icons only (120 x 120), as set for each group; a switch shows its small toggle under the name and glows warm while on. Focus is the same ring on lighter glass. The corner clock and its lines move below the bar, and the centred clock starts lower. Navigation is unchanged: Up from the apps enters the controls, Left from the first one reaches the song.

## Tiles shadow

In Tiles each tile keeps only a short contact shadow, and the bottom darkening that the Dock's shelf needs is lighter, so no shadow band forms under the row.

## Top Dock bar, refined (0.27)

The Dock bar is 116 px tall. The song card and every tile are 88 px tall, 14 px from the top, and the song starts 14 px from the left edge while the last tile ends 14 px from the right edge. The Alexa switches form their own group, set off from Wi‑Fi QR, All apps and Settings by a gap and a thin divider. Tile names are at most 150 px wide and end with an ellipsis; group names are limited to 12 characters when typed. With Icons chosen for Wi‑Fi QR/All apps/Settings or for the Alexa switches, neither the tile nor a focus label shows a name while moving (a save error is still spelled out). Wi‑Fi is labelled **Wi‑Fi QR**, with a Wi‑Fi icon carrying a small QR mark (also on the Settings card).

## Switch icons

Settings → Connections → Alexa → **Switch icons** lists the current switches with their icon; OK on one opens Light bulb, Fan, Air conditioning, Heating, Plug, TV, Speaker and Switch. The choice is stored per light or group id (`alexaIcons`), so it stays when a switch is removed and added again. A light bulb keeps its lit and unlit drawings; other icons turn warm while on.

## Home button signals

Frame Home returns to the Home screen on a `visibilitychange` to visible, and on `appcontrol` events on `window` and `document` (a relaunch while it is open) and a `tizenhwkey` named home. Which of these the TV sends when Home is pressed while Frame Home is already open is not yet confirmed: the remote test (Settings → Connections → Remote buttons → Test the remote buttons) now lists `appcontrol` events with the requested operation, as well as focus, visibility and page events.

