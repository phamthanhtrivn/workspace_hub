    package vn.workspacehub.user.mapper;

    import org.mapstruct.*;
    import vn.workspacehub.user.dto.request.UpdateUserProfileRequest;
    import vn.workspacehub.user.dto.response.UserProfileResponse;
    import vn.workspacehub.user.entity.UserProfile;

    @Mapper(componentModel = "spring")
    public interface UserProfileMapper {

        UserProfileResponse toResponse(UserProfile userProfile);

        @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
        void updateEntityFromRequest(UpdateUserProfileRequest request, @MappingTarget UserProfile userProfile);
    }
