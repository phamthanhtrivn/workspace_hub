interface ProjectTaskPermissionDefaults {
  allowMemberCreateTask: boolean;
  allowMemberEditOwnTask: boolean;
  allowMemberEditOthersTask: boolean;
}

export function defaultMemberPermissions(
  setting?: ProjectTaskPermissionDefaults | null,
) {
  return {
    canCreateTask: setting?.allowMemberCreateTask ?? false,
    canEditOwnTask: setting?.allowMemberEditOwnTask ?? false,
    canEditOthersTask: setting?.allowMemberEditOthersTask ?? false,
    canManageSprints: false,
    canManageMembers: false,
    canManageLabels: false,
  };
}
