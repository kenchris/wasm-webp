var Module = { 
  ENVIRONMENT: "WORKER"
};

async function fetchAndInstantiate() {
  const response = await fetch('webp_wasm.wasm');
  Module["wasmBinary"] = await response.arrayBuffer();
  importScripts('beautified-webp_wasm.js');
  return {
    decodeWebPBufferToCanvas: Module.cwrap('WebpToSDL', 'number', ['array', 'number'])
  }
}

const moduleReady = (async () => {
   Module.exports = await fetchAndInstantiate();
})();

let resolver;
const canvasReady = new Promise(resolve => {
  resolver = resolve;
});

self.addEventListener('message', event => {
  Module.canvas = event.data.canvas;
  //GL.createContext(Module.canvas, {});
  //Module.canvas.getContext("webgl");
  resolver();
});

self.addEventListener('fetch', async event => {
  if (event.request.method != 'GET') return;

  if (!event.request.url.endsWith(".webp")) return;

  event.respondWith(async function() {
    const response = await fetch(event.request);

    await Promise.all([moduleReady, canvasReady]);
    const buffer = new Uint8Array(response.arrayBuffer());

    try {
      Module.exports.decodeWebPBufferToCanvas(buffer, buffer.length);

      let blob = null;
      if (Module.canvas.convertToBlob) {
        blob = await Module.canvas.convertToBlob({ type: "image/png", quality: 1});
      } else {
        blob = await Module.canvas.toBlob("image/png", 1);
      }

      return new Response(blob, { "status": 200 });
    } catch(err) {
      console.error(err);
    }

    return fetch(event.request);
  }());
});