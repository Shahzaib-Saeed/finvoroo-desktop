import { Mail, Phone, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { timezoneLabel } from '@/lib/timezone-options';

export function ProfileContact({ user, loading }) {
  if (loading) {
    return <Skeleton className="h-44 w-full rounded-xl" />;
  }

  const rows = [
    { icon: Mail, text: user?.email || '—', href: user?.email ? `mailto:${user.email}` : null },
    { icon: Phone, text: user?.phone || 'Not set' },
    { icon: Clock, text: timezoneLabel(user?.timezone || 'UTC') },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid gap-4">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <div key={row.text} className="flex items-center gap-2.5">
                <Icon className="text-lg text-muted-foreground shrink-0" size={18} />
                {row.href ? (
                  <a href={row.href} className="text-mono hover:text-primary text-sm break-all">
                    {row.text}
                  </a>
                ) : (
                  <span className="text-mono text-sm">{row.text}</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
