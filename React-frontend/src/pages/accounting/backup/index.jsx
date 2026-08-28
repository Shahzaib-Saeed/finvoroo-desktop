import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  AlertTriangle,
  Archive,
  Cloud,
  CloudOff,
  Clock,
  Download,
  HardDriveDownload,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { backupsApi, downloadBackupFile } from './api/backups.api';
import { useCan } from '@/hooks/use-can';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertIcon, AlertTitle } from '@/components/ui/alert';

const SOURCE_LABELS = {
  manual: 'Manual',
  scheduled: 'Automatic',
  pre_restore: 'Safety backup',
};

const SOURCE_COLORS = {
  manual: 'bg-blue-50 text-blue-700 border-blue-200',
  scheduled: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pre_restore: 'bg-amber-50 text-amber-800 border-amber-200',
};

const TYPE_LABELS = {
  database: 'Database',
  files: 'Files',
  complete: 'Complete',
};

const STATUS_LABELS = {
  pending: 'Queued',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  restoring: 'Restoring',
  restored: 'Restored',
};

const STATUS_COLORS = {
  pending: 'bg-slate-50 text-slate-700 border-slate-200',
  running: 'bg-sky-50 text-sky-700 border-sky-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  restoring: 'bg-amber-50 text-amber-800 border-amber-200',
  restored: 'bg-violet-50 text-violet-700 border-violet-200',
};

const ACTIVE_STATUSES = new Set(['pending', 'running', 'restoring']);
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'restored']);

