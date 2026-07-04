package vn.workspacehub.user.dto.request;

import lombok.Data;

@Data
public class UpdatePrivacyRequest {
    private boolean allowSearchByEmail;
}
