import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
 * Share a saved report definition with a role or a specific user.
 * Calls the same App\Http\Controllers\Api\V1\Workspace\ReportCenterController
 * ::share() endpoint from Phase 2 — this modal is the UI Phase 2 always
 * intended but didn't build yet, since the builder toolbar is the first
 * place a user actually has a saved report to share.
 *
 * `roleOptions`/`userOptions` are passed in as [{value, label}] — the
 * caller is responsible for sourcing them (e.g. the workspace's existing
 * roles/users API), keeping this component focused on the share action.
 */
export function ReportShareModal({
  definitionId,
  roleOptions = [],
  userOptions = [],
  trigger,
  open: openProp,
  onOpenChange,
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const setOpen = (next) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const [targetType, setTargetType] = useState('role');
  const [targetId, setTargetId] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);

  const options = targetType === 'role' ? roleOptions : userOptions;

  const handleShare = async () => {
    if (!targetId) return;
    setSharing(true);
    try {
      await reportCenterApi.shareDefinition(definitionId, {
        shared_with_type: targetType,
        shared_with_id: Number(targetId),
        permission_level: 'view',
      });
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled ? (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="no-print h-8 gap-1.5 px-3 text-xs">
              <Share2 className="size-3" />
              Share
            </Button>
          )}
        </DialogTrigger>
      ) : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share report</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Share with</Label>
            <Select value={targetType} onValueChange={(v) => { setTargetType(v); setTargetId(''); }}>
              <SelectTrigger className="mt-1 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="role">A role</SelectItem>
                <SelectItem value="user">A specific user</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">{targetType === 'role' ? 'Role' : 'User'}</Label>
            {options.length > 0 ? (
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger className="mt-1 h-8 text-sm">
                  <SelectValue placeholder={`Select a ${targetType}`} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input className="mt-1 h-8 text-sm" value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder={`${targetType} id`} />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button size="sm" onClick={handleShare} disabled={!targetId || sharing}>
            {shared ? 'Shared' : sharing ? 'Sharing…' : 'Share'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
