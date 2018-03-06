#include <stdlib.h>
#include "emscripten.h"
#include "../libwebp/src/webp/encode.h"
#include "../libwebp/src/webp/decode.h"


EMSCRIPTEN_KEEPALIVE
int version() {
  return WebPGetEncoderVersion();
}

EMSCRIPTEN_KEEPALIVE
uint8_t* createUint8Buffer(size) {
  return malloc(size * sizeof(uint8_t));
}

EMSCRIPTEN_KEEPALIVE
void destroyUint8Buffer(uint8_t* p) {
  free(p);
}

EMSCRIPTEN_KEEPALIVE
int* getInfo(const uint8_t* data, size_t data_size) {
  int* results = (int*) malloc(3 * sizeof(int));

  results[0] = WebPGetInfo(data, data_size, results + 1, results + 2);

  return results;
}