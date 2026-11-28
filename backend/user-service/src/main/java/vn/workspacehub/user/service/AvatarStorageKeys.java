package vn.workspacehub.user.service;

import java.util.UUID;

public final class AvatarStorageKeys {
    public static final String STAGING_PREFIX = "avatars/staging/";
    public static final String USER_PREFIX = "avatars/users/";
    public static final String API_PATH = "/api/users/avatars";
    public static final String ACCESS_ROUTE = API_PATH + "/";
    public static final int READ_TTL_SECONDS = 120;
    private AvatarStorageKeys() {}

    public static String staging(UUID userId, String uploadId, String extension) {
        return STAGING_PREFIX + userId + "/" + uploadId + extension;
    }

    public static String confirmed(UUID userId, UUID fileId, String extension) {
        return USER_PREFIX + userId + "/" + fileId + extension;
    }

    public static String reference(String key) {
        return key.startsWith(USER_PREFIX) ? ACCESS_ROUTE + key.substring(USER_PREFIX.length()) : "";
    }

    public static UUID owner(String key) {
        if (!key.startsWith(USER_PREFIX)) throw new IllegalArgumentException("Invalid avatar key");
        return UUID.fromString(key.substring(USER_PREFIX.length()).split("/", 2)[0]);
    }

    public static String readKey(UUID userId, String fileName) {
        if (!fileName.matches("[a-fA-F0-9-]{36}\\.(jpg|png|webp)")) throw new IllegalArgumentException("Invalid avatar file");
        UUID.fromString(fileName.substring(0, 36));
        return USER_PREFIX + userId + "/" + fileName;
    }
}
