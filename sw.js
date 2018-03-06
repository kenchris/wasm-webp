var Module = { 
  ENVIRONMENT: "WORKER"
};


async function fetchAndInstantiate() {
  const response = await fetch('webp_wasm.wasm');
  Module["wasmBinary"] = await response.arrayBuffer();
  importScripts('webp_wasm.js');

  const getInfo = Module.cwrap('getInfo', 'number', ['number', 'number']);

  return {
    decodeWebPBufferToCanvas: Module.cwrap('version', 'number', []),
    createUint8Buffer: Module.cwrap('createUint8Buffer', 'number', ['number']),
    getInfo: (buffer, size) => {
      const ptr = getInfo(buffer, size);
      const success = !!Module.getValue(ptr, "i32");

      if (!success) return { width: null, height: null };

      const width = Module.getValue(ptr + 4, "i32");
      const height = Module.getValue(ptr + 8, "i32");

      return { width, height };
    }
  }
}

const moduleReady = (async () => {
   Module.exports = await fetchAndInstantiate();
})();

self.addEventListener('fetch', async event => {
  if (event.request.method != 'GET') return;

  if (!event.request.url.endsWith(".webp")) return;

  event.respondWith(async function() {
    const response = await fetch(event.request);

    const buffer = new Uint8Array(await response.arrayBuffer());

    try {
      await moduleReady;
      const version = Module.exports.decodeWebPBufferToCanvas();

      const ptr = Module.exports.createUint8Buffer(buffer.byteLength);
      console.log(ptr, buffer.buffer, buffer.byteLength, buffer.length);
      Module.HEAP8.set(buffer.buffer, ptr);

      console.log(Module.exports.getInfo(ptr, buffer.byteLength));

      //let blob = null;
      //if (Module.canvas.convertToBlob) {
      //  blob = await Module.canvas.convertToBlob({ type: "image/png", quality: 1});
      //} else {
      //  blob = await Module.canvas.toBlob("image/png", 1);
      //}

      //return new Response(blob, { "status": 200 });
      console.log(version);
    } catch(err) {
      console.error(err);
    }

    return fetch(event.request);
  }());
});