package vn.workspacehub.project.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.workspacehub.project.entity.ProjectSetting;

import java.util.UUID;

public interface ProjectSettingRepository extends JpaRepository<ProjectSetting, UUID> {
}
