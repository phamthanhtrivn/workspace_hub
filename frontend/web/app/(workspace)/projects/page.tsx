"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ChevronRight, Settings } from "lucide-react";
import CreateProjectDialog from "@/features/project/components/dialogs/create-project-dialog";
import ProjectSettingsDialog from "@/features/project/components/dialogs/project-settings-dialog";
import { Avatar } from "@/features/project/components/ui/avatar-stack";
import { ProjectStatusBadge } from "@/features/project/components/ui/status-badge";
import {
  useArchiveProject,
  useCreateProject,
  useProjects,
  useUpdateProject,
} from "@/features/project/hooks/use-projects";
import type { CreateProjectPayload } from "@/features/project/api/project.api";
import { toast } from "sonner";
import {
  PROJECT_FILTER_TABS,
  PROJECT_SEARCH_DEBOUNCE_MS,
  PROJECTS_PER_PAGE,
} from "@/features/project/constants/project.constants";
import {
  ProjectRole,
  ProjectStatus,
  type Project,
} from "@/features/project/types/project";
import type { ProjectSettingsPayload } from "@/features/project/project-settings-actions";
import { useDebouncedValue } from "@/features/project/hooks/use-debounced-value";
import { getProjectIdSuffix } from "@/features/project/utils/project-id.utils";
import { useAppSelector } from "@/store/store";
import { Button } from "@/components/ui/button";
import { CustomTabs } from "@/components/ui/custom/custom-tabs";
import { ProjectSearchInput } from "@/features/project/components/ui/project-form-controls";
import { DocumentsPagination } from "@/features/documents/components/ui/documents-pagination";

const PROJECT_FILTER_OPTIONS = PROJECT_FILTER_TABS.map((tab) => ({
  value: tab.key,
  label: tab.label,
}));

type ProjectFilter = (typeof PROJECT_FILTER_TABS)[number]["key"];

