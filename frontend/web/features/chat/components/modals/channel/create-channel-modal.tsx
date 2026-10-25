"use client";

import { useId, useState } from "react";
import { Hash, Lock } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createChannel } from "../../../api/space.api";
import { ChannelVisibility } from "../../../types/chat.enums";
import { ChannelResponse } from "../../../types/chat.types";
import { chatKeys } from "../../../types/chat.constant";
import { getErrorMessage } from "../../../types/space-settings/space-settings.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ChannelMemberPicker from "./channel-member-picker";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  onChannelCreated?: (channel: ChannelResponse) => void;
}

export default function CreateChannelModal(props: CreateChannelModalProps) {
  return props.isOpen ? <CreateChannelForm {...props} /> : null;
}

function CreateChannelForm({
  isOpen,
  onClose,
  spaceId,
  onChannelCreated,
}: CreateChannelModalProps) {
  const fieldId = useId();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState(ChannelVisibility.PUBLIC);
  const [memberUserIds, setMemberUserIds] = useState<string[]>([]);
  const formattedName = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
  const mutation = useMutation({
    mutationFn: () =>
      createChannel(spaceId, formattedName, {
        visibility,
        memberUserIds:
          visibility === ChannelVisibility.PRIVATE ? memberUserIds : undefined,
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.allChannels() });
      toast.success("Channel created successfully");
      onChannelCreated?.(response.data);
      onClose();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Failed to create channel")),
  });
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && !mutation.isPending && onClose()}
    >
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] min-w-0 max-w-lg flex-col overflow-hidden rounded-dialog bg-card p-0 [@media(max-height:30rem)]:overflow-auto"
        showCloseButton={!mutation.isPending}
      >
        <DialogHeader className="min-w-0 shrink-0 px-6 py-5 pr-14 [overflow-wrap:anywhere]">
          <DialogTitle>Create a New Channel</DialogTitle>
        </DialogHeader>
        <form
          className="flex min-h-0 min-w-0 flex-1 flex-col [@media(max-height:30rem)]:flex-none"
          onSubmit={(event) => {
            event.preventDefault();
            if (formattedName && spaceId) mutation.mutate();
          }}
        >
          <div className="min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 pb-5 pt-2 [@media(max-height:30rem)]:flex-none [@media(max-height:30rem)]:overflow-visible">
            <div className="space-y-2">
              <label htmlFor={fieldId} className="text-sm font-medium">
                Channel name
              </label>
              <Input
                id={fieldId}
                autoFocus
                maxLength={80}
                value={name}
                disabled={mutation.isPending}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. project-updates"
                required
              />
            </div>
            <fieldset disabled={mutation.isPending} className="space-y-2">
              <legend className="mb-2 text-sm font-medium">Channel type</legend>
              <RadioGroup
                value={visibility}
                onValueChange={setVisibility}
                disabled={mutation.isPending}
                aria-label="Channel type"
              >
                {[
                  {
                    value: ChannelVisibility.PUBLIC,
                    Icon: Hash,
                    label: "Public",
                    description:
                      "Anyone in this space can find and join this channel.",
                  },
                  {
                    value: ChannelVisibility.PRIVATE,
                    Icon: Lock,
                    label: "Private",
                    description:
                      "Only added members can find and access this channel.",
                  },
                ].map(({ value, Icon, label, description }) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-start gap-3 rounded-panel border p-3 ${visibility === value ? "border-primary bg-primary-soft" : "border-border"}`}
                  >
                    <RadioGroupItem
                      aria-label={label}
                      value={value}
                      className="mt-1 accent-primary"
                    />
                    <Icon size={18} className="mt-0.5 shrink-0" />
                    <span>
                      <span className="block text-sm font-semibold">
                        {label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {description}
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                Channel type cannot be changed after creation.
              </p>
            </fieldset>
            {visibility === ChannelVisibility.PRIVATE && (
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Add members</h3>
                <p className="text-xs text-muted-foreground">
                  You will be the owner. Added members receive a notification
                  and can read the full history. You can manage members later.
                </p>
                <ChannelMemberPicker
                  spaceId={spaceId}
                  selected={memberUserIds}
                  onChange={setMemberUserIds}
                  disabled={mutation.isPending}
                />
              </section>
            )}
          </div>
          <DialogFooter className="shrink-0 flex-wrap bg-card px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={mutation.isPending}
              disabled={mutation.isPending || !formattedName || !spaceId}
            >
              Create Channel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
