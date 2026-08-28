import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { notificationsApi } from '@/api/notifications.api';
import { formatRelativeTime } from '@/lib/format-datetime';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { resolveNotificationUrl } from '@/lib/resolve-notification-url';
import { cn } from '@/lib/utils';

function extractNotificationList(res) {
  const payload = res?.data?.data;
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

const LEVEL_STYLES = {
  error: {
    icon: AlertCircle,
    iconWrap: 'bg-red-500/10 text-red-600 dark:text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    iconWrap: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  success: {
    icon: CheckCircle2,
    iconWrap: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  info: {
    icon: Info,
    iconWrap: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
};

function getLevelStyle(level, title) {
  if (level && LEVEL_STYLES[level]) return LEVEL_STYLES[level];
  if (/login success/i.test(title || '')) return LEVEL_STYLES.success;
  if (/failed login/i.test(title || '')) return LEVEL_STYLES.warning;
  return {
    icon: Bell,
    iconWrap: 'bg-muted text-muted-foreground',
  };
}

function getTimeGroup(createdAtIso) {
  if (!createdAtIso) return 'Earlier';
  const date = new Date(createdAtIso);
  if (Number.isNaN(date.getTime())) return 'Earlier';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfToday) return 'Today';
  if (date >= startOfYesterday) return 'Yesterday';
  return 'Earlier';
}

function groupNotifications(notifications) {
  const groups = new Map();
  notifications.forEach((notification) => {
    const label = getTimeGroup(notification.created_at_iso);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(notification);
  });

  const order = ['Today', 'Yesterday', 'Earlier'];
  return order
    .filter((label) => groups.has(label))
    .map((label) => ({ label, items: groups.get(label) }));
}

function NotificationItem({ notification, onSelect, showCompany }) {
  const { title, message, is_read, created_at_iso, level, company_name } = notification;
  const { icon: Icon, iconWrap } = getLevelStyle(level, title);
  const timeLabel =
    formatRelativeTime(created_at_iso) || notification.created_at_display;

  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className={cn(
        'group relative flex w-full gap-3 rounded-xl border px-3 py-3 text-start transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        is_read
          ? 'border-transparent hover:border-border hover:bg-muted/50'
          : 'border-primary/15 bg-primary/[0.05] hover:border-primary/30 hover:bg-primary/[0.08]',
      )}
    >
      {!is_read ? (
        <span
          className="absolute inset-y-2.5 start-0 w-[3px] rounded-full bg-primary"
          aria-hidden
        />
      ) : null}

      <span
        className={cn(
          'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-105',
          iconWrap,
        )}
      >
        <Icon className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'text-sm leading-snug',
              !is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground/90',
            )}
          >
            {title}
          </p>
          <span className="shrink-0 pt-0.5 text-[11px] tabular-nums text-muted-foreground/80">
            {timeLabel}
          </span>
        </div>
        {showCompany && company_name ? (
          <span className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            {company_name}
          </span>
        ) : null}
        {message ? (
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground line-clamp-2">
            {message}
          </p>
        ) : null}
      </div>
    </button>
  );
}

