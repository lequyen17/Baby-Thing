package com.example.babything_api.modules.auth.dto;

public record LoginResult(LoginResponse body, String refreshTokenPlain) {

    public static LoginResult challenge(LoginChallengeResponse challenge) {
        return new LoginResult(LoginResponse.challenge(challenge), null);
    }

    public static LoginResult authenticated(AuthSession session) {
        return new LoginResult(LoginResponse.authenticated(session.tokens()), session.refreshTokenPlain());
    }
}
