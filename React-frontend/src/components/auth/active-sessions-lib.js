import { Laptop, Monitor, Smartphone, Tablet } from 'lucide-react';

export function sessionDeviceIcon(deviceType = 'desktop') {
  if (deviceType === 'mobile') return Smartphone;
  if (deviceType === 'tablet') return Tablet;
  if (deviceType === 'desktop') return Laptop;
  return Monitor;
}

export function formatSessionTime(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function sessionSubtitle(session) {
  const parts = [];
  if (session?.browser && session.browser !== 'Browser') parts.push(session.browser);
  if (session?.platform) parts.push(session.platform);
  if (session?.ip_address) parts.push(session.ip_address);
  return parts.length ? parts.join(' · ') : 'Web session';
}
