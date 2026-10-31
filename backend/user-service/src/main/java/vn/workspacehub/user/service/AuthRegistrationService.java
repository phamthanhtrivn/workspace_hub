package vn.workspacehub.user.service;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.password.PasswordEncoder;
import vn.workspacehub.user.dto.request.RegisterRequestDto;
import vn.workspacehub.user.entity.AccountSetting;
import vn.workspacehub.user.entity.User;
import vn.workspacehub.user.entity.UserProfile;
import vn.workspacehub.user.enums.AccountLanguage;
import vn.workspacehub.user.enums.UserRole;
import vn.workspacehub.user.enums.UserStatus;
import vn.workspacehub.user.events.UserProfileEventPublisher;
import vn.workspacehub.user.repository.AccountSettingRepository;
import vn.workspacehub.user.repository.UserProfileRepository;
import vn.workspacehub.user.repository.UserRepository;
import vn.workspacehub.user.util.EmailUtils;

/** Internal collaborator; authentication transactions are owned by the AuthService facade. */
@Service
@RequiredArgsConstructor
public class AuthRegistrationService {
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final AccountSettingRepository accountSettingRepository;
    private final UserProfileEventPublisher userProfileEventPublisher;


    public void register(RegisterRequestDto dto) {
        String email = EmailUtils.normalize(dto.getEmail());
        String passwordHash = passwordEncoder.encode(dto.getPassword());
        if (userRepository.existsByEmail(email)) return;

        User user = User.builder()
                .email(email)
                .passwordHash(passwordHash)
                .role(UserRole.USER)
                .status(UserStatus.ACTIVE)
                .build();

        User savedUser = userRepository.save(user);

        UserProfile userProfile = UserProfile.builder()
                .user(savedUser)
                .fullName(dto.getFullName())
                .dob(dto.getDob())
                .build();

        userProfileRepository.save(userProfile);
        savedUser.setProfile(userProfile);
        userProfileEventPublisher.publishSnapshotUpsertedAfterCommit(savedUser);

        AccountSetting accountSetting = AccountSetting.builder()
                .user(savedUser)
                .theme("light")
                .language(AccountLanguage.VIETNAMESE.getValue())
                .timezone("Asia/Ho_Chi_Minh")
                .build();
        accountSettingRepository.save(accountSetting);
    }
}
