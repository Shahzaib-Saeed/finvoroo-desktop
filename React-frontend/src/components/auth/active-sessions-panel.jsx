import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, LogOut, MonitorSmartphone, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { sessionsApi } from '@/auth/api/sessions.api';
import { useAuthStore } from '@/store/authStore';
import { Badge } from '@/components/ui/base-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatSessionTime,
  sessionDeviceIcon,
  sessionSubtitle,
} from '@/components/auth/active-sessions-lib';
import { cn } from '@/lib/utils';

export function ActiveSessionsPanel({
  variant = 'compact',
  showActions = false,
  profileLink = '/profile?section=security',
  className,
}) {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await sessionsApi.list();
      setSessions(res.data?.data?.sessions ?? []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load active sessions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const otherCount = sessions.filter((s) => !s.is_current).length;

  const handleRevoke = async (session) => {
    if (!session?.id) return;
    setRevokingId(session.id);
    try {
      const res = await sessionsApi.revoke(session.id);
      if (res.data?.data?.revoked_current) {
        toast.success('Signed out on this device');
        await logout();
        return;
      }
      toast.success('Device signed out');
      await load(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not sign out device');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeOthers = async () => {
    setRevokingOthers(true);
    try {
      const res = await sessionsApi.revokeOthers();
      const count = res.data?.data?.revoked_count ?? 0;
      toast.success(count > 0 ? `Signed out ${count} other device(s)` : 'No other sessions to sign out');
      await load(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not sign out other devices');
    } finally {
      setRevokingOthers(false);
    }
  };

  const isFull = variant === 'full';

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className={cn('py-5 min-h-0', isFull ? 'flex-row items-center justify-between gap-3 space-y-0' : '')}>
        <div>
          <CardTitle className="flex items-center gap-2">
            <MonitorSmartphone className="size-4 text-primary" />
            Active sessions
          </CardTitle>
          {!isFull ? (
            <p className="text-sm text-muted-foreground mt-1 mb-0">
              {loading
                ? 'Loading devices…'
                : `${sessions.length} device${sessions.length === 1 ? '' : 's'} signed in`}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => load(true)}
            disabled={loading || refreshing}
            title="Refresh sessions"
          >
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isFull ? (
          <p className="text-sm text-secondary-foreground mb-0">
            These are the browsers and devices currently signed in as{' '}
            <span className="font-medium text-foreground">{user?.email || 'your account'}</span>.
            Sign out any session you do not recognize.
          </p>
        ) : (
          <p className="text-sm text-secondary-foreground mb-0">
            Devices currently signed in to your account.
            {!showActions && profileLink ? (
              <>
                {' '}
                Manage sessions in{' '}
                <Link to={profileLink} className="text-primary hover:underline">
                  profile settings
                </Link>
                .
              </>
            ) : null}
          </p>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active sessions found.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map((session) => {
              const DeviceIcon = sessionDeviceIcon(session.device_type);
              const busy = revokingId === session.id;

              return (
                <div
                  key={session.id}
                  className="flex items-start justify-between gap-3 rounded-lg border bg-muted/20 p-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-background border">
                      <DeviceIcon className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium truncate">
                          {session.name || session.device_label || 'Session'}
                        </span>
                        {session.is_current ? (
                          <Badge size="xs" variant="success" appearance="light">
                            This device
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{sessionSubtitle(session)}</p>
                      <p className="text-xs text-muted-foreground">
                        Last active {formatSessionTime(session.last_used_at || session.created_at)}
                      </p>
                    </div>
                  </div>

                  {showActions && !session.is_current ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      disabled={busy || revokingOthers}
                      onClick={() => handleRevoke(session)}
                    >
                      {busy ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                      Sign out
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {showActions && otherCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || revokingOthers || revokingId != null}
              onClick={handleRevokeOthers}
            >
              {revokingOthers ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
              Sign out all other devices ({otherCount})
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
