package vn.workspacehub.user.service;

import java.time.Duration;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import vn.workspacehub.user.dto.response.PresignedUrlResponse;
import vn.workspacehub.user.exception.BusinessException;
import vn.workspacehub.user.repository.UserProfileRepository;

@Service
@RequiredArgsConstructor
public class AvatarUploadService {
    private static final String INTENT = "AVATAR_INTENT:";
    private static final String CONFIRMED = "AVATAR_CONFIRMED:";
    private static final String CLEANUP = "AVATAR_CLEANUP";
    private final StringRedisTemplate redis;
    private final S3Client client;
    private final S3Service storage;
    private final UserProfileRepository profiles;
    private final AuthAttemptLimiter limiter;
    @Value("${aws.s3.bucket-name}") private String bucket;

    public PresignedUrlResponse initiate(UUID userId, String filename, String mime, long size) {
        if (filename == null || filename.isBlank() || filename.length() > 255 || size < 1 || size > AvatarPolicy.MAX_BYTES)
            throw new BusinessException("Avatar must be at most 2 MiB.");
        String extension = AvatarPolicy.extension(mime);
        limiter.beforeAvatarUpload(userId.toString());
        String id = UUID.randomUUID().toString();
        String key = AvatarStorageKeys.staging(userId, id, extension);
        redis.opsForValue().set(INTENT + userId + ":" + id, size + "|" + mime + "|" + key, Duration.ofSeconds(AvatarPolicy.INTENT_TTL_SECONDS));
        redis.opsForZSet().add(CLEANUP, key, System.currentTimeMillis() + AvatarPolicy.INTENT_TTL_SECONDS * 1000L);
        return storage.generatePresignedUrl(key, mime, size, id);
    }

    public String confirm(UUID userId, UUID uploadId) {
        String intent = redis.opsForValue().getAndDelete(INTENT + userId + ":" + uploadId);
        if (intent == null) throw new BusinessException("Avatar upload expired or was already used.");
        String[] parts = intent.split("\\|", 3);
        long size = Long.parseLong(parts[0]);
        String mime = parts[1], key = parts[2];
        if (!AvatarStorageKeys.staging(userId, uploadId.toString(), AvatarPolicy.extension(mime)).equals(key))
            throw new BusinessException("Avatar upload belongs to a previous storage configuration.");
        try (var object = client.getObject(GetObjectRequest.builder().bucket(bucket).key(key).build())) {
            if (object.response().contentLength() != size || !mime.equals(object.response().contentType()))
                throw new BusinessException("Avatar metadata does not match the upload.");
            byte[] content = object.readNBytes(AvatarPolicy.MAX_BYTES + 1);
            if (content.length != size) throw new BusinessException("Avatar size does not match the upload.");
            AvatarPolicy.validate(content, mime);
            String finalKey = AvatarStorageKeys.confirmed(userId, UUID.randomUUID(), AvatarPolicy.extension(mime));
            client.copyObject(CopyObjectRequest.builder().bucket(bucket).key(finalKey).copySource(bucket + "/" + key)
                    .copySourceIfMatch(object.response().eTag()).build());
            String url = storage.generateFileUrl(finalKey);
            redis.opsForValue().set(CONFIRMED + userId + ":" + url, finalKey, Duration.ofHours(24));
            redis.opsForZSet().add(CLEANUP, finalKey, System.currentTimeMillis() + Duration.ofHours(24).toMillis());
            client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
            // Keep staging cleanup scheduled until the signed PUT expires, including a replayed PUT.
            return url;
        } catch (BusinessException failure) { throw failure; }
        catch (Exception failure) { throw new BusinessException("Could not verify avatar upload."); }
    }

    public void assertConfirmed(UUID userId, String currentUrl, String nextUrl) {
        if (nextUrl == null || nextUrl.isBlank() || nextUrl.equals(currentUrl)) return;
        if (!nextUrl.startsWith(AvatarStorageKeys.ACCESS_ROUTE + userId + "/"))
            throw new BusinessException("Avatar must be uploaded and verified for your account.");
        if (!Boolean.TRUE.equals(redis.hasKey(CONFIRMED + userId + ":" + nextUrl)))
            throw new BusinessException("Avatar must be uploaded and verified for your account.");
    }

    public String authorizeRead(UUID actorId, UUID userId, String fileName) {
        final String key;
        try { key = AvatarStorageKeys.readKey(userId, fileName); }
        catch (IllegalArgumentException invalid) { throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND); }
        String reference = storage.generateFileUrl(key);
        boolean current = profiles.findByUserId(userId).map(profile -> reference.equals(profile.getAvatarUrl())).orElse(false);
        boolean ownPreview = actorId.equals(userId) && Boolean.TRUE.equals(redis.hasKey(CONFIRMED + userId + ":" + reference));
        if (!current && !ownPreview) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND);
        return storage.generateAvatarReadUrl(key);
    }

    @Scheduled(fixedDelay = 60000)
    public void cleanup() {
        var keys = redis.opsForZSet().rangeByScore(CLEANUP, 0, System.currentTimeMillis(), 0, 50);
        if (keys == null) return;
        for (String key : keys) {
            try {
                if (!key.startsWith(AvatarStorageKeys.USER_PREFIX) && !key.startsWith(AvatarStorageKeys.STAGING_PREFIX)) {
                    redis.opsForZSet().remove(CLEANUP, key);
                    continue;
                }
                boolean inUse = key.startsWith(AvatarStorageKeys.USER_PREFIX) && profiles.findByUserId(AvatarStorageKeys.owner(key))
                        .map(profile -> storage.generateFileUrl(key).equals(profile.getAvatarUrl())).orElse(false);
                if (!inUse) client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
                redis.opsForZSet().remove(CLEANUP, key);
            } catch (Exception failure) { /* Keep cleanup work for retry; never log URLs or provider credentials. */ }
        }
    }
}