function formatNextRun(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function PreviewGrid({ preview }) {
  if (!preview) return null;
  const rows = [
    ['Company', preview.company_name || `ID ${preview.company_id || '—'}`],
    ['Backup date', preview.created_at_display || formatNextRun(preview.exported_at || preview.created_at) || '—'],
    ['Type', TYPE_LABELS[preview.type] || preview.type || '—'],
    ['ERP / app version', preview.app_version || '—'],
    ['Backup version', preview.backup_version ?? '—'],
    ['Archive size', preview.file_size_display || '—'],
    ['Database tables', preview.table_count?.toLocaleString?.() ?? preview.table_count ?? '—'],
    ['Database rows', preview.row_count?.toLocaleString?.() ?? preview.row_count ?? '—'],
    ['Files', `${preview.files_count ?? 0} (${preview.files_size_display || '0 B'})`],
    ['Encrypted', preview.encrypted ? 'Yes' : 'No'],
  ];

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium text-right break-all">{value}</span>
        </div>
      ))}
      {preview.warnings?.length ? (
        <ul className="mt-2 space-y-1 text-xs text-amber-700">
          {preview.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function DataBackupPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef(null);
  const prevStatusesRef = useRef({});

  const canCreate = useCan('backup.create');
  const canEdit = useCan('backup.edit');
  const canRestore = useCan('backup.restore');
  const canDelete = useCan('backup.delete');
  const canDownload = canCreate || canRestore;

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [cloud, setCloud] = useState(null);
  const [backupType, setBackupType] = useState('complete');
  const [settings, setSettings] = useState({
    auto_backup_enabled: false,
    auto_backup_frequency: 'daily',
    retention_days: 30,
    retention_count: 30,
    auto_backup_time: '02:00',
    default_backup_type: 'complete',
    next_scheduled_at: null,
    last_backup_at: null,
    storage_used_display: '0 B',
  });
  const [restorePreview, setRestorePreview] = useState(null);
  const [restoreUploadFile, setRestoreUploadFile] = useState(null);
  const [restoreRow, setRestoreRow] = useState(null);
  const [restoreStep, setRestoreStep] = useState(null); // 'preview' | 'confirm'
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmBackupNow, setConfirmBackupNow] = useState(false);
  const [confirmCloudDisconnect, setConfirmCloudDisconnect] = useState(false);
  const [errorDetail, setErrorDetail] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const hasActiveJob = useMemo(
    () =>
      Boolean(meta?.has_active_job) ||
      rows.some((r) => ACTIVE_STATUSES.has(r.status)),
    [meta, rows],
  );

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const [settingsRes, listRes, cloudRes] = await Promise.all([
        backupsApi.settings(),
        backupsApi.list({ per_page: 50 }),
        backupsApi.cloudStatus().catch(() => null),
      ]);
      const nextSettings = settingsRes.data?.data || {};
      setSettings((prev) => ({ ...prev, ...nextSettings }));
      if (nextSettings.default_backup_type) {
        setBackupType(nextSettings.default_backup_type);
      }

      const nextRows = listRes.data?.data ?? [];
      const prev = prevStatusesRef.current;
      for (const row of nextRows) {
        const before = prev[row.id];
        if (before && ACTIVE_STATUSES.has(before) && TERMINAL_STATUSES.has(row.status)) {
          if (row.status === 'completed') toast.success(`Backup completed: ${row.filename}`);
          if (row.status === 'restored') toast.success('Restore completed');
          if (row.status === 'failed') {
            toast.error(row.error_message || `Job failed: ${row.filename}`);
          }
        }
      }
      prevStatusesRef.current = Object.fromEntries(nextRows.map((r) => [r.id, r.status]));

      setRows(nextRows);
      setMeta(listRes.data?.meta || {});
      if (cloudRes?.data?.data) setCloud(cloudRes.data.data);
    } catch (err) {
      if (!quiet) {
        toast.error(err?.response?.data?.message || 'Failed to load backup settings');
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const cloudParam = searchParams.get('cloud');
    const cloudError = searchParams.get('cloud_backup');
    const message = searchParams.get('message');
    if (cloudParam === 'connected') {
      toast.success('Google Drive connected');
      searchParams.delete('cloud');
      setSearchParams(searchParams, { replace: true });
      load({ quiet: true });
    }
    if (cloudError === 'error') {
      toast.error(message || 'Google Drive connection failed');
      searchParams.delete('cloud_backup');
      searchParams.delete('message');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, load]);

  useEffect(() => {
    if (!hasActiveJob) return undefined;

    const tick = () => {
      if (document.hidden) return;
      load({ quiet: true });
    };

    const onVisible = () => {
      if (!document.hidden) load({ quiet: true });
    };

    const id = window.setInterval(tick, 2500);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [hasActiveJob, load]);

  const saveSettings = async (patch) => {
    if (!canEdit) {
      toast.error('You do not have permission to change backup settings');
      return;
    }
    setSavingSettings(true);
    try {
      const res = await backupsApi.updateSettings(patch);
      setSettings((prev) => ({ ...prev, ...(res.data?.data || patch) }));
      toast.success('Backup settings saved');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const res = await backupsApi.create({ type: backupType });
      toast.success(res.data?.message || 'Backup started');
      setConfirmBackupNow(false);
      await load({ quiet: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not create backup');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (row) => {
    if (!canDownload) {
      toast.error('You do not have permission to download backups');
      return;
    }
    try {
      await downloadBackupFile(row.id, row.filename);
    } catch (err) {
      toast.error(err?.message || 'Download failed');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete || !canDelete) return;
    setDeleting(true);
    try {
      await backupsApi.remove(confirmDelete.id);
      toast.success('Backup deleted');
      setConfirmDelete(null);
      load({ quiet: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete backup');
    } finally {
      setDeleting(false);
    }
  };

  const openRestoreFromRow = async (row) => {
    if (!canRestore) return;
    setPreviewLoading(true);
    setRestoreRow(row);
    setRestoreUploadFile(null);
    setRestoreConfirmText('');
    try {
      const res = await backupsApi.preview(row.id);
      setRestorePreview(res.data?.data || null);
      setRestoreStep('preview');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not load restore preview');
      setRestoreRow(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!canRestore) {
      toast.error('You do not have permission to restore');
      e.target.value = '';
      return;
    }
    const name = file.name.toLowerCase();
    if (!name.endsWith('.json') && !name.endsWith('.zip') && !name.endsWith('.zip.enc') && !name.endsWith('.enc')) {
      toast.error('Please upload a .zip, .zip.enc, or .json backup file');
      e.target.value = '';
      return;
    }
    setPreviewLoading(true);
    setRestoreUploadFile(file);
    setRestoreRow(null);
    setRestoreConfirmText('');
    try {
      const res = await backupsApi.previewUpload(file);
      setRestorePreview(res.data?.data || null);
      setRestoreStep('preview');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Invalid backup file');
      setRestoreUploadFile(null);
      e.target.value = '';
    } finally {
      setPreviewLoading(false);
    }
  };

  const closeRestoreDialog = () => {
    if (restoring) return;
    setRestoreStep(null);
    setRestorePreview(null);
    setRestoreRow(null);
    setRestoreUploadFile(null);
    setRestoreConfirmText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRestoreConfirm = async () => {
    if (!canRestore) return;
    setRestoring(true);
    try {
      if (restoreRow) {
        const res = await backupsApi.restoreById(restoreRow.id);
        toast.success(res.data?.message || 'Restore started');
      } else if (restoreUploadFile) {
        const res = await backupsApi.restoreUpload(restoreUploadFile);
        toast.success(res.data?.message || 'Restore started');
      }
      closeRestoreDialog();
      await load({ quiet: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Restore failed');
    } finally {
      setRestoring(false);
    }
  };

  const handleCloudConnect = async () => {
    if (!canEdit) return;
    setCloudBusy(true);
    try {
      const res = await backupsApi.cloudConnect();
      const url = res.data?.data?.authorization_url;
      if (!url) throw new Error('No authorization URL returned');
      window.location.href = url;
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Could not start Google Drive connect');
      setCloudBusy(false);
    }
  };

  const handleCloudDisconnect = async () => {
    if (!canEdit) return;
    setCloudBusy(true);
    try {
      await backupsApi.cloudDisconnect();
      toast.success('Google Drive disconnected');
      setConfirmCloudDisconnect(false);
      await load({ quiet: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not disconnect');
    } finally {
      setCloudBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const restoreReady = restoreConfirmText.trim().toUpperCase() === 'RESTORE';
  const latestFailed = rows.find((r) => r.status === 'failed');
  const panelClass =
    'rounded-xl border border-foreground/[0.14] bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_16px_rgba(15,23,42,0.06)] overflow-hidden';
  const panelHeaderClass =
    'border-b border-foreground/[0.09] bg-gradient-to-b from-muted/60 to-muted/30 px-4 py-3 sm:px-5';
  const cloudReady = Boolean(cloud?.configured);
  const cloudConnected = Boolean(cloud?.connected);

  return (
    <div className="space-y-5 w-full min-w-0">
      <PageHeader
        title="Data backup & restore"
        subtitle="Encrypted backups, one-click restore, and Google Drive cloud storage for every workspace."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => load()}>
              <RefreshCw className="size-4 mr-1" /> Refresh
            </Button>
            {canCreate ? (
              <Button
                size="sm"
                onClick={() => setConfirmBackupNow(true)}
                disabled={creating || hasActiveJob}
              >
                {creating || hasActiveJob ? (
                  <Loader2 className="size-4 mr-1 animate-spin" />
                ) : (
                  <HardDriveDownload className="size-4 mr-1" />
                )}
                Backup now
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label: 'Last successful backup',
            value: settings.last_backup_at
              ? formatNextRun(settings.last_backup_at)
              : 'None yet',
          },
          {
            label: 'Next scheduled run',
            value: settings.auto_backup_enabled
              ? formatNextRun(settings.next_scheduled_at) || 'Pending'
              : 'Automatic backups off',
          },
          {
            label: 'Server storage used',
            value: settings.storage_used_display || meta.storage_used_display || '0 B',
          },
        ].map((stat) => (
          <div key={stat.label} className={`${panelClass} px-4 py-4`}>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1.5 text-sm font-semibold tracking-tight text-foreground">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {hasActiveJob ? (
        <Alert>
          <AlertIcon>
            <Loader2 className="animate-spin" />
          </AlertIcon>
          <div>
            <AlertTitle>Backup job in progress</AlertTitle>
            <AlertDescription>
              A backup or restore is running. This page refreshes automatically until it finishes.
            </AlertDescription>
          </div>
        </Alert>
      ) : null}

      {latestFailed && !hasActiveJob ? (
        <Alert variant="destructive" appearance="light">
          <AlertIcon>
            <AlertTriangle />
          </AlertIcon>
          <div className="flex-1">
            <AlertTitle>Recent job failed</AlertTitle>
            <AlertDescription>
              {latestFailed.filename}: {latestFailed.error_message || 'See history for details.'}
            </AlertDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setErrorDetail(latestFailed)}>
            Details
          </Button>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className={`${panelClass} xl:col-span-7`}>
          <div className={panelHeaderClass}>
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                <ShieldCheck className="size-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold tracking-tight">Automatic backups</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Schedule encrypted backups with retention controls
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-5 space-y-5">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-foreground/[0.10] bg-muted/25 p-4">
              <div>
                <Label htmlFor="auto-backup" className="text-sm font-medium">
                  Enable automatic backups
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended — protects against accidental data loss.
                </p>
              </div>
              <Switch
                id="auto-backup"
                checked={settings.auto_backup_enabled}
                disabled={savingSettings || !canEdit}
                onCheckedChange={(checked) =>
                  saveSettings({ auto_backup_enabled: checked })
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Frequency</Label>
                <Select
                  value={settings.auto_backup_frequency}
                  disabled={savingSettings || !canEdit}
                  onValueChange={(val) => saveSettings({ auto_backup_frequency: val })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Preferred time (server)</Label>
                <Input
                  type="time"
                  className="h-10"
                  value={settings.auto_backup_time || '02:00'}
                  disabled={savingSettings || !canEdit}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, auto_backup_time: e.target.value }))
                  }
                  onBlur={() =>
                    saveSettings({ auto_backup_time: settings.auto_backup_time })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Default backup type</Label>
                <Select
                  value={settings.default_backup_type || 'complete'}
                  disabled={savingSettings || !canEdit}
                  onValueChange={(val) => saveSettings({ default_backup_type: val })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="database">Database only</SelectItem>
                    <SelectItem value="files">Files only</SelectItem>
                    <SelectItem value="complete">Complete (DB + files)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Keep backups for (days)</Label>
                <Input
                  type="number"
                  min={7}
                  max={365}
                  className="h-10"
                  value={settings.retention_days}
                  disabled={savingSettings || !canEdit}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      retention_days: Number(e.target.value) || 30,
                    }))
                  }
                  onBlur={() =>
                    saveSettings({ retention_days: settings.retention_days })
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-sm">Max backups to keep</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  className="h-10"
                  value={settings.retention_count ?? 30}
                  disabled={savingSettings || !canEdit}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      retention_count: Number(e.target.value) || 30,
                    }))
                  }
                  onBlur={() =>
                    saveSettings({ retention_count: settings.retention_count })
                  }
                />
              </div>
            </div>

            <div className="rounded-xl bg-muted/40 border border-foreground/[0.08] px-3 py-2.5 text-xs text-muted-foreground flex items-start gap-2">
              <Clock className="size-4 shrink-0 mt-0.5" />
              <span>
                Archives are AES-256-GCM encrypted at rest. Scheduled runs honor{' '}
                <strong className="text-foreground">{settings.auto_backup_time || '02:00'}</strong>{' '}
                server time. Completed backups also sync to Google Drive when connected.
              </span>
            </div>
          </div>
        </div>

        <div className="xl:col-span-5 space-y-4">
          <div
            className={`${panelClass} ring-1 ring-primary/20 border-primary/25`}
          >
            <div className={`${panelHeaderClass} bg-primary/[0.05]`}>
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Cloud className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold tracking-tight">Cloud storage</h3>
                    {cloudConnected ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200"
                      >
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                        Available
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Sync completed backups to your Google Drive (encrypted)
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              {!cloudReady ? (
                <div className="rounded-xl border border-dashed border-foreground/15 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                  Google Drive is not configured on this server yet. Ask your administrator to set{' '}
                  <code className="text-xs text-foreground">GOOGLE_DRIVE_*</code> credentials.
                </div>
              ) : cloudConnected ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 text-sm">
                    <p className="font-semibold text-foreground">
                      {cloud.account_email || 'Google account connected'}
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Folder: {cloud.folder_name || 'Finvoroo ERP Backups'}
                    </p>
                    {cloud.last_synced_at ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last sync: {formatNextRun(cloud.last_synced_at)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">
                        Next completed backup will upload automatically.
                      </p>
                    )}
                    {cloud.last_error ? (
                      <p className="text-xs text-destructive mt-2">{cloud.last_error}</p>
                    ) : null}
                  </div>
                  {canEdit ? (
                    <Button
                      variant="outline"
                      className="w-full h-10"
                      disabled={cloudBusy}
                      onClick={() => setConfirmCloudDisconnect(true)}
                    >
                      {cloudBusy ? (
                        <Loader2 className="size-4 mr-2 animate-spin" />
                      ) : (
                        <CloudOff className="size-4 mr-2" />
                      )}
                      Disconnect Google Drive
                    </Button>
                  ) : null}
                </div>
              ) : canEdit ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Connect once — every successful backup is copied to your Drive as ciphertext.
                    You can disconnect anytime.
                  </p>
                  <Button
                    className="w-full h-11"
                    disabled={cloudBusy}
                    onClick={handleCloudConnect}
                  >
                    {cloudBusy ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <Cloud className="size-4 mr-2" />
                    )}
                    Connect Google Drive
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Cloud storage is available. Ask an admin with backup edit access to connect
                  Google Drive.
                </p>
              )}
            </div>
          </div>

          <div className={panelClass}>
            <div className={panelHeaderClass}>
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-foreground/10">
                  <Upload className="size-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold tracking-tight">Restore from file</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Preview a .zip / .zip.enc / .json backup before restore
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 p-3.5 text-sm">
                <div className="flex gap-2">
                  <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium text-amber-900 dark:text-amber-200">
                      Restore replaces current workspace data
                    </p>
                    <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                      A complete encrypted safety backup is created automatically first.
                    </p>
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.zip,.enc,application/json,application/zip"
                className="hidden"
                onChange={onFileSelected}
              />
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canRestore || restoring || hasActiveJob || previewLoading}
              >
                {previewLoading ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="size-4 mr-2" />
                )}
                Upload backup file to restore
              </Button>
              <p className="text-xs text-muted-foreground">
                Prefer restoring from history when the backup is already on the server.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <div className={panelHeaderClass}>
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-foreground/10">
              <Archive className="size-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold tracking-tight">Backup history</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Download, restore, or delete previous backups
              </p>
            </div>
          </div>
        </div>
        <div className="p-0">
          {rows.length === 0 ? (
            <div className="py-14 text-center text-sm text-muted-foreground px-4">
              No backups yet. Turn on automatic backups or click <strong>Backup now</strong>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Created</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {row.created_at_display || row.created_at || '—'}
                        {row.encrypted ? (
                          <span className="ml-1 text-[10px] uppercase text-muted-foreground">
                            enc
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-sm">
                        {TYPE_LABELS[row.type] || row.type || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={SOURCE_COLORS[row.source] || ''}>
                          {SOURCE_LABELS[row.source] || row.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="min-w-[140px]">
                        <div className="space-y-1.5">
                          <Badge variant="outline" className={STATUS_COLORS[row.status] || ''}>
                            {STATUS_LABELS[row.status] || row.status}
                          </Badge>
                          {ACTIVE_STATUSES.has(row.status) ? (
                            <Progress value={Number(row.progress) || 0} className="h-1.5" />
                          ) : null}
                          {row.status === 'failed' && row.error_message ? (
                            <button
                              type="button"
                              className="text-[11px] text-destructive line-clamp-2 text-left hover:underline"
                              onClick={() => setErrorDetail(row)}
                            >
                              {row.error_message}
                            </button>
                          ) : null}
                          {row.remote_provider ? (
                            <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                              <Cloud className="size-3" />
                              {row.remote_provider}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{row.file_size_display || '—'}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {canDownload ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              title="Download"
                              disabled={!row.is_downloadable}
                              onClick={() => handleDownload(row)}
                            >
                              <Download className="size-4" />
                            </Button>
                          ) : null}
                          {canRestore ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              title="Restore"
                              disabled={!row.is_downloadable || hasActiveJob || previewLoading}
                              onClick={() => openRestoreFromRow(row)}
                            >
                              <RotateCcw className="size-4" />
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive"
                              title="Delete"
                              disabled={row.is_active}
                              onClick={() => setConfirmDelete(row)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        open={confirmBackupNow}
        onOpenChange={(o) => !o && !creating && setConfirmBackupNow(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create backup now?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Choose what to include. The archive is verified and encrypted before it is marked successful.</p>
                <Select value={backupType} onValueChange={setBackupType}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="database">Database only</SelectItem>
                    <SelectItem value="files">Files only</SelectItem>
                    <SelectItem value="complete">Complete (DB + files)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={creating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateBackup} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" /> Starting…
                </>
              ) : (
                'Start backup'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!restoreStep} onOpenChange={(o) => !o && closeRestoreDialog()}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {restoreStep === 'confirm' ? 'Confirm restore' : 'Restore preview'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                {restoreStep === 'preview' ? (
                  <>
                    <p>
                      Review this backup before continuing. Restore will replace current workspace
                      data after creating a safety backup.
                    </p>
                    <PreviewGrid preview={restorePreview} />
                  </>
                ) : (
                  <>
                    <PreviewGrid preview={restorePreview} />
                    <p>
                      Type <strong>RESTORE</strong> to confirm replacing workspace data with{' '}
                      <strong>{restorePreview?.filename}</strong>.
                    </p>
                    <Input
                      value={restoreConfirmText}
                      onChange={(e) => setRestoreConfirmText(e.target.value)}
                      placeholder="Type RESTORE"
                      className="h-10"
                      autoFocus
                    />
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            {restoreStep === 'preview' ? (
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  setRestoreStep('confirm');
                }}
              >
                Continue
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                onClick={handleRestoreConfirm}
                disabled={restoring || !restoreReady}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                {restoring ? (
                  <>
                    <Loader2 className="size-4 mr-1 animate-spin" /> Restoring…
                  </>
                ) : (
                  'Yes, restore data'
                )}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && !deleting && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete backup?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete backup <strong>{confirmDelete?.filename}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete backup'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmCloudDisconnect}
        onOpenChange={(o) => !o && !cloudBusy && setConfirmCloudDisconnect(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Google Drive?</AlertDialogTitle>
            <AlertDialogDescription>
              Future backups will stay on the server only. Existing Drive files are not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cloudBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloudDisconnect} disabled={cloudBusy}>
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!errorDetail} onOpenChange={(o) => !o && setErrorDetail(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Job error details</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground">{errorDetail?.filename}</p>
                <p className="text-destructive whitespace-pre-wrap break-words">
                  {errorDetail?.error_message || 'No error message recorded.'}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Complete backups include database records and company files. Archives are verified and
        encrypted with AES-256-GCM before they are marked successful. When Google Drive is
        connected, completed backups sync automatically. Also keep host-level database backups
        and a queue worker running in production.
      </p>
    </div>
  );
}
