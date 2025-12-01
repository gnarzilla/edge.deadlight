// deadlight-lib/c/auth/jwt.h
#ifndef DEADLIGHT_JWT_H
#define DEADLIGHT_JWT_H

#include <stdint.h>
#include <stdlib.h>

// JWT token structure
typedef struct {
    char* header;
    char* payload;
    char* signature;
    char* raw_token;
} jwt_token_t;

// JWT payload structure
typedef struct {
    uint64_t user_id;
    char* username;
    char* role;
    uint64_t exp;
    uint64_t iat;
    uint64_t nbf;
    char* iss;
    char* aud;
} jwt_payload_t;

// Error codes
typedef enum {
    JWT_SUCCESS = 0,
    JWT_ERROR_INVALID_FORMAT = -1,
    JWT_ERROR_INVALID_SIGNATURE = -2,
    JWT_ERROR_EXPIRED = -3,
    JWT_ERROR_NOT_BEFORE = -4,
    JWT_ERROR_INVALID_ISSUER = -5,
    JWT_ERROR_INVALID_AUDIENCE = -6,
    JWT_ERROR_MEMORY = -7,
    JWT_ERROR_CRYPTO = -8
} jwt_error_t;

// Configuration structure
typedef struct {
    char* secret;
    uint32_t secret_len;
    uint64_t default_expiry;
    char* issuer;
    char* audience;
} jwt_config_t;

// Core JWT functions
jwt_error_t jwt_create(const jwt_payload_t* payload, const jwt_config_t* config, char** token);
jwt_error_t jwt_verify(const char* token, const jwt_config_t* config, jwt_payload_t** payload);
void jwt_payload_free(jwt_payload_t* payload);
void jwt_token_free(jwt_token_t* token);

// Utility functions
jwt_error_t jwt_parse_token(const char* token, jwt_token_t** parsed);
jwt_error_t jwt_validate_timing(const jwt_payload_t* payload);
jwt_error_t jwt_validate_claims(const jwt_payload_t* payload, const jwt_config_t* config);

#endif // DEADLIGHT_JWT_H
