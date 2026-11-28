import { UserRoundMinus } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { useBulkUserProfilesByEmailsQuery } from "@/features/user-setting/hooks/useUserSettingQueries";
import type { RecordingPermission } from "../../types/meeting-recording.types";
import { MeetingButton } from "../ui/meeting-form-controls";
import { RecordingAccessPerson } from "./recording-access-person";
import { RecordingPermissionSelect } from "./recording-permission-select";

interface RecordingAccessListProps {
  isOwner: boolean;
  ownerProfile?: RecordingPermission["profile"];
  permissions?: RecordingPermission[];
  loading: boolean;
  error: boolean;
  disabled: boolean;
  pendingAction: string | null;
  onPermissionChange: (userId: string, canDownload: boolean) => void;
  onRemove: (userId: string) => void;
}

export function RecordingAccessList({
  isOwner,
  ownerProfile,
  permissions,
  loading,
  error,
  disabled,
  pendingAction,
  onPermissionChange,
  onRemove,
}: RecordingAccessListProps) {
  const emails = [
    ...new Set(
      [
        ownerProfile?.email,
        ...(permissions ?? []).map((permission) => permission.profile?.email),
      ].filter((email): email is string => Boolean(email)),
    ),
  ];
  const profiles = useBulkUserProfilesByEmailsQuery(emails);
  const profileByEmail = new Map(
    profiles.data?.data?.map((profile) => [
      profile.email.toLowerCase(),
      profile,
    ]),
  );
  const owner =
    (ownerProfile?.email &&
      profileByEmail.get(ownerProfile.email.toLowerCase())) ||
    ownerProfile;

  return (
    <section
      className="space-y-3"
      aria-labelledby="recording-share-access-title"
    >
      <h3
        id="recording-share-access-title"
        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"
      >
        People with access{" "}
        {permissions && (
          <span className="rounded-control bg-muted px-2 py-0.5 text-xs font-normal tabular-nums text-muted-foreground">
            {permissions.length + 1}
          </span>
        )}
      </h3>
      <div className="max-h-64 overflow-y-auto divide-y divide-border rounded-panel border border-border bg-card p-2">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 p-2">
          <RecordingAccessPerson
            name={
              owner?.fullName ||
              owner?.email ||
              (isOwner ? "You" : "Recording owner")
            }
            email={owner?.email}
            avatarUrl={owner?.avatarUrl}
          />
          <span className="rounded-control bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            Owner
          </span>
        </div>
        {error ? (
          <p role="alert" className="py-3 text-sm text-destructive-content">
            Could not load permissions.
          </p>
        ) : loading ? (
          <LoadingState label="Loading permissions…" className="py-3" />
        ) : (
          permissions?.map((permission) => {
            const profile =
              (permission.profile?.email &&
                profileByEmail.get(permission.profile.email.toLowerCase())) ||
              permission.profile;
            const name =
              profile?.fullName || profile?.email || "Shared account";

            return (
              <div
                key={permission.userId}
                className="flex min-w-0 flex-wrap items-center justify-between gap-2 p-2"
              >
                <RecordingAccessPerson
                  name={name}
                  email={profile?.email}
                  avatarUrl={profile?.avatarUrl}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <RecordingPermissionSelect
                    compact
                    canDownload={permission.canDownload}
                    label={`Recording permission for ${name}`}
                    disabled={disabled || !isOwner}
                    onChange={(value) =>
                      onPermissionChange(permission.userId, value)
                    }
                  />
                  <MeetingButton
                    tone="ghost"
                    controlSize="sm"
                    className="size-8 p-0 text-muted-foreground hover:bg-destructive-soft hover:text-destructive-content"
                    aria-label={`Remove access for ${name}`}
                    title="Remove access"
                    loading={
                      disabled &&
                      pendingAction === `revoke:${permission.userId}`
                    }
                    disabled={disabled || !isOwner}
                    onClick={() => onRemove(permission.userId)}
                  >
                    <UserRoundMinus className="size-4" aria-hidden="true" />
                  </MeetingButton>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
