import { useState } from 'react';
import { BookmarkPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { reportCenterApi } from '../api/report-center.api';

/**
 * "Save as..." toolbar action for a standard report page — saves the
 * current filter parameters as a private AccReportDefinition
 * (source_type=standard) so it reappears under My Reports / Favorites
 * in the Reports & Analytics Center hub. Does not change how the report
 * itself fetches or renders data.
 *
 * Reusable across every standard report page: pass `standardReportKey`
 * (matches App\Domain\Reporting\Catalog\StandardReportCatalog) and the
 * current filter params as a plain object.
 */
export function SaveReportButton({ standardReportKey, params, defaultName }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await reportCenterApi.createDefinition({
        source_type: 'standard',
        standard_report_key: standardReportKey,
        name: name.trim(),
        definition: params,
        visibility: 'private',
      });
      setSaved(true);
      setTimeout(() => {
        setOpen(false);
        setSaved(false);
      }, 900);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="no-print h-8 gap-1.5 px-3 text-xs">
          <BookmarkPlus className="size-3" />
          Save
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save report</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="save-report-name">Name</Label>
          <Input
            id="save-report-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q1 General Ledger — Cash accounts"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Saved privately with the current filters. Find it later under My Reports.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim() || saving}>
            {saved ? 'Saved' : saving ? 'Saving…' : 'Save report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
