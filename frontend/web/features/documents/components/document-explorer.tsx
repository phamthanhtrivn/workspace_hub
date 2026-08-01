"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../api/documents.api";
import {
  DocumentItem,
  ViewLayout,
  DocumentSortBy,
} from "../types/documents.types";
import {
  DocumentItemType,
  DocumentViewType,
  UploadState,
  NavigationLabel,
} from "../types/documents.enums";
import { Folder } from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import FolderPickerModal from "./folder-picker-modal";
import ShimmerLoader from "./shimmer-loader";
import DetailsPanel from "./details-panel";
import ExplorerToolbar from "./explorer-toolbar";
import UploadProgress from "./upload-progress";
import ExplorerBreadcrumbs from "./explorer-breadcrumbs";
import GridView from "./grid-view";
import ListView from "./list-view";
import { ITEMS_PER_PAGE } from "../types/documents.constants";
import { cn } from "@/lib/utils";

interface DocumentExplorerProps {
  currentFolderId: string | null;
  onNavigate: (folderId: string | null, folderName?: string) => void;
  activeView: DocumentViewType;
  path: { id: string | null; name: string }[];
  setPath: React.Dispatch<
    React.SetStateAction<{ id: string | null; name: string }[]>
  >;
}

function DocumentExplorer({
  currentFolderId,
  onNavigate,
  activeView,
  path,
  setPath,
}: DocumentExplorerProps) {
  const queryClient = useQueryClient();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [viewLayout, setViewLayout] = useState<ViewLayout>(ViewLayout.GRID);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeDetailsItemId, setActiveDetailsItemId] = useState<string | null>(
    null,
  );
  const [sortBy, setSortBy] = useState<DocumentSortBy>(DocumentSortBy.LATEST);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);

  // Uploading state
  const [uploadState, setUploadState] = useState<UploadState>(UploadState.IDLE);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState("");

  // Focus Search Input with Ref
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  // Filter out directories/files based on simple search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch items based on current context
  const { data: documentsData, isLoading } = useQuery({
    queryKey: [
      "documents",
      currentFolderId,
      activeView,
      currentPage,
      sortBy,
      debouncedSearchQuery,
    ],
    queryFn: () => {
      const fetchParams = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        sortBy,
        search: debouncedSearchQuery,
      };

      if (activeView === DocumentViewType.SHARED && !currentFolderId) {
        return documentsApi.getSharedDocuments(fetchParams);
      }
      return documentsApi.getDocuments({
        ...fetchParams,
        folderId: currentFolderId || undefined,
        starred:
          activeView === DocumentViewType.STARRED && !currentFolderId
            ? true
            : undefined,
        archived: activeView === DocumentViewType.TRASH ? true : undefined,
      });
    },
  });

  const items = documentsData?.data || [];
  const totalItems = documentsData?.meta?.totalItems || 0;
  const totalPages = documentsData?.meta?.totalPages || 0;
  const safeCurrentPage = Math.min(
    Math.max(1, currentPage),
    Math.max(1, totalPages),
  );

  const activeDetailsItem = useMemo(() => {
    return items.find((item) => item.id === activeDetailsItemId) || null;
  }, [items, activeDetailsItemId]);

  const movingItem = useMemo(() => {
    return items.find((item) => item.id === movingItemId) || null;
  }, [items, movingItemId]);

  const initialFolderIdForMove = movingItem?.parentFolderId || null;
  const initialPathForMove = useMemo(() => {
    if (!movingItem) return undefined;
    if (movingItem.parentFolderId === currentFolderId) {
      return path;
    }
    if (movingItem.parentFolderId) {
      return [
        { id: null, name: NavigationLabel.ROOT },
        { id: movingItem.parentFolderId, name: NavigationLabel.CURRENT_FOLDER },
      ];
    }
    return [{ id: null, name: NavigationLabel.ROOT }];
  }, [movingItem, currentFolderId, path]);

  // Mutations
  const createFolderMutation = useMutation({
    mutationFn: documentsApi.createFolder,
    onSuccess: () => {
      toast.success("Đã tạo thư mục mới");
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Lỗi tạo thư mục");
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      documentsApi.renameItem(id, name),
    onSuccess: () => {
      toast.success("Đã đổi tên");
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Lỗi đổi tên");
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, destId }: { id: string; destId: string | null }) =>
      documentsApi.moveItem(id, destId),
    onSuccess: () => {
      toast.success("Đã di chuyển tài nguyên");
      setIsMoveModalOpen(false);
      setSelectedItemId(null);
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Lỗi di chuyển");
    },
  });

  const starMutation = useMutation({
    mutationFn: ({ id, star }: { id: string; star: boolean }) =>
      star ? documentsApi.starItem(id) : documentsApi.unStarItem(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      archive ? documentsApi.archiveItem(id) : documentsApi.restoreItem(id),
    onSuccess: (data, variables) => {
      toast.success(
        variables.archive ? "Đã chuyển vào thùng rác" : "Đã khôi phục",
      );
      setSelectedItemId(null);
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
      void queryClient.invalidateQueries({ queryKey: ["document-quota"] });
    },
  });

  // Handle uploading file to S3
  const handleUploadFile = useCallback(
    async (file: File) => {
      try {
        setUploadingFileName(file.name);
        setUploadState(UploadState.INITIATING);
        setUploadProgress(0);

        // Upload file directly using the unified API upload client method
        await documentsApi.uploadFile(
          file,
          currentFolderId,
          (percent, state) => {
            setUploadState(state);
            setUploadProgress(percent);
          },
        );

        setUploadState(UploadState.SUCCESS);
        toast.success(`Đã tải lên tệp ${file.name} thành công!`);

        void queryClient.invalidateQueries({ queryKey: ["documents"] });
        void queryClient.invalidateQueries({ queryKey: ["document-quota"] });

        setTimeout(() => {
          setUploadState(UploadState.IDLE);
          setUploadingFileName("");
          setUploadProgress(0);
        }, 2000);
      } catch (err: any) {
        console.error(err);
        setUploadState(UploadState.ERROR);
        const errMsg =
          err.response?.data?.message || err.message || "Lỗi tải lên tệp";
        toast.error(errMsg);
        setTimeout(() => {
          setUploadState(UploadState.IDLE);
        }, 3000);
      }
    },
    [currentFolderId, queryClient],
  );

  // Folder creation trigger
  const handleCreateFolder = useCallback(() => {
    void Swal.fire({
      title: "Thư mục mới",
      input: "text",
      inputPlaceholder: "Nhập tên thư mục...",
      showCancelButton: true,
      confirmButtonText: "Tạo mới",
      cancelButtonText: "Hủy bỏ",
      confirmButtonColor: "var(--color-primary, #3b82f6)",
      inputValidator: (value) => {
        if (!value) {
          return "Tên thư mục không được để trống!";
        }
        return null;
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        createFolderMutation.mutate({
          name: result.value as string,
          parentFolderId: currentFolderId || undefined,
        });
      }
    });
  }, [createFolderMutation, currentFolderId]);

  // Rename trigger
  const handleRename = useCallback(
    (id: string, currentName: string) => {
      void Swal.fire({
        title: "Đổi tên tài nguyên",
        input: "text",
        inputValue: currentName,
        showCancelButton: true,
        confirmButtonText: "Lưu lại",
        cancelButtonText: "Hủy bỏ",
        confirmButtonColor: "var(--color-primary, #3b82f6)",
        inputValidator: (value) => {
          if (!value) {
            return "Tên không được để trống!";
          }
          return null;
        },
      }).then((result) => {
        if (result.isConfirmed && result.value) {
          renameMutation.mutate({ id, name: result.value as string });
        }
      });
    },
    [renameMutation],
  );

  // Move trigger
  const handleOpenMoveModal = useCallback((id: string) => {
    setMovingItemId(id);
    setIsMoveModalOpen(true);
  }, []);

  // Star toggle
  const handleToggleStar = useCallback(
    (id: string, isStarred: boolean) => {
      starMutation.mutate({ id, star: !isStarred });
    },
    [starMutation],
  );

  // Soft delete / Restore
  const handleArchive = useCallback(
    (id: string, archive: boolean) => {
      if (archive) {
        void Swal.fire({
          title: "Xóa tạm tài nguyên?",
          text: "Tập tin/Thư mục sẽ được chuyển vào thùng rác và lưu giữ trong 30 ngày.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Đồng ý",
          cancelButtonText: "Hủy bỏ",
          confirmButtonColor: "#ef4444",
        }).then((result) => {
          if (result.isConfirmed) {
            archiveMutation.mutate({ id, archive: true });
          }
        });
      } else {
        archiveMutation.mutate({ id, archive: false });
      }
    },
    [archiveMutation],
  );

  // Navigation handlers
  const handleFolderClick = useCallback(
    (folder: DocumentItem) => {
      onNavigate(folder.id, folder.name);
      setSelectedItemId(null);
      setActiveDetailsItemId(null);
      setCurrentPage(1);
    },
    [onNavigate],
  );

  const handleBreadcrumbClick = useCallback(
    (index: number) => {
      const p = path[index];
      setPath(path.slice(0, index + 1));
      onNavigate(p.id);
      setSelectedItemId(null);
      setActiveDetailsItemId(null);
      setCurrentPage(1);
    },
    [path, setPath, onNavigate],
  );

  const handleViewDetails = useCallback((id: string) => {
    setActiveDetailsItemId(id);
    setSelectedItemId(id);
  }, []);

  const handleBackToParent = useCallback(() => {
    if (path.length > 1) {
      handleBreadcrumbClick(path.length - 2);
    }
  }, [path.length, handleBreadcrumbClick]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((sort: DocumentSortBy) => {
    setSortBy(sort);
    setCurrentPage(1);
  }, []);

  return (
    <div className="flex-1 flex min-w-0 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden h-[calc(100vh-140px)]">
      {/* Main Explorer Panel */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Search, Action, View Layout Header */}
        <ExplorerToolbar
          searchQuery={searchQuery}
          setSearchQuery={handleSearchChange}
          viewLayout={viewLayout}
          setViewLayout={setViewLayout}
          activeView={currentFolderId ? DocumentViewType.MY_FILES : activeView}
          onCreateFolder={handleCreateFolder}
          onUploadFile={handleUploadFile}
          sortBy={sortBy}
          setSortBy={handleSortChange}
          inputRef={searchInputRef}
        />

        {/* Path Breadcrumbs */}
        {activeView !== DocumentViewType.TRASH && (
          <ExplorerBreadcrumbs
            path={path}
            onBreadcrumbClick={handleBreadcrumbClick}
            onBackToParent={handleBackToParent}
          />
        )}

        {/* Explorer Content */}
        <div
          className="flex-1 overflow-y-auto p-6"
          onClick={() => setSelectedItemId(null)}
        >
          {isLoading ? (
            <ShimmerLoader />
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-400 py-20 animate-in fade-in duration-300">
              <Folder size={64} className="text-slate-200 mb-4" />
              <span className="text-base font-semibold text-slate-700">
                Thư mục trống
              </span>
              <span className="text-xs text-slate-400 font-semibold mt-1">
                Chưa có tập tin hay thư mục nào ở đây.
              </span>
            </div>
          ) : viewLayout === ViewLayout.GRID ? (
            <GridView
              items={items}
              selectedItemId={selectedItemId}
              onSelect={setSelectedItemId}
              onFolderClick={handleFolderClick}
              activeView={activeView}
              activeMenuId={activeMenuId}
              setActiveMenuId={setActiveMenuId}
              onRename={handleRename}
              onMove={handleOpenMoveModal}
              onToggleStar={handleToggleStar}
              onArchive={handleArchive}
              onViewDetails={handleViewDetails}
            />
          ) : (
            <ListView
              items={items}
              selectedItemId={selectedItemId}
              onSelect={setSelectedItemId}
              onFolderClick={handleFolderClick}
              activeView={activeView}
              activeMenuId={activeMenuId}
              setActiveMenuId={setActiveMenuId}
              onRename={handleRename}
              onMove={handleOpenMoveModal}
              onToggleStar={handleToggleStar}
              onArchive={handleArchive}
              onViewDetails={handleViewDetails}
            />
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-6">
              <span className="text-xs font-semibold text-slate-400">
                Hiển thị {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1} -{" "}
                {Math.min(safeCurrentPage * ITEMS_PER_PAGE, totalItems)} trên
                tổng số {totalItems} tài nguyên
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={safeCurrentPage === 1}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-xs hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Trang trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "rounded-xl px-3 py-1.5 text-xs font-black transition-all cursor-pointer",
                        page === safeCurrentPage
                          ? "bg-[var(--color-primary)] text-white shadow-md shadow-blue-500/10"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      {page}
                    </button>
                  ),
                )}
                <button
                  disabled={safeCurrentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-xs hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Trang sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slide-in Details Panel */}
      {activeDetailsItem && (
        <DetailsPanel
          item={activeDetailsItem}
          onClose={() => setActiveDetailsItemId(null)}
          onRename={() =>
            handleRename(activeDetailsItem.id, activeDetailsItem.name)
          }
          onMove={() => handleOpenMoveModal(activeDetailsItem.id)}
          onToggleStar={() =>
            handleToggleStar(activeDetailsItem.id, activeDetailsItem.isStarred)
          }
          onArchive={(archive) => handleArchive(activeDetailsItem.id, archive)}
        />
      )}

      {/* Moving Item Modal */}
      {isMoveModalOpen && movingItemId && (
        <FolderPickerModal
          isOpen={isMoveModalOpen}
          onClose={() => setIsMoveModalOpen(false)}
          currentItemId={movingItemId}
          initialFolderId={initialFolderIdForMove}
          initialPath={initialPathForMove}
          onSelect={(destId) =>
            moveMutation.mutate({ id: movingItemId, destId })
          }
        />
      )}

      {/* Floating Upload Progress Box */}
      <UploadProgress
        uploadState={uploadState}
        uploadProgress={uploadProgress}
        uploadingFileName={uploadingFileName}
      />
    </div>
  );
}

export default React.memo(DocumentExplorer);
