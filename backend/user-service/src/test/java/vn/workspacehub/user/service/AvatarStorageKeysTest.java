package vn.workspacehub.user.service;

import static org.junit.jupiter.api.Assertions.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AvatarStorageKeysTest {
    @Test void separatesUnverifiedUploadsAndVerifiedAvatarsUnderOnePrefix() {
        UUID user = UUID.randomUUID(), upload = UUID.randomUUID(), file = UUID.randomUUID();
        String staging = AvatarStorageKeys.staging(user, upload.toString(), ".png");
        String confirmed = AvatarStorageKeys.confirmed(user, file, ".png");
        assertTrue(staging.startsWith("avatars/staging/"));
        assertEquals("", AvatarStorageKeys.reference(staging));
        assertEquals(user, AvatarStorageKeys.owner(confirmed));
        assertEquals("/api/users/avatars/" + user + "/" + file + ".png", AvatarStorageKeys.reference(confirmed));
        assertEquals(confirmed, AvatarStorageKeys.readKey(user, file + ".png"));
    }

    @Test void rejectsTraversalAndUnrecognizedFiles() {
        UUID user = UUID.randomUUID();
        assertThrows(IllegalArgumentException.class, () -> AvatarStorageKeys.readKey(user, "../../staging/file.png"));
        assertThrows(IllegalArgumentException.class, () -> AvatarStorageKeys.readKey(user, UUID.randomUUID() + ".svg"));
        assertThrows(IllegalArgumentException.class, () -> AvatarStorageKeys.owner("avatars/staging/" + user));
    }
}
