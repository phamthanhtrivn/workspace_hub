# Shared UI inventory

Updated 2026-10-21. Covers **459 TSX files** under frontend/web, including the two shared picker components and the shared notification row. Generated from TypeScript JSX/imports after the migration; this is a source inventory, not browser verification.

## Interpretation

- Owned base: components/ui owns native DOM and vendor primitives.
- Shared UI: imports the owned UI layer directly.
- Composed UI: reaches the owned UI through child components.
- Layout / content / vendor: no direct UI dependency is required for content, server routing, document/media rendering or vendor-managed views.
- Unstyled counts are review markers, not violations. Complex list/card hit areas, media overlays, navigation, and selection surfaces retain their density and structure; ordinary primary actions use standard variants.

| Classification | Files |
| --- | ---: |
| Composed UI | 75 |
| Layout / content / vendor | 54 |
| Shared UI | 287 |
| Owned base | 43 |

## Explicit native exceptions

Visible native date/time widgets, NativeSelect, details/summary and SweetAlert2 imports outside the UI layer: **0**. The ESLint workspace/shared-ui rule is the enforcement check.

| File | Retained controls | Reason |
| --- | --- | --- |
| features/calendar/components/modal/calendar-documents-section.tsx | input (file) | Hidden upload input; browser file selection requires native input. |
| features/chat/components/input/channel-chat-input.tsx | input (file) | Hidden upload input; browser file selection requires native input. |
| features/chat/components/input/direct-message-input.tsx | input (file) | Hidden upload input; browser file selection requires native input. |
| features/chat/components/input/thread-chat-input.tsx | input (file) | Hidden upload input; browser file selection requires native input. |
| features/chat/components/message/poll-message.tsx | NativeCheckbox, NativeRadio | Hidden form control preserves existing poll selection semantics. |
| features/documents/components/explorer/explorer-toolbar.tsx | input (file) | Hidden upload input; browser file selection requires native input. |
| features/documents/components/versions/version-uploader.tsx | input (file) | Hidden upload input; browser file selection requires native input. |
| features/meeting/components/room/message/meeting-message-input.tsx | input (file) | Hidden upload input; browser file selection requires native input. |
| features/project/components/task-detail/task-documents-section.tsx | input (file) | Hidden upload input; browser file selection requires native input. |
| features/user-setting/components/profile-tab.tsx | input (file) | Hidden upload input; browser file selection requires native input. |

The owned date picker also contains a visually hidden form-validation proxy. FullCalendar, charts, document content, and media DOM remain under their existing adapters. Hidden poll inputs retain native voting/deselection semantics and have an inline exception reason.

## File inventory

