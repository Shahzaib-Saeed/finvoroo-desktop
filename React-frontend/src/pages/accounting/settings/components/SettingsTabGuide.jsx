import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const GUIDES = {
  profile: {
    title: 'Company profile',
    body: 'Legal name, logo, fiscal calendar, and address appear on invoices, reports, and customer-facing documents.',
  },
  inventory: {
    title: 'Inventory costing',
    body: 'Choose how stock value flows when you sell or adjust inventory. Changing model affects future transactions only.',
  },
  approval: {
    title: 'Approval workflow',
    body: 'Turn on approvals per document type so drafts must be authorized before posting or sending.',
  },
  posting: {
    title: 'Posting & billing',
    body: 'Enable offline sync, control automatic journal entries, chart visibility, and sales-order billing.',
  },
  'portal-color': {
    title: 'Portal appearance',
    body: 'Theme accent for buttons and highlights across this workspace. Saved in your browser.',
  },
  navigation: {
    title: 'Navigation layout',
    body: 'Choose sidebar or top navigation, and whether Point of Sale appears in the Sales menu.',
  },
  'custom-fields': {
    title: 'Transaction custom fields',
    body: 'One field definition can appear on multiple document types. Job-order values copy to linked bills and expenses when those screens are enabled.',
  },
};

export function SettingsTabGuide({ activeTab }) {
  const guide = GUIDES[activeTab];
  if (!guide) return null;

  return (
    <Card className="shadow-sm bg-primary/[0.03] border-primary/15">
      <CardHeader className="px-6 pt-6 pb-2 min-h-0 border-0">
        <CardTitle className="text-sm font-semibold text-primary">{guide.title}</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        <p className="text-sm text-muted-foreground leading-relaxed">{guide.body}</p>
      </CardContent>
    </Card>
  );
}
