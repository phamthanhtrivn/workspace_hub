"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Settings } from "lucide-react";
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
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

const PROJECT_FILTER_OPTIONS = PROJECT_FILTER_TABS.map((tab) => ({
  value: tab.key,
  label: tab.label,
}));

type ProjectFilter = (typeof PROJECT_FILTER_TABS)[number]["key"];

export default function ProjectsScreen() {
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
  const tableViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tableViewportRef.current) tableViewportRef.current.scrollTop = 0;
  }, [activeFilter, currentPage, debouncedSearchQuery]);

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
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-8">

      <div className="mt-2 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-page-title font-semibold tracking-tight text-foreground">
            Projects
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your projects, track tasks, and collaborate with team members.
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-control bg-primary hover:bg-primary-hover px-4 py-2 text-sm font-semibold text-primary-foreground transition duration-150"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Create Project
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="mt-6 flex min-w-0 shrink-0 flex-col gap-3 border-b border-border pb-3 md:flex-row md:items-center md:justify-between">
        <CustomTabs
          value={activeFilter}
          options={PROJECT_FILTER_OPTIONS}
          onChange={handleFilterChange}
          ariaLabel="Filter projects by status"
          className="min-w-0 max-w-full overflow-x-auto"
        />

        {/* Search */}
        <ProjectSearchInput
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search projects..."
          ariaLabel="Search projects"
          className="w-full flex-none md:w-64"
        />
      </div>

      {/* Main Table */}
      <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-panel border border-border bg-card">
        <div
          ref={tableViewportRef}
          role="region"
          aria-label="Projects table"
          tabIndex={0}
          className="min-h-0 flex-1 overflow-auto overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
        {isLoading ? (
          <div className="divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-6 py-4.5 animate-pulse bg-card"
              >
                <div className="h-10 w-10 rounded-panel bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-muted" />
                  <div className="h-3 w-1/4 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-sm font-semibold text-destructive-content">
            Failed to load projects. Please try refreshing the page.
          </div>
        ) : projects.length > 0 ? (
            <Table unstyled className="w-full min-w-[760px] table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col />
                <col className="w-[26%]" />
                <col className="w-[16%]" />
                <col className="w-[18%]" />
                <col className="w-20" />
              </colgroup>
              <TableHeader unstyled className="sticky top-0 z-10 bg-background">
                <TableRow unstyled className="border-b border-border bg-background text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <TableHead unstyled className="px-6 py-3 font-semibold">Name</TableHead>
                  <TableHead unstyled className="px-6 py-3 font-semibold">Owner</TableHead>
                  <TableHead unstyled className="px-6 py-3 font-semibold">Status</TableHead>
                  <TableHead unstyled className="px-6 py-3 font-semibold">Progress</TableHead>
                  <TableHead unstyled className="px-6 py-3 text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody unstyled className="divide-y divide-border">
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
                    <TableRow unstyled
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
                      className="group cursor-pointer transition duration-150 hover:bg-background focus-visible:bg-info-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <TableCell unstyled className="px-6 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-panel text-xl border border-border font-semibold"
                            style={{
                              backgroundColor: `${project.color}14`,
                              color: "var(--foreground)",
                            }}
                          >
                            {project.icon || "📁"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span title={project.name} className="block truncate text-sm font-semibold text-info-content group-hover:underline">
                              {project.name}
                            </span>
                            {projectIdSuffix ? (
                              <div className="mt-0.5">
                                <span
                                  className="inline-flex rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-muted-foreground"
                                  title={`Project ID: ${project.id}`}
                                >
                                  {projectIdSuffix}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell unstyled className="px-6 py-3.5">
                        <div className="flex min-w-0 items-center gap-2">
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
                              <span title={owner.displayName} className="min-w-0 truncate text-foreground font-medium">
                                {owner.displayName}
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground font-medium">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell unstyled className="px-6 py-3.5">
                        <ProjectStatusBadge status={project.status} />
                      </TableCell>
                      <TableCell unstyled className="px-6 py-3.5">
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                            <span>{progress}%</span>
                            <span>
                              {doneTasks}/{totalTasks}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full ring-1 ring-inset ring-input transition-all duration-200"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: project.color || "var(--chart-1)",
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell unstyled className="px-6 py-3.5 text-right">
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
                            className="h-8 w-8 rounded-control text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-panel bg-background text-3xl border border-border">
              📂
            </div>
            <p className="mt-4 text-sm font-semibold text-foreground">
              {emptyStateTitle}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {emptyStateDescription}
            </p>
            {showEmptyCreateAction ? (
              <Button
                onClick={() => setShowCreate(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-control bg-primary hover:bg-primary-hover px-4 py-2 text-xs font-semibold text-primary-foreground transition cursor-pointer"
              >
                Create New Project
              </Button>
            ) : null}
          </div>
        )}
        </div>
        {!isLoading && !isError && projects.length > 0 && (
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
            className="shrink-0 px-4 py-4 sm:px-6"
          />
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