export default function ProjectsPage() {
  const router = useRouter();
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const [activeFilter, setActiveFilter] = useState<ProjectFilter>(
    ProjectStatus.ACTIVE,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebouncedValue(
    searchQuery.trim(),
    PROJECT_SEARCH_DEBOUNCE_MS,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const projectListQuery = useMemo(
    () => ({
      page: currentPage,
      limit: PROJECTS_PER_PAGE,
      search: debouncedSearchQuery || undefined,
      status: activeFilter === "ALL" ? undefined : activeFilter,
    }),
    [activeFilter, currentPage, debouncedSearchQuery],
  );
  const {
    data: projectList,
    isFetching,
    isLoading,
    isError,
  } = useProjects(projectListQuery);
  const projects = projectList?.data ?? [];
  const paginationMeta = projectList?.meta;
  const createProjectMutation = useCreateProject();
  const selectedProjectId = selectedProject?.id ?? "";
  const updateProjectMutation = useUpdateProject(selectedProjectId);
  const archiveProjectMutation = useArchiveProject(selectedProjectId);
  const hasSearchQuery = Boolean(debouncedSearchQuery);
  const emptyStateTitle = hasSearchQuery
    ? "No matching projects found"
    : activeFilter === "ALL"
      ? "No projects yet"
      : activeFilter === ProjectStatus.ACTIVE
        ? "No active projects found"
        : activeFilter === ProjectStatus.ON_HOLD
          ? "No on hold projects found"
          : "No completed projects found";
  const emptyStateDescription = hasSearchQuery
    ? "Try adjusting your search or project status filter."
    : activeFilter === "ALL"
      ? "Get started by creating your first team project."
      : activeFilter === ProjectStatus.ACTIVE
        ? "Create a new project or switch to All Projects to see everything."
        : "Switch to another status or All Projects to see more projects.";
  const showEmptyCreateAction =
    !hasSearchQuery &&
    (activeFilter === "ALL" || activeFilter === ProjectStatus.ACTIVE);

  const handleFilterChange = (filter: ProjectFilter) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleCreateProject = async (payload: CreateProjectPayload) => {
    try {
      await createProjectMutation.mutateAsync(payload);
      toast.success("Project created successfully");
      setShowCreate(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create project",
      );
      throw error;
    }
  };

  const handleSaveProjectSettings = async (
    payload: ProjectSettingsPayload,
  ) => {
    try {
      await updateProjectMutation.mutateAsync(payload);
      setSelectedProject(null);
      toast.success("Project settings updated");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update project settings",
      );
    }
  };

  const handleArchiveProject = async () => {
    try {
      await archiveProjectMutation.mutateAsync();
      setSelectedProject(null);
      toast.success("Project archived");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to archive project",
      );
    }
  };

  return (
    <div className="flex-1 px-8 py-6 max-w-7xl mx-auto w-full">
      {/* Breadcrumb & Title */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Link href="/dashboard" className="hover:text-blue-600 transition">
          Workspace
        </Link>
        <ChevronRight className="h-3 w-3 text-slate-400" />
        <span className="text-slate-700">Projects</span>
      </div>

      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#172B4D]">
            Projects
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your projects, track tasks, and collaborate with team members.
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-[#0052CC] hover:bg-[#0747A6] px-4 py-2 text-sm font-semibold text-white shadow-xs transition duration-150 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Create Project
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3">
        <CustomTabs
          value={activeFilter}
          options={PROJECT_FILTER_OPTIONS}
          onChange={handleFilterChange}
          ariaLabel="Filter projects by status"
          className="max-w-full overflow-x-auto"
        />

        {/* Search */}
        <ProjectSearchInput
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search projects..."
          ariaLabel="Search projects"
          className="w-full flex-none sm:w-64"
        />
      </div>

      {/* Main Table */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        {isLoading ? (
          <div className="divide-y divide-slate-100">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-6 py-4.5 animate-pulse bg-white"
              >
                <div className="h-10 w-10 rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-slate-100" />
                  <div className="h-3 w-1/4 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-sm font-semibold text-red-500">
            Failed to load projects. Please try refreshing the page.
          </div>
        ) : projects.length > 0 ? (
          <>
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3 font-semibold">Name</th>
                  <th className="px-6 py-3 font-semibold">Owner</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold w-40">Progress</th>
                  <th className="px-6 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((project) => {
                  const owner =
                    project.members.find((m) => m.role === ProjectRole.ADMIN) ||
                    project.members[0];
                  const totalTasks = project.totalTaskCount;
                  const doneTasks = project.completedTaskCount;
                  const progress =
                    totalTasks > 0
                      ? Math.round((doneTasks / totalTasks) * 100)
                      : 0;
                  const projectIdSuffix = getProjectIdSuffix(project.id);

                  return (
                    <tr
                      key={project.id}
                      role="link"
                      tabIndex={0}
                      aria-label={`Open ${project.name}`}
                      onClick={() => router.push(`/projects/${project.id}`)}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          event.target === event.currentTarget
                        ) {
                          event.preventDefault();
                          router.push(`/projects/${project.id}`);
                        }
                      }}
                      className="group cursor-pointer transition duration-150 hover:bg-slate-50/70 focus-visible:bg-blue-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0052CC]/30"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl shadow-2xs border border-slate-200 font-semibold"
                            style={{
                              backgroundColor: `${project.color}14`,
                              color: project.color,
                            }}
                          >
                            {project.icon || "📁"}
                          </span>
                          <div className="min-w-0">
                            <span className="block text-sm font-bold text-[#0052CC] group-hover:underline">
                              {project.name}
                            </span>
                            {projectIdSuffix ? (
                              <div className="mt-0.5">
                                <span
                                  className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-500"
                                  title={`Project ID: ${project.id}`}
                                >
                                  {projectIdSuffix}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          {owner ? (
                            <>
                              <Avatar
                                user={{
                                  userId: owner.userId,
                                  displayName: owner.displayName,
                                  avatarUrl: owner.avatarUrl,
                                }}
                                size="xs"
                              />
                              <span className="text-slate-700 font-medium">
                                {owner.displayName}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-400 font-medium">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <ProjectStatusBadge status={project.status} />
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[11px] font-bold text-slate-500">
                            <span>{progress}%</span>
                            <span>
                              {doneTasks}/{totalTasks}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: project.color || "#0052CC",
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {project.ownerId === currentUserId ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title="Project Settings"
                            aria-label={`Open settings for ${project.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedProject(project);
                            }}
                            className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <DocumentsPagination
              currentPage={paginationMeta?.page ?? currentPage}
              totalPages={paginationMeta?.totalPages ?? 1}
              totalItems={paginationMeta?.total ?? 0}
              itemsPerPage={PROJECTS_PER_PAGE}
              isLoading={isFetching}
              onPageChange={setCurrentPage}
              summaryText={
                paginationMeta
                  ? `Showing ${(paginationMeta.page - 1) * paginationMeta.limit + 1}-${Math.min(
                      paginationMeta.page * paginationMeta.limit,
                      paginationMeta.total,
                    )} of ${paginationMeta.total} projects`
                  : undefined
              }
              className="px-6 pb-4"
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-50 text-3xl border border-slate-100">
              📂
            </div>
            <p className="mt-4 text-sm font-bold text-slate-700">
              {emptyStateTitle}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {emptyStateDescription}
            </p>
            {showEmptyCreateAction ? (
              <Button
                onClick={() => setShowCreate(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#0052CC] hover:bg-[#0747A6] px-4 py-2 text-xs font-semibold text-white transition cursor-pointer"
              >
                Create New Project
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreateProject}
        isSubmitting={createProjectMutation.isPending}
      />

      {selectedProject && selectedProject.ownerId === currentUserId ? (
        <ProjectSettingsDialog
          key={selectedProject.id}
          project={selectedProject}
          open
          isBusy={
            updateProjectMutation.isPending ||
            archiveProjectMutation.isPending
          }
          onClose={() => setSelectedProject(null)}
          onSave={handleSaveProjectSettings}
          onArchive={handleArchiveProject}
        />
      ) : null}
    </div>
  );
}
