/* Alex fork configuration — loaded before device.js and main.js in the browser and on the TV.
   This is the one place to change the Home shortcuts, the installed identity filter and the
   weather location. ES5 only: the TV runtime does not support modern syntax. */
window.FrameFork = {
  displayName: 'Frame Home',
  previewHint: 'Alex Frame Home fork',
  /* Must match <tizen:application id> in config.xml; Frame Home hides itself from All apps. */
  selfAppId: 'AlexFrmH01.FrameHome',

  /* Default Home row, in order. `hdmi-N` opens TV input N (Settings → Connection →
     External device manager). `altAppIds` are other installs of the same service; they are
     recognised in All apps but the shortcut launches `appId`.
     Nuvio native .tpk: NuvioTV002.Nuvio — WebAssembly .wgt: NuvioTV002.NuvioNative. */
  apps: [
    { id: 'hdmi-1', name: 'Xbox', brand: 'xbox', appId: 'hdmi-1' },
    { id: 'hdmi-2', name: 'Nintendo Switch', brand: 'nintendoswitch', appId: 'hdmi-2' },
    { id: 'nuvio', name: 'Nuvio Legacy', brand: 'nuvio', appId: 'NuvioTV002.Nuvio', altAppIds: ['NuvioTV002.NuvioNative'] },
    { id: 'youtube', name: 'YouTube', brand: 'youtube', appId: '9Ur5IzDKqV.TizenYouTube' },
    { id: 'spotify', name: 'Spotify', brand: 'spotify', appId: 'rJeHak5zRg.Spotify' },
    { id: 'hbomax', name: 'HBO Max', brand: 'hbomax', appId: '5b8c3eb16b.BeamCTVDev', altAppIds: ['tjusFNQffm.HBOMAX'] },
    { id: 'smartthings', name: 'SmartThings', brand: 'smartthings', appId: 'com.samsung.tv.SmartThingsApp' },
    { id: 'browser', name: 'Internet', brand: 'browser', appId: 'org.tizen.browser' }
  ],

  /* Your picture arrives through this ntfy server. The channel name is generated on the TV. */
  relay: 'https://ntfy.sh',
  /* The QR code opens this page (docs/send/ on GitHub Pages) with the channel in the URL fragment.
     Leave it empty to open the ntfy.sh web page instead. */
  sendPage: 'https://bathoryalex.github.io/CleanFrame/send/',
  /* The Alexa QR code opens this sign-in page (docs/alexa/). Leave it empty to hide the Alexa card. */
  alexaPage: 'https://bathoryalex.github.io/CleanFrame/alexa/',
  /* The calendar QR code opens this page (docs/calendar/), which encrypts your secret iCal address. */
  calendarPage: 'https://bathoryalex.github.io/CleanFrame/calendar/',
  /* Spotify app from developer.spotify.com (Authorization Code with PKCE; the client id is public,
     there is no secret). `page` must be listed as a Redirect URI in that app. Empty clientId hides Spotify. */
  spotify: { clientId: '46baaffd46624e648beec0c38bc3d070', page: 'https://bathoryalex.github.io/CleanFrame/spotify/' },

  /* Shown beside the clock. Coordinates only; Open-Meteo needs no key. */
  weather: { name: 'Budapest', latitude: 47.4979, longitude: 19.0402 }
};
