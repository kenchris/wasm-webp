var Module = { 
  ENVIRONMENT: "WORKER"
};

async function fetchAndInstantiate() {
  const response = await fetch('webp_wasm.wasm');
  Module["wasmBinary"] = await response.arrayBuffer();
  importScripts('webp_wasm.js');

  const _getInfo = Module.cwrap('getInfo', 'number', ['number', 'number']);
  const getInfo = (buffer, size) => {
    const ptr = _getInfo(buffer, size);
    const success = !!Module.getValue(ptr, "i32");

    if (!success) return { width: null, height: null };

    const width = Module.getValue(ptr + 4, "i32");
    const height = Module.getValue(ptr + 8, "i32");

    return { width, height };
  }
  const version = Module.cwrap('version', 'number', []);
  const createUint8Buffer = Module.cwrap('createUint8Buffer', 'number', ['number']);
  const decode = Module.cwrap('decode', 'number', ['number', 'number']);
  const destroy = Module.cwrap('destroy', 'void', ['number']);

  return { version, getInfo, createUint8Buffer, decode, destroy };
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
      const version = Module.exports.version();
      console.log("webp version", version)

      const ptr = Module.exports.createUint8Buffer(buffer.byteLength);
      console.log(ptr, buffer.buffer, buffer.byteLength, buffer.length);
      Module.HEAP8.set(buffer.buffer, ptr);

      const info = Module.exports.getInfo(ptr, buffer.byteLength);
      console.log(info);

      const resultPtr = Module.exports.decode(ptr, buffer.byteLength);
      const resultView = new Uint8Array(Module.HEAP8.buffer, resultPtr, info.width * info.height * 4);
      const result = new Uint8Array(resultView);
      Module.exports.destroy(resultPtr);

      console.log(result);

      return new Response(result, { "status": 200 });
    } catch(err) {
      console.error(err);
    }

    return fetch(event.request);
  }());
});