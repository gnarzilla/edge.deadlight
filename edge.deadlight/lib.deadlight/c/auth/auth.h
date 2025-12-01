// deadlight-lib/c/auth/auth.h
#ifndef DEADLIGHT_AUTH_H
#define DEADLIGHT_AUTH_H

#include "jwt.h"
#include "password.h"
#include <stdint.h>

// User structure
typedef struct {
    uint64_t id;
    char* username;
    char* role;
    password_hash_t* password_hash;
    uint64_t created_at;
    uint64_t last_login;
    uint8_t is_active;
} user_t;

// Authentication context
typedef struct {
    jwt_config_t* jwt_config;
    password_config_t* password_config;
    char* cookie_name;
    uint32_t session_timeout;
} auth_context_t;

// Authentication result
typedef struct {
    user_t* user;
    char* token;
    jwt_error_t error_code;
} auth_result_t;

// Core auth functions
auth_result_t* auth_login(const char* username, const char* password, auth_context_t* ctx);
jwt_error_t auth_verify_token(const char* token, auth_context_t* ctx, user_t** user);
jwt_error_t auth_check_request(const char* cookie_header, auth_context_t* ctx, user_t** user);
void auth_logout(const char* token, auth_context_t* ctx);

// User management
password_error_t auth_create_user(const char* username, const char* password, 
                                const char* role, auth_context_t* ctx, user_t** user);
jwt_error_t auth_change_password(user_t* user, const char* old_password, 
                               const char* new_password, auth_context_t* ctx);

// Cleanup functions
void user_free(user_t* user);
void auth_result_free(auth_result_t* result);
void auth_context_free(auth_context_t* ctx);

#endif // DEADLIGHT_AUTH_H