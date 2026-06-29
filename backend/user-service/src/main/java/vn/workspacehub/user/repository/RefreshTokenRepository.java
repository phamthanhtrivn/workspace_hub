package vn.workspacehub.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.workspacehub.user.entity.RefreshToken;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHashAndRevokedFalse(String tokenHash);

    List<RefreshToken> findByUserIdAndRevokedFalseOrderByCreatedAtDesc(UUID userId);
    
    Optional<RefreshToken> findByIdAndUserIdAndRevokedFalse(UUID id, UUID userId);
}

