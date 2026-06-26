package vn.workspacehub.user.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSettingDto {
    @NotBlank(message = "Chủ đề không được để trống")
    private String theme;

    @NotBlank(message = "Ngôn ngữ không được để trống")
    private String language;

    @NotBlank(message = "Múi giờ không được để trống")
    private String timezone;

    @NotNull(message = "Thông báo qua email không được để rỗng")
    private Boolean emailNotificationEnabled;

    @NotNull(message = "Thông báo đẩy không được để rỗng")
    private Boolean pushNotificationEnabled;
}
