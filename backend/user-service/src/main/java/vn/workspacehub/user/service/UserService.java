package vn.workspacehub.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.workspacehub.user.dto.request.RegisterRequestDto;
import vn.workspacehub.user.entity.User;
import vn.workspacehub.user.entity.UserProfile;
import vn.workspacehub.user.enums.UserRole;
import vn.workspacehub.user.enums.UserStatus;
import vn.workspacehub.user.exception.BusinessException;
import vn.workspacehub.user.repository.UserProfileRepository;
import vn.workspacehub.user.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void register(RegisterRequestDto dto) {
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new BusinessException("Email đã tồn tại trong hệ thống");
        }

        User user = User.builder()
                .email(dto.getEmail())
                .passwordHash(passwordEncoder.encode(dto.getPassword()))
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
    }
}
