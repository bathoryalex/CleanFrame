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

  /* Shown beside the clock. Coordinates only; Open-Meteo needs no key. */
  weather: { name: 'Budapest', latitude: 47.4979, longitude: 19.0402 }
};