| Path relative to frontend/web | Ownership / composition | Unstyled uses |
| --- | --- | ---: |
| app/(auth)/forgot-password/page.tsx | Composed UI | 0 |
| app/(auth)/layout.tsx | Layout / content / vendor | 0 |
| app/(auth)/login/page.tsx | Composed UI | 0 |
| app/(auth)/register/page.tsx | Composed UI | 0 |
| app/(public)/documents/shared/[id]/components/shared-denied.tsx | Layout / content / vendor | 0 |
| app/(public)/documents/shared/[id]/components/shared-details.tsx | Shared UI | 3 |
| app/(public)/documents/shared/[id]/components/shared-document-view.tsx | Composed UI | 0 |
| app/(public)/documents/shared/[id]/components/shared-folder-browser.tsx | Shared UI | 7 |
| app/(public)/documents/shared/[id]/components/shared-header.tsx | Layout / content / vendor | 0 |
| app/(public)/documents/shared/[id]/components/shared-preview.tsx | Composed UI | 0 |
| app/(public)/documents/shared/[id]/page.tsx | Composed UI | 0 |
| app/(public)/layout.tsx | Layout / content / vendor | 0 |
| app/(public)/page.tsx | Layout / content / vendor | 0 |
| app/(workspace)/ai/page.tsx | Layout / content / vendor | 0 |
| app/(workspace)/calendar/page.tsx | Composed UI | 0 |
| app/(workspace)/chat/page.tsx | Composed UI | 0 |
| app/(workspace)/dashboard/page.tsx | Composed UI | 0 |
| app/(workspace)/documents/page.tsx | Composed UI | 0 |
| app/(workspace)/layout.tsx | Composed UI | 0 |
| app/(workspace)/meetings/[joinToken]/page.tsx | Composed UI | 0 |
| app/(workspace)/meetings/page.tsx | Composed UI | 0 |
| app/(workspace)/pomodoro/page.tsx | Composed UI | 0 |
| app/(workspace)/projects/[id]/page.tsx | Composed UI | 0 |
| app/(workspace)/projects/invitations/page.tsx | Composed UI | 0 |
| app/(workspace)/projects/layout.tsx | Layout / content / vendor | 0 |
| app/(workspace)/projects/page.tsx | Composed UI | 0 |
| app/(workspace)/tasks/page.tsx | Layout / content / vendor | 0 |
| app/layout.tsx | Layout / content / vendor | 0 |
| app/social-image/route.tsx | Layout / content / vendor | 0 |
| components/common/feature-sidebar-item.tsx | Shared UI | 0 |
| components/common/input-field.tsx | Shared UI | 1 |
| components/common/notification-dropdown.tsx | Shared UI | 0 |
| components/common/otp-input.tsx | Shared UI | 0 |
| components/common/query-feedback.tsx | Shared UI | 0 |
| components/common/theme-provider.tsx | Layout / content / vendor | 0 |
| components/common/user-profile-dropdown.tsx | Shared UI | 1 |
| components/common/view-all-action.tsx | Shared UI | 0 |
| components/common/workspace-help-dialog.tsx | Shared UI | 0 |
| components/layout/workspace-header.tsx | Shared UI | 1 |
| components/layout/workspace-shell.tsx | Shared UI | 3 |
| components/ui/alert-dialog.tsx | Owned base | 0 |
| components/ui/anchored-popup.tsx | Owned base | 0 |
| components/ui/avatar.tsx | Owned base | 0 |
| components/ui/badge.tsx | Owned base | 0 |
| components/ui/breadcrumb.tsx | Owned base | 0 |
| components/ui/button.tsx | Owned base | 0 |
| components/ui/calendar.tsx | Owned base | 0 |
| components/ui/card.tsx | Owned base | 0 |
| components/ui/chart.tsx | Owned base | 0 |
| components/ui/checkbox.tsx | Owned base | 0 |
| components/ui/collapsible.tsx | Owned base | 0 |
| components/ui/combobox.tsx | Owned base | 0 |
| components/ui/context-menu.tsx | Owned base | 0 |
| components/ui/custom/custom-badge.tsx | Owned base | 0 |
| components/ui/custom/custom-checkbox.tsx | Owned base | 0 |
| components/ui/custom/custom-color-picker.tsx | Owned base | 0 |
| components/ui/custom/custom-date-picker.tsx | Owned base | 0 |
| components/ui/custom/custom-date-range.tsx | Owned base | 0 |
| components/ui/custom/custom-date-time-picker.tsx | Owned base | 0 |
| components/ui/custom/custom-select.tsx | Owned base | 0 |
| components/ui/custom/custom-tabs.tsx | Owned base | 1 |
| components/ui/custom/custom-tag.tsx | Owned base | 0 |
| components/ui/custom/custom-time-picker.tsx | Owned base | 0 |
| components/ui/custom/simple-pagination.tsx | Owned base | 0 |
| components/ui/dialog.tsx | Owned base | 0 |
| components/ui/dropdown-menu.tsx | Owned base | 1 |
| components/ui/icon-button.tsx | Owned base | 0 |
| components/ui/input.tsx | Owned base | 0 |
| components/ui/native-select.tsx | Owned base | 0 |
| components/ui/popover.tsx | Owned base | 0 |
| components/ui/progress.tsx | Owned base | 0 |
| components/ui/radio-group.tsx | Owned base | 0 |
| components/ui/search-input.tsx | Owned base | 1 |
| components/ui/select.tsx | Owned base | 0 |
| components/ui/separator.tsx | Owned base | 0 |
| components/ui/sheet.tsx | Owned base | 0 |
| components/ui/skeleton.tsx | Owned base | 0 |
| components/ui/slider.tsx | Owned base | 0 |
| components/ui/switch.tsx | Owned base | 0 |
| components/ui/table.tsx | Owned base | 0 |
| components/ui/tabs.tsx | Owned base | 0 |
| components/ui/textarea.tsx | Owned base | 0 |
| components/ui/tooltip.tsx | Owned base | 0 |
| features/auth/components/forgot-password-form.tsx | Shared UI | 5 |
| features/auth/components/login-form.tsx | Shared UI | 1 |
| features/auth/components/register-form.tsx | Shared UI | 1 |
| features/auth/components/social-login-buttons.tsx | Shared UI | 1 |
| features/calendar/components/drawer/calendar-task-list.tsx | Shared UI | 0 |
| features/calendar/components/drawer/calendar-tasks-drawer.tsx | Shared UI | 0 |
| features/calendar/components/modal/attachment-editor.tsx | Shared UI | 0 |
| features/calendar/components/modal/calendar-conference-card.tsx | Shared UI | 0 |
| features/calendar/components/modal/calendar-document-picker-dialog.tsx | Shared UI | 1 |
| features/calendar/components/modal/calendar-documents-section.tsx | Shared UI | 0 |
| features/calendar/components/modal/calendar-modal.tsx | Shared UI | 0 |
| features/calendar/components/modal/calendar-select.tsx | Shared UI | 0 |
| features/calendar/components/modal/calendar-task-deadline-fields.tsx | Shared UI | 0 |
| features/calendar/components/modal/calendar-task-title-field.tsx | Shared UI | 0 |
| features/calendar/components/modal/calendar-time-fields.tsx | Shared UI | 0 |
| features/calendar/components/modal/custom-recurrence-modal.tsx | Shared UI | 0 |
| features/calendar/components/modal/delete-calendar-modal.tsx | Composed UI | 0 |
| features/calendar/components/modal/event-attendee-list.tsx | Layout / content / vendor | 0 |
| features/calendar/components/modal/event-detail-modal.tsx | Shared UI | 0 |
| features/calendar/components/modal/event-form-modal.tsx | Composed UI | 0 |
| features/calendar/components/modal/location-picker-input.tsx | Shared UI | 0 |
| features/calendar/components/modal/project-task-detail-modal.tsx | Shared UI | 0 |
| features/calendar/components/modal/quick-create-event-fields.tsx | Composed UI | 0 |
| features/calendar/components/modal/quick-create-modal.tsx | Shared UI | 0 |
| features/calendar/components/modal/quick-create-time-section.tsx | Composed UI | 0 |
| features/calendar/components/modal/recurrence-scope-modal.tsx | Shared UI | 0 |
| features/calendar/components/modal/reminder-editor.tsx | Shared UI | 0 |
| features/calendar/components/sidebar/calendar-color-popover.tsx | Shared UI | 0 |
| features/calendar/components/sidebar/calendar-list-item.tsx | Shared UI | 0 |
| features/calendar/components/sidebar/calendar-sidebar.tsx | Shared UI | 0 |
| features/calendar/components/sidebar/calendar-style-fields.tsx | Shared UI | 0 |
| features/calendar/components/sidebar/mini-calendar.tsx | Shared UI | 0 |
| features/calendar/components/sidebar/project-calendars-section.tsx | Shared UI | 1 |
| features/calendar/components/sidebar/tasks-calendar-list-item.tsx | Shared UI | 0 |
| features/calendar/components/toolbar/calendar-toolbar.tsx | Shared UI | 0 |
| features/calendar/components/ui/calendar-confirm-dialog.tsx | Shared UI | 0 |
| features/calendar/components/ui/calendar-radio-group.tsx | Shared UI | 0 |
| features/calendar/components/workspace/attendee-picker.tsx | Shared UI | 0 |
| features/calendar/components/workspace/calendar-grid.tsx | Shared UI | 0 |
| features/calendar/components/workspace/calendar-workspace.tsx | Shared UI | 0 |
| features/chat/components/chat-area/chat-area.tsx | Composed UI | 0 |
| features/chat/components/chat-area/editing-banner.tsx | Shared UI | 1 |
| features/chat/components/chat-area/jump-to-recent-banner.tsx | Shared UI | 1 |
| features/chat/components/chat-layout.tsx | Shared UI | 0 |
| features/chat/components/header/channel-chat-header.tsx | Shared UI | 5 |
| features/chat/components/header/chat-header.tsx | Composed UI | 0 |
| features/chat/components/header/direct-conversation-header.tsx | Shared UI | 5 |
| features/chat/components/input/channel-chat-input.tsx | Shared UI | 7 |
| features/chat/components/input/direct-message-input.tsx | Shared UI | 6 |
| features/chat/components/input/emoji-picker-popover.tsx | Shared UI | 0 |
| features/chat/components/input/mention-dropdown.tsx | Shared UI | 1 |
| features/chat/components/input/rich-text-textarea.tsx | Shared UI | 0 |
| features/chat/components/input/thread-chat-input.tsx | Shared UI | 5 |
| features/chat/components/message/chat-message.tsx | Shared UI | 6 |
| features/chat/components/message/document-message.tsx | Shared UI | 2 |
| features/chat/components/message/media-lightbox.tsx | Shared UI | 8 |
| features/chat/components/message/meeting-card-message.tsx | Shared UI | 1 |
| features/chat/components/message/message-attachments.tsx | Shared UI | 2 |
| features/chat/components/message/message-avatar.tsx | Shared UI | 1 |
| features/chat/components/message/message-list.tsx | Composed UI | 0 |
| features/chat/components/message/message-options-dropdown.tsx | Shared UI | 0 |
| features/chat/components/message/message-reactions.tsx | Shared UI | 1 |
| features/chat/components/message/message-read-receipts.tsx | Layout / content / vendor | 0 |
| features/chat/components/message/note-message.tsx | Shared UI | 1 |
| features/chat/components/message/poll-message.tsx | Shared UI | 4 |
| features/chat/components/message/task-card-message.tsx | Layout / content / vendor | 0 |
| features/chat/components/message/time-divider.tsx | Layout / content / vendor | 0 |
| features/chat/components/message/typing-indicator.tsx | Layout / content / vendor | 0 |
| features/chat/components/modals/channel/browse-channels-modal.tsx | Shared UI | 2 |
| features/chat/components/modals/channel/channel-member-row.tsx | Shared UI | 1 |
| features/chat/components/modals/channel/channel-members-list.tsx | Composed UI | 0 |
| features/chat/components/modals/channel/channel-members-modal.tsx | Shared UI | 1 |
| features/chat/components/modals/channel/channel-settings-modal.tsx | Shared UI | 3 |
| features/chat/components/modals/channel/create-channel-modal.tsx | Composed UI | 0 |
| features/chat/components/modals/message/create-note-modal.tsx | Shared UI | 1 |
| features/chat/components/modals/message/create-poll-modal.tsx | Shared UI | 1 |
| features/chat/components/modals/message/edit-note-modal.tsx | Shared UI | 1 |
| features/chat/components/modals/message/edit-poll-modal.tsx | Shared UI | 1 |
| features/chat/components/modals/message/poll-voters-modal.tsx | Shared UI | 2 |
| features/chat/components/modals/message/reaction-detail-modal.tsx | Shared UI | 4 |
| features/chat/components/modals/message/view-note-modal.tsx | Shared UI | 1 |
| features/chat/components/modals/message/view-poll-modal.tsx | Shared UI | 1 |
| features/chat/components/modals/shared/my-files-select-modal.tsx | Shared UI | 6 |
| features/chat/components/modals/shared/search-user-modal.tsx | Shared UI | 3 |
| features/chat/components/modals/shared/user-profile-modal.tsx | Shared UI | 1 |
| features/chat/components/modals/space/create-space-modal.tsx | Composed UI | 0 |
| features/chat/components/modals/space/invite-space-members-modal.tsx | Shared UI | 1 |
| features/chat/components/modals/space/manage-members-modal.tsx | Shared UI | 2 |
| features/chat/components/modals/space/space-settings-modal.tsx | Layout / content / vendor | 0 |
| features/chat/components/modals/space/space-settings/danger-zone-tab.tsx | Shared UI | 1 |
| features/chat/components/modals/space/space-settings/invitations-tab.tsx | Shared UI | 0 |
| features/chat/components/modals/space/space-settings/members-tab.tsx | Shared UI | 0 |
| features/chat/components/modals/space/space-settings/overview-tab.tsx | Shared UI | 0 |
| features/chat/components/modals/space/space-settings/permissions-tab.tsx | Shared UI | 0 |
| features/chat/components/modals/space/space-settings/space-settings-modal.tsx | Shared UI | 1 |
| features/chat/components/modals/start-meeting-confirm-modal.tsx | Shared UI | 0 |
| features/chat/components/right-panel/channel/channel-actions-section.tsx | Shared UI | 2 |
| features/chat/components/right-panel/channel/channel-right-panel.tsx | Shared UI | 3 |
| features/chat/components/right-panel/channel/channel-settings-section.tsx | Shared UI | 1 |
| features/chat/components/right-panel/chat-right-panel.tsx | Composed UI | 0 |
| features/chat/components/right-panel/direct-message/direct-message-right-panel.tsx | Shared UI | 4 |
| features/chat/components/right-panel/files/files-section.tsx | Shared UI | 2 |
| features/chat/components/right-panel/files/media-detail-view.tsx | Shared UI | 2 |
| features/chat/components/right-panel/notes/note-detail-view.tsx | Shared UI | 2 |
| features/chat/components/right-panel/notes/notes-section.tsx | Shared UI | 2 |
| features/chat/components/right-panel/pinned-messages/pinned-messages-detail-view.tsx | Shared UI | 2 |
| features/chat/components/right-panel/pinned-messages/pinned-messages-section.tsx | Shared UI | 2 |
| features/chat/components/right-panel/polls/poll-detail-view.tsx | Shared UI | 2 |
| features/chat/components/right-panel/polls/polls-section.tsx | Shared UI | 2 |
| features/chat/components/right-panel/search/search-messages-section.tsx | Shared UI | 4 |
| features/chat/components/right-panel/search/search-result-item.tsx | Shared UI | 1 |
| features/chat/components/right-panel/see-all-button.tsx | Composed UI | 0 |
| features/chat/components/right-panel/thread/thread-detail-view.tsx | Shared UI | 4 |
| features/chat/components/right-panel/thread/thread-side-panel.tsx | Shared UI | 1 |
| features/chat/components/right-panel/thread/thread-snippet-preview.tsx | Layout / content / vendor | 0 |
| features/chat/components/right-panel/thread/threads-list-view.tsx | Shared UI | 1 |
| features/chat/components/right-panel/thread/threads-section.tsx | Shared UI | 2 |
| features/chat/components/sidebar/channel-item.tsx | Shared UI | 1 |
| features/chat/components/sidebar/chat-sidebar.tsx | Shared UI | 5 |
| features/chat/components/sidebar/direct-conversation-item.tsx | Shared UI | 1 |
| features/chat/components/sidebar/direct-conversations-section.tsx | Shared UI | 1 |
| features/chat/components/sidebar/followed-threads-modal.tsx | Shared UI | 2 |
| features/chat/components/ui/chat-confirm-dialog.tsx | Shared UI | 2 |
| features/chat/components/ui/chat-empty-state.tsx | Shared UI | 0 |
| features/chat/components/ui/chat-form-controls.tsx | Shared UI | 0 |
| features/chat/components/ui/chat-input-modal.tsx | Shared UI | 0 |
| features/chat/components/ui/chat-loading-state.tsx | Shared UI | 0 |
| features/chat/utils/document-utils.tsx | Layout / content / vendor | 0 |
| features/chat/utils/media-utils.tsx | Layout / content / vendor | 0 |
| features/chat/utils/message-formatter.tsx | Layout / content / vendor | 0 |
| features/dashboard/components/analytics/dashboard-analytics.tsx | Shared UI | 0 |
| features/dashboard/components/analytics/dashboard-chart-support.tsx | Shared UI | 0 |
| features/dashboard/components/analytics/dashboard-completion-chart.tsx | Shared UI | 0 |
| features/dashboard/components/analytics/dashboard-deadline-chart.tsx | Shared UI | 0 |
| features/dashboard/components/analytics/dashboard-workload-chart.tsx | Shared UI | 0 |
| features/dashboard/components/common/dashboard-disclosure.tsx | Shared UI | 0 |
| features/dashboard/components/common/dashboard-panel.tsx | Shared UI | 0 |
| features/dashboard/components/dashboard-view.tsx | Shared UI | 0 |
| features/dashboard/components/day/dashboard-day-item.tsx | Shared UI | 0 |
| features/dashboard/components/day/dashboard-day.tsx | Composed UI | 0 |
| features/dashboard/components/overview/dashboard-extras.tsx | Shared UI | 1 |
| features/dashboard/components/overview/dashboard-meetings.tsx | Shared UI | 0 |
| features/dashboard/components/overview/dashboard-notification-dialog.tsx | Shared UI | 0 |
| features/dashboard/components/overview/dashboard-quick-actions.tsx | Shared UI | 0 |
| features/dashboard/components/overview/dashboard-quick-task-dialog.tsx | Shared UI | 0 |
| features/dashboard/components/productivity/dashboard-activity-calendar.tsx | Shared UI | 0 |
| features/dashboard/components/productivity/dashboard-productivity-chart.tsx | Layout / content / vendor | 0 |
| features/dashboard/components/productivity/dashboard-productivity.tsx | Shared UI | 0 |
| features/dashboard/components/productivity/dashboard-project-activity.tsx | Shared UI | 0 |
| features/dashboard/components/tasks/dashboard-task-item.tsx | Shared UI | 0 |
| features/dashboard/components/tasks/dashboard-tasks.tsx | Shared UI | 0 |
| features/dashboard/components/weather/dashboard-sun.tsx | Layout / content / vendor | 0 |
| features/dashboard/components/weather/dashboard-weather-icon.tsx | Layout / content / vendor | 0 |
| features/dashboard/components/weather/dashboard-weather.tsx | Shared UI | 1 |
| features/documents/components/common/document-icon.tsx | Layout / content / vendor | 0 |
| features/documents/components/common/folder-picker-modal.tsx | Shared UI | 2 |
| features/documents/components/common/quota-widget.tsx | Composed UI | 0 |
| features/documents/components/common/shimmer-loader.tsx | Layout / content / vendor | 0 |
| features/documents/components/common/upload-progress.tsx | Shared UI | 0 |
| features/documents/components/document-explorer.tsx | Composed UI | 0 |
| features/documents/components/documents-view.tsx | Composed UI | 0 |
| features/documents/components/download/download-queue-provider.tsx | Shared UI | 2 |
| features/documents/components/explorer/breadcrumb-link.tsx | Shared UI | 1 |
| features/documents/components/explorer/details-panel.tsx | Shared UI | 0 |
| features/documents/components/explorer/documents-sidebar-storage-panel.tsx | Layout / content / vendor | 0 |
| features/documents/components/explorer/documents-sidebar.tsx | Composed UI | 0 |
| features/documents/components/explorer/explorer-breadcrumbs.tsx | Shared UI | 1 |
| features/documents/components/explorer/explorer-toolbar.tsx | Shared UI | 2 |
| features/documents/components/explorer/item-actions-menu.tsx | Shared UI | 0 |
| features/documents/components/preview/file-preview-modal.tsx | Shared UI | 0 |
| features/documents/components/preview/preview-content.tsx | Shared UI | 0 |
| features/documents/components/sharing/share-form.tsx | Shared UI | 0 |
| features/documents/components/sharing/share-link.tsx | Shared UI | 1 |
| features/documents/components/sharing/share-list.tsx | Shared UI | 0 |
| features/documents/components/sharing/share-modal.tsx | Shared UI | 0 |
| features/documents/components/sharing/share-suggestions-dropdown.tsx | Shared UI | 0 |
| features/documents/components/sharing/share-to-chat-modal.tsx | Shared UI | 2 |
| features/documents/components/ui/documents-card.tsx | Layout / content / vendor | 0 |
| features/documents/components/ui/documents-confirm-dialog.tsx | Shared UI | 2 |
| features/documents/components/ui/documents-empty-state.tsx | Layout / content / vendor | 0 |
| features/documents/components/ui/documents-form-controls.tsx | Shared UI | 0 |
| features/documents/components/ui/documents-icon-button.tsx | Shared UI | 0 |
| features/documents/components/ui/documents-input-modal.tsx | Shared UI | 0 |
| features/documents/components/ui/documents-loading-state.tsx | Shared UI | 0 |
| features/documents/components/ui/documents-pagination.tsx | Shared UI | 1 |
| features/documents/components/ui/documents-status-badge.tsx | Shared UI | 0 |
| features/documents/components/versions/version-history-table.tsx | Shared UI | 0 |
| features/documents/components/versions/version-management-modal.tsx | Shared UI | 0 |
| features/documents/components/versions/version-uploader.tsx | Shared UI | 1 |
| features/documents/components/views/grid-view-card.tsx | Shared UI | 1 |
| features/documents/components/views/grid-view.tsx | Composed UI | 0 |
| features/documents/components/views/list-view-row.tsx | Shared UI | 1 |
| features/documents/components/views/list-view.tsx | Shared UI | 0 |
| features/meeting/components/common/avatar-fallback.tsx | Shared UI | 0 |
| features/meeting/components/common/meeting-action-tile.tsx | Shared UI | 1 |
| features/meeting/components/common/meeting-alert-dialog.tsx | Shared UI | 2 |
| features/meeting/components/common/meeting-auto-admit-toggle.tsx | Composed UI | 0 |
| features/meeting/components/common/meeting-device-select.tsx | Composed UI | 0 |
| features/meeting/components/common/meeting-hero.tsx | Shared UI | 0 |
| features/meeting/components/common/meeting-icon-dropdown.tsx | Shared UI | 1 |
| features/meeting/components/common/meeting-join-link-modal.tsx | Shared UI | 0 |
| features/meeting/components/common/meeting-pagination.tsx | Shared UI | 1 |
| features/meeting/components/common/meeting-participant-chat-toggle.tsx | Composed UI | 0 |
| features/meeting/components/common/meeting-participant-list-item.tsx | Composed UI | 0 |
| features/meeting/components/common/meeting-room-control-button.tsx | Shared UI | 1 |
| features/meeting/components/common/meeting-screen-share-toggle.tsx | Shared UI | 0 |
| features/meeting/components/common/meeting-status-tag.tsx | Composed UI | 0 |
| features/meeting/components/history/meeting-history-avatar-stack.tsx | Composed UI | 0 |
| features/meeting/components/history/meeting-history-card.tsx | Composed UI | 0 |
| features/meeting/components/history/meeting-history-list-row.tsx | Composed UI | 0 |
| features/meeting/components/history/meeting-join-token-copy-button.tsx | Shared UI | 1 |
| features/meeting/components/history/meeting-previous-view.tsx | Composed UI | 0 |
| features/meeting/components/meeting-layout.tsx | Composed UI | 0 |
| features/meeting/components/meeting-sidebar-stats-panel.tsx | Shared UI | 0 |
| features/meeting/components/meeting-sidebar.tsx | Composed UI | 0 |
| features/meeting/components/overview/meeting-overview-recent.tsx | Composed UI | 0 |
| features/meeting/components/overview/meeting-overview-upcoming.tsx | Composed UI | 0 |
| features/meeting/components/recordings/meeting-recording-player.tsx | Shared UI | 0 |
| features/meeting/components/recordings/meeting-recording-share-dialog.tsx | Shared UI | 0 |
| features/meeting/components/recordings/meeting-recordings-view.tsx | Shared UI | 0 |
| features/meeting/components/room/meeting-access-denied.tsx | Composed UI | 0 |
| features/meeting/components/room/meeting-fullscreen-overlay.tsx | Shared UI | 0 |
| features/meeting/components/room/meeting-participant-tile.tsx | Composed UI | 0 |
| features/meeting/components/room/meeting-password-gate.tsx | Composed UI | 0 |
| features/meeting/components/room/meeting-prejoin.tsx | Shared UI | 0 |
| features/meeting/components/room/meeting-recording-banner.tsx | Layout / content / vendor | 0 |
| features/meeting/components/room/meeting-recording-controls.tsx | Shared UI | 0 |
| features/meeting/components/room/meeting-room-audio-renderer.tsx | Layout / content / vendor | 0 |
| features/meeting/components/room/meeting-room-content.tsx | Shared UI | 0 |
| features/meeting/components/room/meeting-room-footer.tsx | Composed UI | 0 |
| features/meeting/components/room/meeting-room-reaction-overlay.tsx | Layout / content / vendor | 0 |
| features/meeting/components/room/meeting-room-reaction-picker.tsx | Shared UI | 1 |
| features/meeting/components/room/meeting-room-shell.tsx | Composed UI | 0 |
| features/meeting/components/room/meeting-room-stage.tsx | Composed UI | 0 |
| features/meeting/components/room/meeting-room-state.tsx | Shared UI | 0 |
| features/meeting/components/room/meeting-waiting-approval.tsx | Composed UI | 0 |
| features/meeting/components/room/meeting-waiting-host.tsx | Composed UI | 0 |
| features/meeting/components/room/message/meeting-message-attachments.tsx | Shared UI | 0 |
| features/meeting/components/room/message/meeting-message-editing-banner.tsx | Composed UI | 0 |
| features/meeting/components/room/message/meeting-message-input.tsx | Shared UI | 0 |
| features/meeting/components/room/message/meeting-message-item.tsx | Shared UI | 2 |
| features/meeting/components/room/message/meeting-message-list.tsx | Composed UI | 0 |
| features/meeting/components/room/message/meeting-message-options-menu.tsx | Shared UI | 0 |
| features/meeting/components/room/message/meeting-message-reactions.tsx | Shared UI | 1 |
| features/meeting/components/room/message/meeting-message-read-receipts.tsx | Composed UI | 0 |
| features/meeting/components/room/message/meeting-message-time-divider.tsx | Layout / content / vendor | 0 |
| features/meeting/components/room/side-panel/meeting-chat-notification-toggle-button.tsx | Shared UI | 1 |
| features/meeting/components/room/side-panel/meeting-participants-panel.tsx | Composed UI | 0 |
| features/meeting/components/room/side-panel/meeting-room-admission-panel.tsx | Composed UI | 0 |
| features/meeting/components/room/side-panel/meeting-room-chat-panel.tsx | Composed UI | 0 |
| features/meeting/components/room/side-panel/meeting-room-desktop-side-panel.tsx | Shared UI | 0 |
| features/meeting/components/room/side-panel/meeting-room-mobile-panel.tsx | Shared UI | 0 |
| features/meeting/components/room/side-panel/meeting-room-panel-content.tsx | Composed UI | 0 |
| features/meeting/components/room/side-panel/meeting-room-settings-panel.tsx | Composed UI | 0 |
| features/meeting/components/room/side-panel/meeting-room-share-link.tsx | Shared UI | 0 |
| features/meeting/components/schedule/schedule-meeting-modal.tsx | Shared UI | 2 |
| features/meeting/components/schedule/upcoming-meeting-card.tsx | Composed UI | 0 |
| features/meeting/components/schedule/upcoming-meetings-view.tsx | Composed UI | 0 |
| features/meeting/components/ui/meeting-card.tsx | Layout / content / vendor | 0 |
| features/meeting/components/ui/meeting-empty-state.tsx | Composed UI | 0 |
| features/meeting/components/ui/meeting-field.tsx | Layout / content / vendor | 0 |
| features/meeting/components/ui/meeting-form-controls.tsx | Shared UI | 0 |
| features/meeting/components/ui/meeting-icon-button.tsx | Composed UI | 0 |
| features/meeting/components/ui/meeting-loading-state.tsx | Shared UI | 0 |
| features/meeting/components/ui/meeting-status-badge.tsx | Shared UI | 0 |
| features/meeting/components/ui/meeting-toggle.tsx | Shared UI | 0 |
| features/notification/components/chat-message-alert-manager.tsx | Layout / content / vendor | 0 |
| features/notification/components/notification-category-icon.tsx | Layout / content / vendor | 0 |
| features/notification/components/notification-detail-modal.tsx | Shared UI | 0 |
| features/notification/components/notification-item.tsx | Shared UI | 0 |
| features/notification/components/notification-list-row.tsx | Shared UI | 1 |
| features/notification/components/notification-list.tsx | Shared UI | 0 |
| features/notification/components/notification-managers.tsx | Layout / content / vendor | 0 |
| features/notification/components/push-subscription-manager.tsx | Layout / content / vendor | 0 |
| features/notification/components/renderers/calendar-reminder-renderer.tsx | Shared UI | 0 |
| features/notification/components/renderers/default-renderer.tsx | Shared UI | 0 |
| features/notification/components/renderers/invitation-accepted-renderer.tsx | Shared UI | 0 |
| features/notification/components/renderers/invitation-declined-renderer.tsx | Shared UI | 0 |
| features/notification/components/renderers/invitation-renderer.tsx | Shared UI | 0 |
| features/notification/components/renderers/meeting-invitation-renderer.tsx | Shared UI | 1 |
| features/notification/components/renderers/project-invitation-renderer.tsx | Shared UI | 1 |
| features/notification/components/service-worker-navigation-listener.tsx | Layout / content / vendor | 0 |
| features/notification/components/space-notification-alert-manager.tsx | Layout / content / vendor | 0 |
| features/pomodoro/components/pomodoro-active-task.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-ambient-player.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-audio-icon.tsx | Layout / content / vendor | 0 |
| features/pomodoro/components/pomodoro-audio-track-list.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-calendar-task-form.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-calendar-task-list.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-calendar-task-panel.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-config-provider.tsx | Layout / content / vendor | 0 |
| features/pomodoro/components/pomodoro-controls.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-daily-stats.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-focus-dialog.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-focus-switch-confirmation.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-mini-timer.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-project-task-panel.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-report.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-session-history-item.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-session-history.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-session-provider.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-settings-form.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-stats-card.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-task-actions.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-task-editor.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-task-filters.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-task-picker.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-timer-display.tsx | Shared UI | 0 |
| features/pomodoro/components/pomodoro-view.tsx | Shared UI | 0 |
| features/pomodoro/components/task-focus-button.tsx | Shared UI | 0 |
| features/pomodoro/components/task-focus-history.tsx | Shared UI | 0 |
| features/project/components/dialogs/create-project-dialog.tsx | Shared UI | 0 |
| features/project/components/dialogs/invite-member-dialog.tsx | Shared UI | 0 |
| features/project/components/dialogs/member-permissions-dialog.tsx | Shared UI | 0 |
| features/project/components/dialogs/project-settings-dialog.tsx | Shared UI | 0 |
| features/project/components/dialogs/select-task-channel-dialog.tsx | Shared UI | 0 |
| features/project/components/dialogs/task-chat-dialog.tsx | Shared UI | 0 |
| features/project/components/dialogs/task-form-dialog.tsx | Shared UI | 0 |
| features/project/components/forms/project-label-manager.tsx | Shared UI | 0 |
| features/project/components/forms/task-date-range-fields.tsx | Shared UI | 0 |
| features/project/components/forms/task-details-fields.tsx | Composed UI | 0 |
| features/project/components/layout/project-detail-content.tsx | Composed UI | 0 |
| features/project/components/layout/project-detail-fallback.tsx | Layout / content / vendor | 0 |
| features/project/components/layout/project-detail-sidebar.tsx | Shared UI | 0 |
| features/project/components/layout/project-detail-toolbar.tsx | Shared UI | 0 |
| features/project/components/list/project-task-row.tsx | Shared UI | 1 |
| features/project/components/list/task-inline-creator.tsx | Shared UI | 0 |
| features/project/components/members/pending-invitations-list.tsx | Shared UI | 0 |
| features/project/components/members/project-members-panel.tsx | Shared UI | 0 |
| features/project/components/project-realtime-manager.tsx | Layout / content / vendor | 0 |
| features/project/components/summary/member-workload-list.tsx | Layout / content / vendor | 0 |
| features/project/components/summary/priority-distribution-bar.tsx | Layout / content / vendor | 0 |
| features/project/components/summary/project-metric-card.tsx | Layout / content / vendor | 0 |
| features/project/components/summary/project-summary-panel.tsx | Layout / content / vendor | 0 |
| features/project/components/task-detail/task-activity-panel.tsx | Shared UI | 0 |
| features/project/components/task-detail/task-checklist-section.tsx | Shared UI | 0 |
| features/project/components/task-detail/task-comments-section.tsx | Shared UI | 0 |
| features/project/components/task-detail/task-dependencies-section.tsx | Shared UI | 0 |
| features/project/components/task-detail/task-detail-drawer.tsx | Shared UI | 2 |
| features/project/components/task-detail/task-documents-section.tsx | Shared UI | 1 |
| features/project/components/task-detail/task-labels-picker.tsx | Shared UI | 0 |
| features/project/components/task-detail/task-properties-panel.tsx | Shared UI | 2 |
| features/project/components/task-detail/task-status-picker.tsx | Shared UI | 0 |
| features/project/components/task-detail/task-subtasks-section.tsx | Shared UI | 0 |
| features/project/components/ui/avatar-stack.tsx | Shared UI | 0 |
| features/project/components/ui/project-confirm-dialog.tsx | Shared UI | 0 |
| features/project/components/ui/project-form-controls.tsx | Shared UI | 0 |
| features/project/components/ui/project-preview-card.tsx | Layout / content / vendor | 0 |
| features/project/components/ui/status-badge.tsx | Shared UI | 0 |
| features/project/components/ui/task-card.tsx | Shared UI | 1 |
| features/project/components/ui/task-chat-button.tsx | Shared UI | 0 |
| features/project/components/ui/task-label-badges.tsx | Shared UI | 0 |
| features/project/components/ui/task-quick-filters.tsx | Composed UI | 0 |
| features/project/components/views/board-view.tsx | Shared UI | 0 |
| features/project/components/views/calendar-view.tsx | Shared UI | 0 |
| features/project/components/views/gantt-view.tsx | Shared UI | 1 |
| features/project/components/views/list-view.tsx | Composed UI | 0 |
| features/project/components/views/project-documents-view.tsx | Composed UI | 0 |
| features/project/components/views/project-members-view.tsx | Shared UI | 0 |
| features/project/components/views/summary-view.tsx | Composed UI | 0 |
| features/project/screens/project-detail-screen.tsx | Composed UI | 0 |
| features/project/screens/project-invitations-screen.tsx | Shared UI | 0 |
| features/project/screens/projects-screen.tsx | Shared UI | 0 |
| features/user-setting/components/account-theme-sync.tsx | Layout / content / vendor | 0 |
| features/user-setting/components/password-input.tsx | Shared UI | 1 |
| features/user-setting/components/password-tab.tsx | Shared UI | 0 |
| features/user-setting/components/pomodoro-tab.tsx | Shared UI | 0 |
| features/user-setting/components/profile-tab.tsx | Shared UI | 1 |
| features/user-setting/components/revoke-session-modal.tsx | Shared UI | 0 |
| features/user-setting/components/sessions-tab.tsx | Shared UI | 0 |
| features/user-setting/components/settings-tab.tsx | Shared UI | 0 |
| features/user-setting/components/ui/setting-form-controls.tsx | Shared UI | 0 |
| features/user-setting/components/user-settings-modal.tsx | Shared UI | 0 |
| features/user-setting/hooks/use-settings-draft.tsx | Layout / content / vendor | 0 |
| store/query-provider.tsx | Layout / content / vendor | 0 |
| store/store-provider.tsx | Layout / content / vendor | 0 |
