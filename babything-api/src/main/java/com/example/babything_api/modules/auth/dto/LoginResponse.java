package com.example.babything_api.modules.auth.dto;

/**
 * mfaRequired = true: client chuyển sang bước nhập OTP với challenge.
 * mfaRequired = false (LOGIN_OTP_ENABLED=false): đăng nhập xong luôn, dùng tokens.
 */
public record LoginResponse(boolean mfaRequired, LoginChallengeResponse challenge, TokenResponse tokens) {

    public static LoginResponse challenge(LoginChallengeResponse challenge) {
        return new LoginResponse(true, challenge, null);
    }

    public static LoginResponse authenticated(TokenResponse tokens) {
        return new LoginResponse(false, null, tokens);
    }
}
