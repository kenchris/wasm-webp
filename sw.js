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
          this.size = buffer.byteLength;
          this.ptr = Module._malloc(this.size);
          Module.HEAPU8.set(new Uint8Array(buffer), this.ptr);
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
          const resultView = new Uint8Array(Module.HEAPU8.buffer, resultPtr, width * height * 4);
          const result = new Uint8ClampedArray(resultView);
          Module._free(resultPtr);

          return result;
        }
      }
      resolve({ WebPDecoder });
    }
    importScripts('webp_wasm.js');
  });
}

let resolver;
const canvasReady = new Promise(resolve => {
  resolver = resolve;
});

self.addEventListener('message', event => {
  Module.canvas = event.data.canvas;
  resolver();
});

self.addEventListener('fetch', async event => {
  if (event.request.method != 'GET') return;

  if (!event.request.url.endsWith(".webp")) return;

  event.respondWith(async function() {
    const response = await fetch(event.request);

    const buffer = await response.arrayBuffer();
    console.log(buffer);

    await canvasReady;

    try {
      const { WebPDecoder } = await importWebP();

      const decoder = new WebPDecoder(buffer);

      console.log("WebP version", decoder.version());
      let { width, height } = decoder.info();
      console.log("Info", width, height);
      const result = decoder.decode();
      console.log("Decoded", result);

      const img = new ImageData(result, width, height);

      Module.canvas.width = img.width;
      Module.canvas.height = img.height;
      const ctx = Module.canvas.getContext('2d');
      ctx.putImageData(img, 0, 0);

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