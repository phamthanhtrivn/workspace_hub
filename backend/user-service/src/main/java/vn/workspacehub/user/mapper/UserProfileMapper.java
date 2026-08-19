package vn.workspacehub.user.mapper;

import org.mapstruct.*;
import vn.workspacehub.user.dto.request.UpdateUserProfileRequest;
import vn.workspacehub.user.dto.response.UserProfileResponse;
import vn.workspacehub.user.entity.User;
import vn.workspacehub.user.entity.UserProfile;

@Mapper(componentModel = "spring")
public interface UserProfileMapper {

    @Mapping(target = "id", source = "user.id")
    @Mapping(target = "email", source = "user.email")
    @Mapping(target = "hasPassword", expression = "java(userProfile.getUser().getPasswordHash() != null && !userProfile.getUser().getPasswordHash().isBlank())")
    UserProfileResponse toResponse(UserProfile userProfile);

    @Mapping(target = "id", source = "id")
    @Mapping(target = ".", source = "profile")
    @Mapping(target = "hasPassword", expression = "java(user.getPasswordHash() != null && !user.getPasswordHash().isBlank())")
    UserProfileResponse toResponse(User user);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntityFromRequest(UpdateUserProfileRequest request, @MappingTarget UserProfile userProfile);
}
