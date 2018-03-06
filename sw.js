var Module = { 
  ENVIRONMENT: "WORKER"
};

function importWebP() {
  return new Promise(resolve => {
    Module.onRuntimeInitialized = _ => {
      const version = Module.cwrap('version', 'number', []);
      const getInfo = Module.cwrap('getInfo', 'number', ['number', 'number']);
      const decode = Module.cwrap('decode', 'number', ['number', 'number']);

      class WebPDecoder {
        constructor(buffer) {
          this.size = buffer.length * buffer.BYTES_PER_ELEMENT;
          this.ptr = Module._malloc(this.size);
          Module.HEAPU8.set(buffer, this.ptr);
        }

        version() {
          return version();
        }

        info() {
          const ptr = getInfo(this.ptr, this.size);
          const success = !!Module.getValue(ptr, "i32");
          if (!success) {
            Module._free(ptr);
            return { width: null, height: null };
          }
          const width = Module.getValue(ptr + 4, "i32");
          const height = Module.getValue(ptr + 8, "i32");
    
          Module._free(ptr);
    
          return { width, height };
        }

        decode() {
          let { width, height } = this.info();

          const resultPtr = decode(this.ptr, this.size);
          const resultView = new Uint8Array(Module.HEAP8.buffer, resultPtr, width * height * 4);
          const result = new Uint8Array(resultView);
          Module._free(resultPtr);

          return result;
        }
      }
      resolve({ WebPDecoder });
    }
    importScripts('webp_wasm.js');
  });
}

self.addEventListener('fetch', async event => {
  if (event.request.method != 'GET') return;

  if (!event.request.url.endsWith(".webp")) return;

  event.respondWith(async function() {
    const response = await fetch(event.request);

    const buffer = new Uint8Array(await response.arrayBuffer());

    try {
      const { WebPDecoder } = await importWebP();

      const decoder = new WebPDecoder(buffer.buffer, buffer.byteLength);

      console.log("WebP version", decoder.version());
      console.log("Info", decoder.info());
      const result = decoder.decode();
      console.log("Decoded", result);

      return new Response(result, { "status": 200 });
    } catch(err) {
      console.error(err);
    }

    return fetch(event.request);
  }());
});