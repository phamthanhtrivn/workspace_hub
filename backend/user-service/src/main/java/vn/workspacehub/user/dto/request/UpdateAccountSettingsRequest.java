package vn.workspacehub.user.dto.request;

import lombok.Data;

@Data
public class UpdateAccountSettingsRequest {
    private String theme;
    private String language;
    private String timezone;
    private Boolean allowSearchByEmail;
    private Boolean muteNotification;
}
