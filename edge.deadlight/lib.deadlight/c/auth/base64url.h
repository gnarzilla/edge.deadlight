// deadlight-lib/c/auth/base64url.h
#ifndef DEADLIGHT_BASE64URL_H
#define DEADLIGHT_BASE64URL_H

#include <stdint.h>
#include <stdlib.h>

// Base64URL encoding/decoding for JWT
typedef enum {
    BASE64URL_SUCCESS = 0,
    BASE64URL_ERROR_MEMORY = -1,
    BASE64URL_ERROR_INVALID_INPUT = -2,
    BASE64URL_ERROR_BUFFER_TOO_SMALL = -3
} base64url_error_t;

// Core functions
base64url_error_t base64url_encode(const uint8_t* input, size_t input_len, char** output);
base64url_error_t base64url_decode(const char* input, uint8_t** output, size_t* output_len);

// Utility functions
size_t base64url_encoded_length(size_t input_len);
size_t base64url_decoded_length(const char* input);

// Memory cleanup
void base64url_free(void* ptr);

#endif // DEADLIGHT_BASE64URL_H