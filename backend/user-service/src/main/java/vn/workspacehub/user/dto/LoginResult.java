package vn.workspacehub.user.dto;

import vn.workspacehub.user.dto.response.LoginResponseDto;

public record LoginResult(LoginResponseDto response, String rawRefreshToken) {

}