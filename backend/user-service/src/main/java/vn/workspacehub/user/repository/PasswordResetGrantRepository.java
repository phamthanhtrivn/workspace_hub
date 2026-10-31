package vn.workspacehub.user.repository;

import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.workspacehub.user.entity.PasswordResetGrant;

public interface PasswordResetGrantRepository extends JpaRepository<PasswordResetGrant, UUID> {
    @Modifying
    @Query("UPDATE PasswordResetGrant g SET g.consumedAt = :now WHERE g.id = :id AND g.userId = :userId AND g.consumedAt IS NULL AND g.expiresAt > :now")
    int consume(@Param("id") UUID id, @Param("userId") UUID userId, @Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE PasswordResetGrant g SET g.consumedAt = :now WHERE g.userId = :userId AND g.consumedAt IS NULL")
    int invalidateForUser(@Param("userId") UUID userId, @Param("now") LocalDateTime now);
}
