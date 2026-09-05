"use client";

import { useMeetingRoomChat } from "../../../hooks/useMeetingRoomChat";
import { MeetingMessageEditingBanner } from "../message/meeting-message-editing-banner";
import { MeetingMessageInput } from "../message/meeting-message-input";
import { MeetingMessageList } from "../message/meeting-message-list";

export function MeetingRoomChatPanel({
  joinToken,
  meetingId,
}: {
  joinToken: string;
  meetingId: string;
}) {
  const {
    bottomRef,
    containerRef,
    currentUserId,
    editingMessage,
    handleCancelEdit,
    handleMarkAsRead,
    handleRecallMessage,
    handleStartEdit,
    handleSubmit,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    loadOlderRef,
    messageInputRef,
    messages,
    profilesByUserId,
    reactToMessage,
    readReceipts,
  } = useMeetingRoomChat({
    joinToken,
    meetingId,
  });

  return (
    <div className="mt-4 flex h-[calc(100%-3.5rem)] min-h-0 flex-col overflow-hidden rounded-lg bg-white/6 ring-1 ring-white/8">
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 [scrollbar-width:thin] [scrollbar-color:rgba(148,163,184,0.35)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15"
      >
        <MeetingMessageList
          messages={messages}
          isLoading={isLoading}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          loadOlderRef={loadOlderRef}
          currentUserId={currentUserId}
          profilesByUserId={profilesByUserId}
          readReceipts={readReceipts}
          onReact={reactToMessage}
          onEdit={handleStartEdit}
          onRecall={handleRecallMessage}
          onReadMessage={handleMarkAsRead}
        />
        <div ref={bottomRef} className="h-1" />
      </div>

      <div className="px-3">
        {editingMessage && (
          <MeetingMessageEditingBanner
            editingMessage={editingMessage}
            onCancel={handleCancelEdit}
          />
        )}
      </div>

      <MeetingMessageInput
        ref={messageInputRef}
        meetingId={meetingId}
        editingMessage={editingMessage}
        onSubmit={handleSubmit}
        onCancelEdit={handleCancelEdit}
      />
    </div>
  );
}
