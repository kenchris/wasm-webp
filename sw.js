
let _resolver;
const _canvasReady = new Promise(resolve => {
  _resolver = resolve;
});

self.addEventListener('message', event => {
  _resolver(event.data.canvas);
});

function getOfflineCanvas() {
  return _canvasReady;
}

let _decoderReady = new Promise(async resolve => {
  // FIXME: Doesn't work in Chrome yet.
  // const moduleDecl = await import('webp-decoder.js');
  // const imports = await moduleDecl.importWebPDecoder();

  importScripts('webp_wasm.js');
  importScripts('classic/webp-decoder.js');
  resolve(await fetchWebPDecoder());
});

function fetchWebPDecoderWithWorkarounds() {
  return _decoderReady;
}

self.addEventListener('fetch', async event => {
  if (event.request.method != 'GET') return;
  if (!event.request.url.endsWith(".webp")) return;

  event.respondWith(async function() {
    try {
      const response = await fetch(event.request);
      const buffer = await response.arrayBuffer();

      const WebPDecoder = await fetchWebPDecoderWithWorkarounds();
      const decoder = new WebPDecoder(buffer);
      const canvas = await getOfflineCanvas();
      const blob = await decoder.decodeToBlob(canvas);

      return new Response(blob, { "status": 200 });
    } catch(err) {
      console.error(err);
    }

    return fetch(event.request);
  }());
});