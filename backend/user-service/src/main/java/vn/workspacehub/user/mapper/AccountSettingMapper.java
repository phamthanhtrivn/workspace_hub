package vn.workspacehub.user.mapper;

import org.mapstruct.Mapper;
import vn.workspacehub.user.dto.response.AccountSettingResponse;
import vn.workspacehub.user.entity.AccountSetting;

@Mapper(componentModel = "spring")
public interface AccountSettingMapper {
    AccountSettingResponse toResponse(AccountSetting accountSetting);
}