function NotificationList({
  loading,
  notifications,
  onSelect,
  onRefresh,
  refreshing,
  showCompany,
}) {
  const grouped = useMemo(
    () => groupNotifications(notifications),
    [notifications],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2.5 py-16">
        <Loader2 className="size-6 animate-spin text-primary/70" />
        <p className="text-xs text-muted-foreground">Loading notifications…</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/40 ring-1 ring-border/60">
          <BellOff className="size-6 text-muted-foreground/70" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">You're all caught up</p>
          <p className="mx-auto max-w-[230px] text-xs leading-relaxed text-muted-foreground">
            Alerts and activity will show here when something needs your attention.
          </p>
        </div>
        {onRefresh ? (
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onRefresh}>
            <RefreshCw className={cn('mr-1 size-3.5', refreshing && 'animate-spin')} />
            Refresh
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-5 px-3 pb-4 pt-3">
      {grouped.map(({ label, items }) => (
        <section key={label} className="space-y-1.5">
          <div className="sticky top-0 z-10 -mx-3 flex items-center gap-2 bg-background/95 px-3 py-1.5 backdrop-blur">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </h3>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {items.length}
            </span>
            <span className="h-px flex-1 bg-border/60" />
          </div>
          <div className="space-y-1">
            {items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onSelect={onSelect}
                showCompany={showCompany}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/**
 * @param {'account'|'workspace'} scope
 *   account — all owned companies (account owner bar)
 *   workspace — active company only
 */
export function NotificationsSheet({ trigger, scope = 'workspace' }) {
  const client = useMemo(() => notificationsApi(scope), [scope]);
  const showCompany = scope === 'account';
  const subtitle =
    scope === 'account'
      ? 'All companies you own'
      : 'This company workspace';

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await client.list({ status: 'unread', per_page: 1 });
      setUnreadCount(res.data.meta?.unread_count ?? 0);
    } catch {
      setUnreadCount(0);
    }
  }, [client]);

  const loadNotifications = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const res = await client.list({ per_page: 40 });
        const list = extractNotificationList(res);
        setNotifications(list);
        setUnreadCount(res.data.meta?.unread_count ?? 0);
        return list;
      } catch (err) {
        setNotifications([]);
        toast.error(err?.response?.data?.message || 'Failed to load notifications');
        return [];
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [client],
  );

  const markRead = useCallback(
    async (notification) => {
      if (!notification?.id || notification.is_read) return;
      try {
        const res = await client.markRead(notification.id);
        setUnreadCount(res.data?.data?.unread_count ?? 0);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n,
          ),
        );
      } catch {
        // Non-blocking
      }
    },
    [client],
  );

  const markAllRead = useCallback(async () => {
    try {
      await client.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not mark notifications as read');
    }
  }, [client]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!open) return;
    loadNotifications();
  }, [open, loadNotifications]);

  const handleSelect = async (notification) => {
    await markRead(notification);

    const url = resolveNotificationUrl(notification.url, notification);
    if (url && url !== '#') {
      setOpen(false);
      try {
        const parsed = new URL(url, window.location.origin);
        if (parsed.origin === window.location.origin) {
          window.location.assign(parsed.pathname + parsed.search + parsed.hash);
        } else {
          window.location.assign(url);
        }
      } catch {
        window.location.assign(url);
      }
    }
  };

  const totalCount = notifications.length;
  const unreadInList = notifications.filter((n) => !n.is_read).length;
  const visibleNotifications = useMemo(
    () => (filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications),
    [filter, notifications],
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <div className="relative inline-flex">
          {trigger}
          {unreadCount > 0 ? (
            <Badge
              variant="destructive"
              shape="circle"
              size="xs"
              className="absolute -top-0.5 -end-0.5 min-w-4 h-4 px-1 text-[10px] font-semibold pointer-events-none ring-2 ring-background"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          ) : null}
        </div>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="flex flex-col gap-0 w-full sm:max-w-[404px] inset-y-2 end-2 h-[calc(100%-1rem)] rounded-2xl border border-border/80 p-0 shadow-2xl overflow-hidden [&_[data-slot=sheet-close]]:top-3.5 [&_[data-slot=sheet-close]]:end-3.5"
      >
        <SheetHeader className="shrink-0 gap-0 border-b bg-gradient-to-b from-muted/40 to-transparent px-4 pb-3 pt-4">
          <div className="flex items-center justify-between gap-2 pe-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
                <Bell className="size-[18px]" />
                {unreadInList > 0 ? (
                  <span className="absolute -end-0.5 -top-0.5 size-2.5 rounded-full bg-primary ring-2 ring-background" />
                ) : null}
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-base font-semibold leading-tight">
                  Notifications
                </SheetTitle>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {unreadInList > 0
                    ? `${unreadInList} unread · ${subtitle}`
                    : subtitle}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
              disabled={loading || refreshing}
              onClick={() => loadNotifications({ silent: true })}
              title="Refresh"
            >
              <RefreshCw
                className={cn('size-4', (loading || refreshing) && 'animate-spin')}
              />
            </Button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="inline-flex rounded-lg bg-muted/70 p-0.5 ring-1 ring-inset ring-border/50">
              {[
                { key: 'all', label: 'All', count: totalCount },
                { key: 'unread', label: 'Unread', count: unreadInList },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                    filter === key
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                  {count > 0 ? (
                    <span
                      className={cn(
                        'rounded-full px-1.5 text-[10px] tabular-nums',
                        filter === key
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted-foreground/15 text-muted-foreground',
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            {unreadInList > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs text-primary hover:text-primary"
                onClick={markAllRead}
              >
                <CheckCheck className="size-3.5" />
                Mark all read
              </Button>
            ) : null}
          </div>
        </SheetHeader>

        <SheetBody className="min-h-0 grow p-0">
          <ScrollArea className="h-full">
            <NotificationList
              loading={loading}
              notifications={visibleNotifications}
              onSelect={handleSelect}
              onRefresh={() => loadNotifications({ silent: true })}
              refreshing={refreshing}
              showCompany={showCompany}
            />
          </ScrollArea>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
