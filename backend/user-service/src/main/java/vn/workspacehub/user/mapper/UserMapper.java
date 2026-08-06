package vn.workspacehub.user.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import vn.workspacehub.user.dto.response.UserSearchResponse;
import vn.workspacehub.user.entity.User;

@Mapper(componentModel = "spring")
public interface UserMapper {
    @Mapping(target = "id", source = "id")
    @Mapping(target = "email", source = "email")
    @Mapping(target = "fullName", source = "profile.fullName")
    @Mapping(target = "avatarUrl", source = "profile.avatarUrl")
    UserSearchResponse toSearchResponse(User user);
}
