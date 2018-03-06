#include <stdlib.h>
#include "emscripten.h"
#include "../libwebp/src/webp/decode.h"


EMSCRIPTEN_KEEPALIVE
int version() {
  return WebPGetDecoderVersion();
}

EMSCRIPTEN_KEEPALIVE
uint8_t* createUint8Buffer(size) {
  return malloc(size * sizeof(uint8_t));
}

EMSCRIPTEN_KEEPALIVE
int* getInfo(const uint8_t* data, size_t size) {
  int* results = (int*) malloc(3 * sizeof(int));

  int width;
  int height;

  // (const uint8_t* data, size_t size, int* w, int* h) -> int;
  results[0] = WebPGetInfo(data, size, &width, &height);
  results[1] = width;
  results[2] = height;

  return results;
}

EMSCRIPTEN_KEEPALIVE
uint8_t* decode(const uint8_t* data, size_t size) {
  int width;
  int height;

  uint8_t* buffer = WebPDecodeRGBA(data, size, &width, &height);
  return buffer;
}

EMSCRIPTEN_KEEPALIVE
void destroy(const uint8_t* data) {
  // WebPFree just calls free() so this is fine.
  free((void *)data);
}
