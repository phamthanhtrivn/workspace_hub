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
import { cn } from "@/lib/utils";
import { documentsApi } from "@/features/documents/api/documents.api";
import { DownloadStatus } from "@/features/documents/types/documents.enums";
import { FaAngleDown, FaAngleUp } from "react-icons/fa";
import { useAppIntl } from "@/features/i18n/useAppIntl";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DownloadTask {
  id: string;
  folderName: string;
  documentId: string;
  status: DownloadStatus;
  progress: number; // 0-100, -1 = indeterminate
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
  const intl = useAppIntl();
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
          // Auto-remove done tasks after 4s
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

      {/* ── Fixed Bottom Bar (Google Drive style) ── */}
      <div className="fixed bottom-4 right-4 z-50 w-80 rounded-2xl bg-slate-800 shadow-2xl shadow-black/30 border border-slate-700/50 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 hover:bg-slate-700/40 transition-colors cursor-pointer"
          onClick={() => setIsCollapsed((c) => !c)}
        >
          <div className="flex items-center gap-2.5">
            <Download size={15} className="text-blue-400 shrink-0" />
            <span className="text-sm font-bold text-white">
              {activeCount > 0
                ? intl.formatMessage(
                    { id: "documents.downloadingItems" },
                    { count: activeCount },
                  )
                : intl.formatMessage({ id: "documents.downloadCompleted" })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {tasks.some(
              (t) =>
                t.status === DownloadStatus.DONE ||
                t.status === DownloadStatus.ERROR,
            ) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearDone();
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {intl.formatMessage({ id: "documents.clearAll" })}
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCollapsed((c) => !c);
              }}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors text-xs font-bold cursor-pointer"
            >
              {isCollapsed ? <FaAngleUp /> : <FaAngleDown />}
            </button>
          </div>
        </div>

        {/* Task List */}
        {!isCollapsed && (
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-700/40">
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
  const intl = useAppIntl();
  const isIndeterminate = task.progress === -1;

  return (
    <div className="px-4 py-3 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FolderArchive size={14} className="text-amber-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-200 truncate max-w-[180px]">
            {task.folderName}.zip
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {task.status === DownloadStatus.DONE && (
            <CheckCircle2 size={14} className="text-green-400" />
          )}
          {task.status === DownloadStatus.ERROR && (
            <AlertCircle size={14} className="text-red-400" />
          )}
          {(task.status === DownloadStatus.DONE ||
            task.status === DownloadStatus.ERROR) && (
            <button
              onClick={() => onRemove(task.id)}
              aria-label={intl.formatMessage({ id: "documents.removeDownload" })}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {(task.status === DownloadStatus.DOWNLOADING ||
        task.status === DownloadStatus.QUEUED) && (
        <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
          {isIndeterminate ? (
            <div className="h-full bg-blue-500 rounded-full animate-pulse w-1/2" />
          ) : (
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${task.progress}%` }}
            />
          )}
        </div>
      )}
      {task.status === DownloadStatus.ERROR && (
        <p className="text-[10px] text-red-400 font-medium truncate">
          {task.error}
        </p>
      )}
    </div>
  );
}
