package vn.workspacehub.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Repository;
import vn.workspacehub.user.entity.User;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    @Query("SELECT u.id FROM User u WHERE u.email = :email AND u.status = vn.workspacehub.user.enums.UserStatus.ACTIVE")
    Optional<UUID> findActiveUserIdByEmail(@Param("email") String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findForUpdateById(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.email = :email")
    Optional<User> findForUpdateByEmail(@Param("email") String email);

    boolean existsByEmail(String email);

    Optional<User> findUserByEmail(String email);

    List<User> findByEmailContainingIgnoreCase(String email);

    List<User> findTop20ByEmailContainingIgnoreCaseOrProfileFullNameContainingIgnoreCase(
            String email,
            String fullName);

    List<User> findByEmailIn(List<String> emails);
}
