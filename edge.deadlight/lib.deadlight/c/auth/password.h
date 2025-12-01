// deadlight-lib/c/auth/password.h
#ifndef DEADLIGHT_PASSWORD_H
#define DEADLIGHT_PASSWORD_H

#include <stdint.h>
#include <stdlib.h>

// Password hash structure
typedef struct {
    char* hash;
    char* salt;
    uint32_t iterations;
    char* algorithm;
} password_hash_t;

// Error codes
typedef enum {
    PASSWORD_SUCCESS = 0,
    PASSWORD_ERROR_MEMORY = -1,
    PASSWORD_ERROR_CRYPTO = -2,
    PASSWORD_ERROR_INVALID_PARAMS = -3,
    PASSWORD_ERROR_VERIFICATION_FAILED = -4
} password_error_t;

// Configuration
typedef struct {
    uint32_t iterations;
    uint32_t salt_length;
    uint32_t hash_length;
    char* algorithm; // "PBKDF2-SHA256"
} password_config_t;

// Core password functions
password_error_t password_hash(const char* password, const password_config_t* config, password_hash_t** result);
password_error_t password_verify(const char* password, const password_hash_t* stored_hash);
void password_hash_free(password_hash_t* hash);

// Utility functions
password_error_t password_generate_salt(uint8_t* salt, uint32_t length);
password_error_t password_derive_key(const char* password, const uint8_t* salt, uint32_t salt_len, 
                                    uint32_t iterations, uint8_t* output, uint32_t output_len);

#endif // DEADLIGHT_PASSWORD_H