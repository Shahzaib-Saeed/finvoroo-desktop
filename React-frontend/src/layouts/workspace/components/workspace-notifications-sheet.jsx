import { NotificationsSheet } from '@/components/notifications/notifications-sheet';

export function WorkspaceNotificationsSheet(props) {
  return <NotificationsSheet {...props} scope="workspace" />;
}

/** @deprecated Use WorkspaceNotificationsSheet */
export const WorkspaceNotificationsDropdown = WorkspaceNotificationsSheet;
