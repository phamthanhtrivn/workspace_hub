package vn.workspacehub.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.workspacehub.user.entity.AccountSetting;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountSettingRepository extends JpaRepository<AccountSetting, UUID> {
    Optional<AccountSetting> findByUserId(UUID userId);
}
