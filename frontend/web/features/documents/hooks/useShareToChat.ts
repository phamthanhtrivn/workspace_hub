"use client";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { store, useAppSelector } from "@/store/store";
import {
  useSpacesQuery,
  useSpaceChannelsQuery,
  useDirectMessagesQuery,
} from "@/features/chat/hooks/useChatQueries";
import { SpaceRole } from "@/features/chat/types/chat.enums";
import { getProjects } from "@/features/project/api/project.api";
import { getProjectTasks } from "@/features/project/api/task.api";
import { fetchAllPages } from "@/features/project/api/pagination";
import { getProjectPermissions } from "@/features/project/project-permissions";
import { invalidateProjectChange } from "@/features/project/api/project-invalidation";
import { getActionErrorMessage } from "@/lib/permission-feedback";
import { fileCopyApi } from "../api/file-copy.api";
import type { DocumentItem } from "../types/documents.types";
import {
  shareDocumentToChat,
  type DocumentChatShareTarget,
} from "../utils/share-document-to-chat";
import { DocumentItemType } from "../types/documents.enums";
export function useShareToChat({
  item,
  onSuccess,
  enabled = true,
}: {
  item: DocumentItem | null;
  onSuccess: () => void;
  projectId?: string;
  enabled?: boolean;
}) {
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const [activeTab, setActiveTab] =
    useState<DocumentChatShareTarget["type"]>("channel");
  const [chosenChatId, setSelectedChatId] = useState("");
  const [chosenSpaceId, setSelectedSpaceId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [introMessage, setIntroMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const sharing = useRef(false);
  const queryClient = useQueryClient();
  const actor = enabled && item ? currentUserId : null;
  const { data: spaces = [] } = useSpacesQuery(actor);
  const selectedSpaceId = spaces.some((space) => space.id === chosenSpaceId)
    ? chosenSpaceId
    : (spaces[0]?.id ?? "");
  const { data: channelsData } = useSpaceChannelsQuery(
    selectedSpaceId,
    undefined,
    { enabled: !!actor && activeTab === "channel" && !!selectedSpaceId },
  );
  const channels = (channelsData?.channels ?? []).filter((channel) => {
    const member = channel.members?.find(
      (member) => member.userId === currentUserId,
    );

    return (
      !!member &&
      (member.role !== SpaceRole.MEMBER ||
        channel.setting?.allowSendMessage !== false)
    );
  });
  const { data: conversations } = useDirectMessagesQuery(
    actor && activeTab === "direct" ? actor : null,
  );
  const directConversations = conversations?.directMessages ?? [];
  const projects = useQuery({
    queryKey: ["document-copy-targets", currentUserId, "projects"],
    enabled: !!actor && activeTab === "project",
    staleTime: 30000,
    gcTime: 300000,
    queryFn: () =>
      fetchAllPages(async (page, limit) => {
        const result = await getProjects({ page, limit });

        return { items: result.data, meta: result.meta };
      }),
  });
  const writableProjects = (projects.data ?? []).filter(
    (project) =>
      getProjectPermissions(project, project.members, currentUserId)
        .canEditDocuments,
  );
  const meetings = useQuery({
    queryKey: ["document-copy-targets", currentUserId, "meetings"],
    queryFn: fileCopyApi.meetings,
    enabled: !!actor && activeTab === "meeting",
    staleTime: 0,
    retry: false,
  });
  const tasks = useQuery({
    queryKey: ["document-copy-targets", currentUserId, "tasks", chosenChatId],
    queryFn: () => getProjectTasks(chosenChatId),
    enabled:
      !!actor &&
      activeTab === "project" &&
      writableProjects.some((project) => project.id === chosenChatId),
    staleTime: 30000,
  });
  const project = writableProjects.find(
    (project) => project.id === chosenChatId,
  );
  const attachableTasks = (tasks.data ?? []).filter(
    (task) =>
      project &&
      !task.completedAt &&
      getProjectPermissions(
        project,
        project.members,
        currentUserId,
      ).canEditTask(task),
  );
  const availableIds =
    activeTab === "channel"
      ? channels.map((channel) => channel.id)
      : activeTab === "direct"
        ? directConversations.map((conversation) => conversation.id)
        : activeTab === "meeting"
          ? (meetings.data ?? []).map((meeting) => meeting.id)
          : writableProjects.map((project) => project.id);
  const selectedChatId = availableIds.includes(chosenChatId)
    ? chosenChatId
    : "";
  const changeTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSelectedChatId("");
    setTaskId("");
    setError("");
  };
  const handleShare = async () => {
    if (!item || !selectedChatId || !currentUserId || sharing.current) return;
    sharing.current = true;
    setIsSubmitting(true);
    setError("");
    const assertCurrentActor = () => {
      if (store.getState().auth.userId !== currentUserId)
        throw new Error("Your account changed. Reopen sharing.");
    };
    try {
      await shareDocumentToChat({
        documentId: item.id,
        currentUserId,
        introMessage,
        isFolder: item.type === DocumentItemType.FOLDER,
        assertCurrentActor,
        target: {
          type: activeTab,
          chatId: selectedChatId,
          taskId:
            activeTab === "project" &&
            attachableTasks.some((task) => task.id === taskId)
              ? taskId
              : undefined,
          joinToken: meetings.data?.find(
            (meeting) => meeting.id === selectedChatId,
          )?.joinToken,
        },
      });
      assertCurrentActor();
      if (activeTab === "project")
        await invalidateProjectChange(queryClient, {
          projectId: selectedChatId,
          resource: taskId ? "TASK_DOCUMENT" : "DOCUMENT",
          taskId: taskId || undefined,
        });
      toast.success(
        activeTab === "project"
          ? "File added to Project Documents"
          : "Attachment sent",
      );
      onSuccess();
    } catch (cause) {
      if (store.getState().auth.userId === currentUserId)
        setError(
          getActionErrorMessage(
            cause,
            cause instanceof Error
              ? cause.message
              : "Unable to send this copy. Try again.",
          ),
        );
    } finally {
      sharing.current = false;
      setIsSubmitting(false);
    }
  };

  return {
    activeTab,
    changeTab,
    selectedChatId,
    setSelectedChatId,
    selectedSpaceId,
    setSelectedSpaceId,
    taskId,
    setTaskId,
    introMessage,
    setIntroMessage,
    isSubmitting,
    error,
    spaces,
    channels,
    directConversations,
    writableProjects,
    meetings,
    tasks: attachableTasks,
    handleShare,
    currentUserId,
    targetError: projects.isError || meetings.isError || tasks.isError,
  };
}
