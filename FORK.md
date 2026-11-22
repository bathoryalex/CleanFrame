# Fork notice

This repository is a **personal fork** of [CleanFrame](https://github.com/nthnclrk/CleanFrame) by [Nathan Clark](https://github.com/nthnclrk).

- **Upstream:** https://github.com/nthnclrk/CleanFrame  
- **This fork:** https://github.com/bathoryalex/CleanFrame  

Original code and documentation are licensed under the [MIT License](LICENSE). Third-party assets retain their own terms; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Fork-specific TV setup, app identity, and defaults are documented in [docs/alex-tv-setup.md](docs/alex-tv-setup.md).

## What this fork adds

- Its own Home row and app identity (`AlexFrmH01.FrameHome`), configured in `app/fork.js`, with HDMI tiles for consoles.
- Colour and minimal icon styles; a Dock that pages through whole tiles.
- English and Hungarian interface, 24/12-hour clock in the corner or centred, optional date, Open-Meteo weather.
- Wi‑Fi QR code for guests, entered on the TV.
- Your picture: a wallpaper sent from a phone through ntfy.sh and prepared on the TV.
- Spotify: now playing under the clock, Play/Pause and skip from the remote (official Web API, PKCE).
- Alexa: readings, light switches, named groups and colour-button shortcuts from the Alexa account, signed in once from the phone (unofficial).
- Settings as a grid of cards; Samsung Home as a direct action.

