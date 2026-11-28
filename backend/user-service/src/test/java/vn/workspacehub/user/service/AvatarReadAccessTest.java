package vn.workspacehub.user.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.services.s3.S3Client;
import vn.workspacehub.user.entity.UserProfile;
import vn.workspacehub.user.repository.UserProfileRepository;

class AvatarReadAccessTest {
    @Test void permitsTheCurrentAvatarButNotAnotherUnselectedObject() {
        var redis = mock(StringRedisTemplate.class);
        var storage = mock(S3Service.class);
        var profiles = mock(UserProfileRepository.class);
        var service = new AvatarUploadService(redis, mock(S3Client.class), storage, profiles, mock(AuthAttemptLimiter.class));
        UUID actor = UUID.randomUUID(), owner = UUID.randomUUID(), file = UUID.randomUUID();
        String key = AvatarStorageKeys.confirmed(owner, file, ".png"), reference = AvatarStorageKeys.reference(key);
        var profile = new UserProfile();
        profile.setAvatarUrl(reference);
        when(storage.generateFileUrl(key)).thenReturn(reference);
        when(storage.generateAvatarReadUrl(key)).thenReturn("signed-url");
        when(profiles.findByUserId(owner)).thenReturn(Optional.of(profile));
        assertEquals("signed-url", service.authorizeRead(actor, owner, file + ".png"));
        when(profiles.findByUserId(owner)).thenReturn(Optional.empty());
        assertThrows(ResponseStatusException.class, () -> service.authorizeRead(actor, owner, file + ".png"));
    }

    @Test void previewRequiresTheUploadOwnerAndAConfirmedUpload() {
        var redis = mock(StringRedisTemplate.class);
        when(redis.hasKey(anyString())).thenReturn(true);
        var storage = mock(S3Service.class);
        var profiles = mock(UserProfileRepository.class);
        var service = new AvatarUploadService(redis, mock(S3Client.class), storage, profiles, mock(AuthAttemptLimiter.class));
        UUID owner = UUID.randomUUID(), file = UUID.randomUUID();
        String key = AvatarStorageKeys.confirmed(owner, file, ".png");
        when(storage.generateFileUrl(key)).thenReturn(AvatarStorageKeys.reference(key));
        when(storage.generateAvatarReadUrl(key)).thenReturn("signed-preview");
        when(profiles.findByUserId(owner)).thenReturn(Optional.empty());
        assertEquals("signed-preview", service.authorizeRead(owner, owner, file + ".png"));
        assertThrows(ResponseStatusException.class, () -> service.authorizeRead(UUID.randomUUID(), owner, file + ".png"));
    }
}
