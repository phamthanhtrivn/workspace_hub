"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
} from "react";
import {
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  FolderArchive,
} from "lucide-react";
import { documentsApi } from "@/features/documents/api/documents.api";
import { DownloadStatus } from "@/features/documents/types/documents.enums";
import { FaAngleDown, FaAngleUp } from "react-icons/fa";
import { Button } from "@/components/ui/button";


// ─── Types ────────────────────────────────────────────────────────────────────

export interface DownloadTask {
  id: string;
  folderName: string;
  documentId: string;
  status: DownloadStatus;
  progress: number;
  error?: string;
}

interface DownloadQueueContextValue {
  enqueueDownload: (
    documentId: string,
    folderName: string,
    isPublic?: boolean,
  ) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const DownloadQueueContext = createContext<DownloadQueueContextValue>({
  enqueueDownload: () => {},
});

export function useDownloadQueue() {
  return useContext(DownloadQueueContext);
}

// ─── Provider + Progress Bar ──────────────────────────────────────────────────

export function DownloadQueueProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const taskIdRef = useRef(0);

  const updateTask = useCallback((id: string, patch: Partial<DownloadTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const enqueueDownload = useCallback(
    (documentId: string, folderName: string, isPublic?: boolean) => {
      const taskId = `dl-${++taskIdRef.current}`;
      const newTask: DownloadTask = {
        id: taskId,
        folderName,
        documentId,
        status: DownloadStatus.QUEUED,
        progress: 0,
      };
      setTasks((prev) => [...prev, newTask]);
      setIsCollapsed(false);

      // Start download
      updateTask(taskId, { status: DownloadStatus.DOWNLOADING });

      const downloadPromise = isPublic
        ? documentsApi.downloadPublicFolderAsZip(
            documentId,
            folderName,
            (percent) => {
              updateTask(taskId, {
                progress: percent,
                status: DownloadStatus.DOWNLOADING,
              });
            },
          )
        : documentsApi.downloadFolderAsZip(
            documentId,
            folderName,
            (percent) => {
              updateTask(taskId, {
                progress: percent,
                status: DownloadStatus.DOWNLOADING,
              });
            },
          );

      downloadPromise
        .then(() => {
          updateTask(taskId, { status: DownloadStatus.DONE, progress: 100 });
          setTimeout(() => {
            setTasks((prev) => prev.filter((t) => t.id !== taskId));
          }, 4000);
        })
        .catch((err: Error) => {
          updateTask(taskId, {
            status: DownloadStatus.ERROR,
            error: err.message,
          });
        });
    },
    [updateTask],
  );

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const clearDone = () => {
    setTasks((prev) =>
      prev.filter(
        (t) =>
          t.status !== DownloadStatus.DONE && t.status !== DownloadStatus.ERROR,
      ),
    );
  };

  if (tasks.length === 0) {
    return (
      <DownloadQueueContext.Provider value={{ enqueueDownload }}>
        {children}
      </DownloadQueueContext.Provider>
    );
  }

  const activeCount = tasks.filter(
    (t) =>
      t.status === DownloadStatus.DOWNLOADING ||
      t.status === DownloadStatus.QUEUED,
  ).length;

  return (
    <DownloadQueueContext.Provider value={{ enqueueDownload }}>
      {children}

      {/* ── Fixed Bottom Bar ── */}
      <div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-1.5rem)] rounded-panel bg-card text-card-foreground border border-input overflow-hidden animate-in slide-in-from-bottom-4 duration-200 shadow-panel">
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors cursor-pointer"
          onClick={() => setIsCollapsed((c) => !c)}
        >
          <div className="flex items-center gap-2.5">
            <Download size={15} className="text-info-content shrink-0" />
            <span className="text-sm font-semibold text-foreground">
              {activeCount > 0
                ? `Downloading ${activeCount} item${activeCount > 1 ? "s" : ""}...`
                : "Download completed"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {tasks.some(
              (t) =>
                t.status === DownloadStatus.DONE ||
                t.status === DownloadStatus.ERROR,
            ) && (
              <Button variant="unstyled"
                onClick={(e) => {
                  e.stopPropagation();
                  clearDone();
                }}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded hover:bg-muted transition-colors cursor-pointer"
              >
                Clear all
              </Button>
            )}
            <Button variant="unstyled"
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed((c) => !c);
              }}
              className="w-6 h-6 flex items-center justify-center rounded-control hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs font-semibold cursor-pointer"
            >
              {isCollapsed ? <FaAngleUp /> : <FaAngleDown />}
            </Button>
          </div>
        </div>

        {/* Task List */}
        {!isCollapsed && (
          <div className="max-h-56 overflow-y-auto divide-y divide-input/40">
            {tasks.map((task) => (
              <DownloadTaskRow
                key={task.id}
                task={task}
                onRemove={removeTask}
              />
            ))}
          </div>
        )}
      </div>
    </DownloadQueueContext.Provider>
  );
}

// ─── Single Task Row ──────────────────────────────────────────────────────────

function DownloadTaskRow({
  task,
  onRemove,
}: {
  task: DownloadTask;
  onRemove: (id: string) => void;
}) {
  const isIndeterminate = task.progress === -1;

  return (
    <div className="px-4 py-3 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FolderArchive size={14} className="text-warning-content shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground truncate max-w-[180px]">
            {task.folderName}.zip
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {task.status === DownloadStatus.DONE && (
            <CheckCircle2 size={14} className="text-success-content" />
          )}
          {task.status === DownloadStatus.ERROR && (
            <AlertCircle size={14} className="text-destructive-content" />
          )}
          {(task.status === DownloadStatus.DONE ||
            task.status === DownloadStatus.ERROR) && (
            <Button variant="unstyled"
              onClick={() => onRemove(task.id)}
              aria-label="Remove download"
              className="text-muted-foreground hover:text-muted-foreground transition-colors"
            >
              <X size={13} />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {(task.status === DownloadStatus.DOWNLOADING ||
        task.status === DownloadStatus.QUEUED) && (
        <div className="h-1 w-full bg-muted ring-1 ring-inset ring-input rounded-full overflow-hidden">
          {isIndeterminate ? (
            <div className="h-full bg-link rounded-full animate-pulse w-1/2" />
          ) : (
            <div
              className="h-full bg-link rounded-full transition-all duration-200"
              style={{ width: `${task.progress}%` }}
            />
          )}
        </div>
      )}
      {task.status === DownloadStatus.ERROR && (
        <p className="text-xs text-destructive-content font-medium truncate">
          {task.error}
        </p>
      )}
    </div>
  );
}
