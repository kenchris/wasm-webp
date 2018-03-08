function importClassicScript(url){
  const script = document.createElement("script")
  script.type = "text/javascript";
  script.src = url;

  const p = new Promise(resolve => script.onload = resolve);
  document.body.appendChild(script);
  return p;
}

self.Module = typeof self.Module !== "undefined" ? self.Module : {};

export async function fetchWebPDecoder() {
  const initRuntime = (async () => {
    const p = new Promise(resolve => {
      self.Module.onRuntimeInitialized = resolve;
    });

    if (self && self.document) {
      await importClassicScript('webp_wasm.js');
    }
    else if (self && self.importScripts) {
      /* sync */ importScripts('webp_wasm.js');
    } else {
      console.warning("Cannot auto import 'webp_wasm.js' from script imported from worker");
    }
    return p;
  })();

  await initRuntime;

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

    decodeToBlob(canvas) {
      let { width, height } = this.info();

      const result = this.decode();
      console.log(result);
      const img = new ImageData(result, width, height);

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(img, 0, 0);

      if (typeof OffscreenCanvas !== "undefined" && canvas instanceof OffscreenCanvas) {
        if (canvas.convertToBlob) {
          return canvas.convertToBlob({ type: "image/png", quality: 1});
        } else {
          return canvas.toBlob("image/png", 1); // Firefox API.
        }
      }

      return new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob));
      });
    }
  }

  return WebPDecoder;
}