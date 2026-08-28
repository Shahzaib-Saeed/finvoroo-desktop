import { ActiveSessionsPanel } from '@/components/auth/active-sessions-panel';

export function HomeActiveSessions() {
  return <ActiveSessionsPanel variant="compact" showActions={false} profileLink="/profile?section=security" />;
}
