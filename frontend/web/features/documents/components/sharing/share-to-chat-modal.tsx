"use client";
import { Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dialogLayout from "@/components/ui/responsive-dialog.module.css";
import type { DocumentItem } from "../../types/documents.types";
import { DocumentItemType } from "../../types/documents.enums";
import { DocumentIcon } from "../common/document-icon";
import { useShareToChat } from "../../hooks/useShareToChat";
interface Props {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  item: DocumentItem | null;
  projectId?: string;
}
export function ShareToChatModal(props: Props) {
  const open = props.open ?? props.isOpen ?? false;

  return open && props.item ? (
    <SendCopyForm key={props.item.id} {...props} item={props.item} />
  ) : null;
}
function SendCopyForm({ item, onClose }: Props & { item: DocumentItem }) {
  const share = useShareToChat({ item, onSuccess: onClose });
  const options =
    share.activeTab === "channel"
      ? share.channels.map((channel) => ({
          value: channel.id,
          label: "#" + channel.name,
        }))
      : share.activeTab === "direct"
        ? share.directConversations.map((conversation) => {
            const other = conversation.members?.find(
              (member) => member.userId !== share.currentUserId,
            );

            return {
              value: conversation.id,
              label:
                other?.profile?.fullName || other?.nickname || "Direct message",
            };
          })
        : share.activeTab === "meeting"
          ? (share.meetings.data ?? []).map((meeting) => ({
              value: meeting.id,
              label: meeting.title || "Meeting",
            }))
          : share.writableProjects.map((project) => ({
              value: project.id,
              label: project.name,
            }));

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !share.isSubmitting) onClose();
      }}
    >
      <DialogContent
        className={`${dialogLayout.surface} max-w-lg bg-card p-0 text-card-foreground`}
        showCloseButton={!share.isSubmitting}
      >
        <DialogHeader className="border-b border-border">
          <DialogTitle>Send a copy</DialogTitle>
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <DocumentIcon
              item={item}
              iconSize={18}
              className="size-8 shrink-0"
            />
            <span className="truncate">{item.name}</span>
          </div>
        </DialogHeader>
        <div className={`${dialogLayout.body} space-y-4 p-5`}>
          <Tabs
            value={share.activeTab}
            onValueChange={(value) =>
              share.changeTab(value as typeof share.activeTab)
            }
          >
            <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
              {(["channel", "direct", "meeting", "project"] as const).map(
                (tab, index) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    disabled={
                      share.isSubmitting ||
                      (tab === "project" &&
                        item.type === DocumentItemType.FOLDER)
                    }
                  >
                    {["Channels", "DMs", "Meetings", "Projects"][index]}
                  </TabsTrigger>
                ),
              )}
            </TabsList>
          </Tabs>
          {share.activeTab === "channel" && (
            <CustomSelect
              ariaLabel="Space"
              value={share.selectedSpaceId}
              onChange={share.setSelectedSpaceId}
              disabled={share.isSubmitting}
              options={[
                { value: "", label: "Select space..." },
                ...share.spaces.map((space) => ({
                  value: space.id,
                  label: space.name,
                })),
              ]}
            />
          )}
          <CustomSelect
            ariaLabel="Destination"
            value={share.selectedChatId}
            onChange={(value) => {
              share.setSelectedChatId(value);
              share.setTaskId("");
            }}
            disabled={share.isSubmitting}
            options={[
              { value: "", label: "Select destination..." },
              ...options,
            ]}
          />
          {share.activeTab === "project" && share.selectedChatId && (
            <CustomSelect
              ariaLabel="Task (optional)"
              value={share.taskId}
              onChange={share.setTaskId}
              disabled={share.isSubmitting}
              options={[
                { value: "", label: "Project Documents only" },
                ...share.tasks.map((task) => ({
                  value: task.id,
                  label: task.title,
                })),
              ]}
            />
          )}
          {share.activeTab !== "project" && (
            <Textarea
              aria-label="Message (optional)"
              value={share.introMessage}
              onChange={(event) => share.setIntroMessage(event.target.value)}
              disabled={share.isSubmitting}
              placeholder="Message (optional)"
              className="min-h-20"
            />
          )}
          {share.targetError && (
            <p role="alert" className="text-sm text-destructive-content">
              Unable to load destinations. Reopen this dialog to retry.
            </p>
          )}
          {share.error && (
            <p role="alert" className="text-sm text-destructive-content">
              {share.error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={share.isSubmitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            disabled={!share.selectedChatId}
            loading={share.isSubmitting}
            onClick={() => void share.handleShare()}
          >
            <Send aria-hidden="true" />
            Send copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export default ShareToChatModal;
