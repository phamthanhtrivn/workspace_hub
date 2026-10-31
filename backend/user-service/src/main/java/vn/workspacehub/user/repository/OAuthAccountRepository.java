package vn.workspacehub.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.workspacehub.user.entity.OAuthAccount;
import vn.workspacehub.user.enums.OAuthProvider;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OAuthAccountRepository extends JpaRepository<OAuthAccount, UUID> {
    @org.springframework.data.jpa.repository.Query("SELECT o.user.id FROM OAuthAccount o WHERE o.provider = :provider AND o.providerUserId = :subject")
    Optional<UUID> findUserIdByProviderAndSubject(
            @org.springframework.data.repository.query.Param("provider") OAuthProvider provider,
            @org.springframework.data.repository.query.Param("subject") String subject);
    Optional<OAuthAccount> findByProviderAndProviderUserId(OAuthProvider provider, String providerUserId);
}
