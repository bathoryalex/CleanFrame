# Third-party notices

The root MIT licence covers CleanFrame's original code and documentation. Third-party material retains the terms below. Keep these notices and the adjacent licence texts when sharing source or a build.

## Fonts

| Material | Terms and source record |
| --- | --- |
| Manrope | SIL Open Font License 1.1; `app/assets/manrope-OFL.txt` |
| Geist and Newsreader | SIL Open Font License 1.1; licences beside the files in `app/assets/fonts/`, with exact sources and hashes in `app/assets/fonts/SOURCES.json` |
| Optional PP Neue Montreal, PP Mori and PP Pangram Sans | Proprietary. Binaries stay in ignored `.local/` storage and are excluded from Git and public exports. The optional local overlay requires the user's own permission to use and embed those files. |

The public app uses Manrope, Geist and Newsreader. A personal widget containing proprietary fonts must stay private. See [Pangram's licensing information](https://pangrampangram.com/pages/eula).

## Icons and trademarks

| Material | Provenance and terms |
| --- | --- |
| Simple Icons service marks | CC0; exact revisions and adaptations in `app/assets/icons/SOURCES.json` and `ADDITIONAL-SOURCES.json`. The CC0 text is retained beside the icons. |
| Disney+, ABC and SBS marks | [Custom Brand Icons](https://github.com/elax46/custom-brand-icons), MIT. The retained licence is `app/assets/icons/CUSTOM-BRAND-ICONS-LICENSE.txt`. ABC and SBS sources were replaced during the public-source review. Exact revisions, source files and extraction/recolour notes are in `SOURCES.json`. |
| Art, apps, settings and home outlines | Original CleanFrame drawings, covered by the project's MIT licence. |

Brand marks identify services. Their owners retain trademark rights; this project claims no endorsement or affiliation. The older Australian TV icon archive's GPL text is retained for historical provenance only; no current icon uses that archive.

## Photographs and derived materials

The fifteen photo pages were individually checked on 20 October 2026. Each displayed its credited author and free use under the [Unsplash License](https://unsplash.com/license). The [asset source register](docs/asset-sources.md) links every page. Runtime paths are in `app/assets/wallpapers/SOURCES.json`.

Photographers retain their rights. Wallpapers, thumbnails, panel backgrounds and material fields derive from the credited photographs and retain their terms. The Unsplash licence permits copying, modification and distribution subject to its restrictions, including on selling unmodified images and building a competing image service.

## JavaScript libraries (runtime)

| Material | Terms and source record |
| --- | --- |
| QR Code Generator for JavaScript (Kazuhiko Arase) | MIT; vendored as `app/assets/qrcode.js` for the Wi‑Fi QR overlay. Original: [d-project QR Code](http://www.d-project.com/). “QR Code” is a registered trademark of DENSO WAVE INCORPORATED. |

## Development dependencies and exports

Development dependencies retain the licences in their npm packages. They are not copied into the TV JavaScript runtime.

`npm run export:public` excludes private fonts and includes this notice and the root MIT licence. Preserve the included font and icon licence texts. Review [public release preparation](docs/public-release.md) before publishing a repository or download.

## mp4-muxer

`docs/send/mp4-muxer.js` is [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) 5.2.2 by Vanilagy, vendored unchanged under the MIT licence in `docs/send/mp4-muxer-LICENSE.txt`. It is used only by the phone send page, not by the TV app.

## Hungarian name days

`app/assets/namedays-hu.js` holds the name-day data of the npm package [nevnap](https://github.com/nevadavid/nevnap) 1.1.1, Copyright (c) 2021 David Uri, under the MIT licence retained as `app/assets/namedays-hu-LICENSE.txt`. The data was converted to a plain array and an empty duplicate day in May was removed.

## Online services

Public holidays come at run time from the [Nager.Date](https://date.nager.at) API; weather from Open-Meteo. Nothing from these services is bundled.

## aioamazondevices (reference only)

`app/assets/alexa.js` and `tools/alexa-check/` follow the sign-in flow, request parameters and GraphQL queries of [aioamazondevices](https://github.com/chemelli74/aioamazondevices) (Apache License 2.0). No code is copied; the queries are shortened to the fields Frame Home reads.
