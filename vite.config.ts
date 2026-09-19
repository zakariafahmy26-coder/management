import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      {
        name: 'suppress-vite-hmr-logs',
        transformIndexHtml: {
          order: 'pre',
          handler() {
            return [
              {
                tag: 'script',
                injectTo: 'head-prepend',
                children: `(function(){
  if(typeof window==='undefined')return;
  var OrigWS = window.WebSocket;
  if (OrigWS) {
    var MockWS = function(url, protocols) {
      var isHmr = protocols === 'vite-hmr' || (typeof url === 'string' && (url.indexOf('token=') !== -1 || url.indexOf('24678') !== -1 || url.indexOf('vite') !== -1));
      if (isHmr) {
        var listeners = {};
        return {
          CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3,
          readyState: 1,
          protocol: 'vite-hmr',
          url: url || '',
          bufferedAmount: 0,
          extensions: '',
          binaryType: 'blob',
          addEventListener: function(type, fn) {
            if (!listeners[type]) listeners[type] = [];
            listeners[type].push(fn);
            if (type === 'open') { setTimeout(fn, 0); }
          },
          removeEventListener: function(type, fn) {
            if (listeners[type]) listeners[type] = listeners[type].filter(function(cb) { return cb !== fn; });
          },
          dispatchEvent: function() { return true; },
          send: function() {},
          close: function() { this.readyState = 3; },
          onopen: null, onclose: null, onerror: null, onmessage: null
        };
      }
      return new OrigWS(url, protocols);
    };
    MockWS.prototype = OrigWS.prototype;
    MockWS.CONNECTING = 0;
    MockWS.OPEN = 1;
    MockWS.CLOSING = 2;
    MockWS.CLOSED = 3;
    window.WebSocket = MockWS;
  }
  var filter = function(args) {
    for (var i = 0; i < args.length; i++) {
      var s = String(args[i]).toLowerCase();
      if (s.indexOf('[vite]') !== -1 || s.indexOf('vite') !== -1 || s.indexOf('websocket') !== -1 || s.indexOf('hmr') !== -1) {
        return true;
      }
    }
    return false;
  };
  ['error', 'warn', 'info', 'debug', 'log'].forEach(function(m) {
    var orig = console[m];
    if (orig) {
      console[m] = function() {
        if (filter(arguments)) return;
        orig.apply(console, arguments);
      };
    }
  });
  window.addEventListener('error', function(e) {
    var m = String(e.message || '').toLowerCase();
    var f = String(e.filename || '').toLowerCase();
    if (m.indexOf('vite') !== -1 || m.indexOf('websocket') !== -1 || f.indexOf('vite') !== -1) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
  window.addEventListener('unhandledrejection', function(e) {
    var r = String(e.reason || (e.reason && (e.reason.message || e.reason.stack)) || '').toLowerCase();
    if (r.indexOf('vite') !== -1 || r.indexOf('websocket') !== -1) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
})();`,
              },
            ];
          },
        },
      },
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        manifest: {
          id: '/',
          name: 'إدارة خطوط سير وأسطول سيارات المصنع',
          short_name: 'أسطول المصنع',
          description: 'إدارة خطوط سير سيارات المصنع، وسجلات السائقين، وتكاليف الوقود، وتنبيهات الصيانة والتقارير.',
          theme_color: '#064e3b',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait-primary',
          start_url: '/',
          scope: '/',
          lang: 'ar',
          dir: 'rtl',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/[a-c]\.tile\.openstreetmap\.org\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'osm-map-tiles-cache',
                expiration: {
                  maxEntries: 300,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
