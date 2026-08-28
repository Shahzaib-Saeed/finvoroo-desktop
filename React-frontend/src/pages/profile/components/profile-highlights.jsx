import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { timezoneLabel } from '@/lib/timezone-options';

function formatMemberSince(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function ProfileHighlights({ user, loading }) {
  if (loading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  const items = [
    { label: 'Full name:', info: user?.name || '—' },
    { label: 'Email:', info: user?.email || '—' },
    {
      label: 'Role:',
      info: (
        <Badge size="md" variant="secondary" className="capitalize">
          {(user?.role || 'user').replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      label: 'Status:',
      info: (
        <Badge size="md" variant="success" appearance="light">
          Active
        </Badge>
      ),
    },
    { label: 'Timezone:', info: timezoneLabel(user?.timezone || 'UTC') },
    { label: 'Member since:', info: formatMemberSince(user?.created_at) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Highlights</CardTitle>
      </CardHeader>
      <CardContent className="pt-3.5 pb-3.5">
        <Table>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.label} className="border-0">
                <TableCell className="text-sm text-secondary-foreground pb-3 pe-4 lg:pe-10 py-2">
                  {item.label}
                </TableCell>
                <TableCell className="text-sm text-mono pb-3 py-2">{item.info}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
