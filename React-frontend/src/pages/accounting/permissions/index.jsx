import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Info,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  Search,
  Shield,
  Sparkles,
  Undo2,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { permissionsApi } from './api/permissions.api';
import { rolesApi } from './api/roles.api';
import { AdvancedPermissionsDrawer } from './components/AdvancedPermissionsDrawer';
import { CreateRoleDialog } from './components/CreateRoleDialog';
import { MatchCount } from './components/HighlightText';
import { PermissionMatrix } from './components/PermissionMatrix';
import { RoleRail } from './components/RoleRail';
import { TemplatePickerDialog } from './components/TemplatePickerDialog';
import {
  MAIN_ACTIONS,
  RBAC_ACTION_LABELS,
  countAssignablePermissionIds,
  countRolePermissions,
  filterModulesByPermissionSearch,
  formatRoleLabel,
  getCellState,
  normalizeRolePermissions,
  patchRolePermissions,
  roleCoveragePercent,
} from './constants';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDisplayDateTime } from '@/lib/format-datetime';
import { employeesApi } from '@/pages/employee/api/employees.api';

const FAST_OVERLAY =
  'bg-black/25 backdrop-blur-none duration-75 data-[state=open]:duration-75 data-[state=closed]:duration-75';

function SaveStatusBadge({ status, onUndo, canUndo }) {
  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground">
        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        Saving…
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground">
        <CheckCircle2 className="size-3.5" />
        Saved
        {canUndo ? (
          <button
            type="button"
            onClick={onUndo}
            className="ml-1 inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] font-semibold hover:bg-muted"
          >
            <Undo2 className="size-3" />
            Undo
          </button>
        ) : null}
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground">
        <AlertCircle className="size-3.5" />
        Save failed
      </span>
    );
  }
  if (status === 'dirty') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
        Unsaved changes
      </span>
    );
  }
  return null;
}

export function RolesPermissionsPage() {
  const { id: workspaceId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const base = `/workspace/${workspaceId}`;
  const savedTimerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [busyCell, setBusyCell] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [presets, setPresets] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});
  const [activeRoleId, setActiveRoleId] = useState(null);
  const [search, setSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('active');
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [confirmPresetKey, setConfirmPresetKey] = useState('');
  const [roleMembers, setRoleMembers] = useState([]);
  const [expandedModules, setExpandedModules] = useState({});
  const [flashCellKey, setFlashCellKey] = useState(null);
  const [undoAction, setUndoAction] = useState(null);
  const undoTimerRef = useRef(null);
  const flashTimerRef = useRef(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState('blank');
  const [createName, setCreateName] = useState('');
  const [createTemplate, setCreateTemplate] = useState('');
  const [createSourceId, setCreateSourceId] = useState('');
  const [templates, setTemplates] = useState([]);
  const [creating, setCreating] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [roleActionBusy, setRoleActionBusy] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(null);
  const [advancedModule, setAdvancedModule] = useState(null);

  const markSaving = useCallback(() => {
    setSaveStatus('saving');
  }, []);

  const markSaved = useCallback(() => {
    setSaveStatus('saved');
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2200);
  }, []);

  const markDirty = useCallback(() => {
    setSaveStatus('dirty');
  }, []);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const dirty = saveStatus === 'saving' || saveStatus === 'dirty' || bulkBusy || !!busyCell;
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveStatus, bulkBusy, busyCell]);

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const [matrixRes, rolesRes, templatesRes] = await Promise.all([
        permissionsApi.getMatrix(),
        rolesApi.list({ sort: 'sort_order' }),
        rolesApi.templates().catch(() => ({ data: { data: { templates: [] } } })),
      ]);
      const data = matrixRes.data?.data || {};
      const roleList = Array.isArray(data.roles) ? data.roles : [];
      const catalog = rolesRes.data?.data?.roles || [];
      const byId = new Map(roleList.map((r) => [Number(r.id), r]));
      const merged = catalog.map((c) => ({
        ...c,
        name: c.slug,
        label: c.name,
        ...(byId.get(Number(c.id)) || {}),
      }));
      const finalRoles = merged.length ? merged : roleList;
      setRoles(finalRoles);
      setModules(Array.isArray(data.modules) ? data.modules : []);
      setPresets(Array.isArray(data.presets) ? data.presets : []);
      setRolePermissions(normalizeRolePermissions(data.role_permissions));
      setCanEdit(Boolean(data.can_edit));
      setTemplates(templatesRes.data?.data?.templates || []);
      setExpandedModules((prev) => {
        const next = { ...prev };
        (data.modules || []).forEach((m, i) => {
          if (next[m.key] === undefined) next[m.key] = i < 2;
        });
        return next;
      });
      setActiveRoleId((prev) => {
        if (prev && finalRoles.some((r) => Number(r.id) === Number(prev))) return prev;
        const active = finalRoles.find((r) => r.is_active !== false) || finalRoles[0];
        return active?.id ?? null;
      });
      setSaveStatus('idle');
    } catch (err) {
      if (err?.response?.status === 403) {
        setForbidden(true);
      } else {
        toast.error(err?.response?.data?.message || 'Failed to load roles & permissions');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  useEffect(() => {
    if (!roles.length) return;
    const roleFromUrl = (searchParams.get('role') || '').toLowerCase();
    if (!roleFromUrl) return;
    const match = roles.find(
      (r) =>
        String(r.slug || r.name).toLowerCase() === roleFromUrl ||
        String(r.label || '').toLowerCase() === roleFromUrl,
    );
    if (match && Number(match.id) !== Number(activeRoleId)) {
      setActiveRoleId(match.id);
    }
  }, [roles, searchParams, activeRoleId]);

  const activeRole = useMemo(
    () => roles.find((r) => Number(r.id) === Number(activeRoleId)),
    [roles, activeRoleId],
  );

  const selectRole = useCallback(
    (role) => {
      if (saveStatus === 'saving' || bulkBusy) {
        toast.message('Please wait for the current save to finish.');
        return;
      }
      setActiveRoleId(role.id);
      const next = new URLSearchParams(searchParams);
      next.set('role', role.slug || role.name);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams, saveStatus, bulkBusy],
  );

  useEffect(() => {
    if (!activeRole?.slug && !activeRole?.name) {
      setRoleMembers([]);
      return;
    }
    const slug = activeRole.slug || activeRole.name;
    let cancelled = false;
    employeesApi
      .list({ role: slug, per_page: 8, page: 1 })
      .then((res) => {
        if (cancelled) return;
        const items = res.data?.data ?? [];
        setRoleMembers(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (!cancelled) setRoleMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRole?.slug, activeRole?.name]);

  const activePermissionSet = useMemo(() => {
    const ids = rolePermissions[Number(activeRoleId)] || [];
    return new Set(ids);
  }, [rolePermissions, activeRoleId]);

  const activePermissionCount = useMemo(
    () => countRolePermissions(rolePermissions, activeRoleId),
    [rolePermissions, activeRoleId],
  );

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    return roles.filter((r) => {
      if (roleFilter === 'active' && r.is_active === false) return false;
      if (roleFilter === 'archived' && r.is_active !== false) return false;
      if (roleFilter === 'system' && !r.is_system) return false;
      if (roleFilter === 'custom' && r.is_system) return false;
      if (!q) return true;
      const blob = `${r.label || ''} ${r.name || ''} ${r.slug || ''} ${r.description || ''}`.toLowerCase();
      return blob.includes(q);
    });
  }, [roles, roleSearch, roleFilter]);

  const filteredModules = useMemo(
    () => filterModulesByPermissionSearch(modules, search),
    [modules, search],
  );

  /** Auto-expand modules that match the current search. */
  useEffect(() => {
    const q = search.trim();
    if (!q) return;
    setExpandedModules((prev) => {
      const next = { ...prev };
      filteredModules.forEach((m) => {
        next[m.key] = true;
      });
      return next;
    });
  }, [search, filteredModules]);

  const totalAssignable = useMemo(
    () => countAssignablePermissionIds(modules),
    [modules],
  );

  const activeCoverage = useMemo(
    () => roleCoveragePercent(activePermissionCount, totalAssignable),
    [activePermissionCount, totalAssignable],
  );

  const expandAllModules = useCallback(() => {
    setExpandedModules((prev) => {
      const next = { ...prev };
      modules.forEach((m) => {
        next[m.key] = true;
      });
      return next;
    });
  }, [modules]);

  const collapseAllModules = useCallback(() => {
    setExpandedModules((prev) => {
      const next = { ...prev };
      modules.forEach((m) => {
        next[m.key] = false;
      });
      return next;
    });
  }, [modules]);

  const clearUndoSoon = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoAction(null), 5000);
  }, []);

  const flashCell = useCallback((cellKey) => {
    setFlashCellKey(cellKey);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashCellKey(null), 450);
  }, []);

  const handleCellToggle = async (
    moduleKey,
    action,
    ids,
    currentState,
    { silent = false, pageKey = null, fromUndo = false } = {},
  ) => {
    if (!canEdit || !activeRoleId || !ids?.length) return false;

    const grant = currentState !== true;
    const cellKey = `${moduleKey}:${pageKey || ''}:${action}`;
    setBusyCell(cellKey);
    markDirty();
    markSaving();

    const previous = rolePermissions;
    setRolePermissions((prev) => {
      const next = new Set(prev[Number(activeRoleId)] || []);
      ids.forEach((id) => {
        const num = Number(id);
        if (grant) next.add(num);
        else next.delete(num);
      });
      return patchRolePermissions(prev, activeRoleId, Array.from(next));
    });

    try {
      const res = await permissionsApi.updateModule({
        role_id: activeRoleId,
        module_key: moduleKey,
        action,
        grant,
        ...(pageKey ? { page_key: pageKey } : {}),
      });
      const updated = res.data?.data?.role_permissions;
      if (Array.isArray(updated)) {
        setRolePermissions((prev) => patchRolePermissions(prev, activeRoleId, updated));
      }
      markSaved();
      flashCell(cellKey);
      if (!silent && !fromUndo) {
        setUndoAction({
          moduleKey,
          action,
          ids,
          pageKey,
          // After grant, current state is checked → undo toggles off
          currentStateForUndo: grant,
        });
        clearUndoSoon();
      }
      if (!silent) {
        toast.success(
          fromUndo ? 'Change undone' : grant ? 'Access granted' : 'Access removed',
          { duration: 1400 },
        );
      }
      return true;
    } catch (err) {
      setRolePermissions(previous);
      setSaveStatus('failed');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3200);
      toast.error(err?.response?.data?.message || 'Could not update access');
      return false;
    } finally {
      setBusyCell(null);
    }
  };

  const handleUndo = async () => {
    if (!undoAction) return;
    const { moduleKey, action, ids, pageKey, currentStateForUndo } = undoAction;
    setUndoAction(null);
    await handleCellToggle(moduleKey, action, ids, currentStateForUndo, {
      pageKey,
      fromUndo: true,
      silent: false,
    });
  };

  const runColumnBulk = async (action, grant) => {
    if (!canEdit || bulkBusy) return;
    setBulkBusy(true);
    markSaving();
    try {
      for (const mod of filteredModules) {
        const pages = mod.pages?.length ? mod.pages : null;
        if (pages) {
          for (const page of pages) {
            const ids = page.cells?.[action]?.ids || [];
            if (!ids.length) continue;
            const { checked } = getCellState(ids, activePermissionSet);
            if (grant && checked !== true) {
              await handleCellToggle(mod.key, action, ids, checked, {
                silent: true,
                pageKey: page.key,
              });
            } else if (!grant && checked !== false) {
              await handleCellToggle(mod.key, action, ids, checked, {
                silent: true,
                pageKey: page.key,
              });
            }
          }
        } else {
          const ids = mod.cells?.[action]?.ids || [];
          if (!ids.length) continue;
          const { checked } = getCellState(ids, activePermissionSet);
          if (grant && checked !== true) {
            await handleCellToggle(mod.key, action, ids, checked, { silent: true });
          } else if (!grant && checked !== false) {
            await handleCellToggle(mod.key, action, ids, checked, { silent: true });
          }
        }
      }
      markSaved();
      toast.success(
        grant
          ? `All ${RBAC_ACTION_LABELS[action]} granted`
          : `All ${RBAC_ACTION_LABELS[action]} cleared`,
      );
    } finally {
      setBulkBusy(false);
      setConfirmBulk(null);
    }
  };

  const runModuleBulk = async (mod, grant) => {
    if (!canEdit || bulkBusy) return;
    setBulkBusy(true);
    markSaving();
    try {
      for (const action of MAIN_ACTIONS) {
        const pages = mod.pages?.length ? mod.pages : null;
        if (pages) {
          for (const page of pages) {
            const ids = page.cells?.[action]?.ids || [];
            if (!ids.length) continue;
            const { checked } = getCellState(ids, activePermissionSet);
            if (grant && checked !== true) {
              await handleCellToggle(mod.key, action, ids, checked, {
                silent: true,
                pageKey: page.key,
              });
            } else if (!grant && checked !== false) {
              await handleCellToggle(mod.key, action, ids, checked, {
                silent: true,
                pageKey: page.key,
              });
            }
          }
        } else {
          const ids = mod.cells?.[action]?.ids || [];
          if (!ids.length) continue;
          const { checked } = getCellState(ids, activePermissionSet);
          if (grant && checked !== true) {
            await handleCellToggle(mod.key, action, ids, checked, { silent: true });
          } else if (!grant && checked !== false) {
            await handleCellToggle(mod.key, action, ids, checked, { silent: true });
          }
        }
      }
      markSaved();
      toast.success(grant ? `${mod.label}: all selected` : `${mod.label}: cleared`);
    } finally {
      setBulkBusy(false);
      setConfirmBulk(null);
    }
  };

  const handleConfirmBulk = async () => {
    if (!confirmBulk) return;
    if (confirmBulk.type === 'column') {
      await runColumnBulk(confirmBulk.action, confirmBulk.grant);
    } else if (confirmBulk.type === 'module') {
      await runModuleBulk(confirmBulk.mod, confirmBulk.grant);
    }
  };

  const handleApplyPreset = async () => {
    if (!canEdit || !activeRoleId || !confirmPresetKey) return;
    setApplyingPreset(true);
    markSaving();
    try {
      const res = await permissionsApi.applyPreset({
        role_id: activeRoleId,
        preset: confirmPresetKey,
      });
      const updated = res.data?.data?.role_permissions;
      if (Array.isArray(updated)) {
        setRolePermissions((prev) => patchRolePermissions(prev, activeRoleId, updated));
      }
      markSaved();
      toast.success('Template applied');
      setTemplatePickerOpen(false);
    } catch (err) {
      setSaveStatus('failed');
      toast.error(err?.response?.data?.message || 'Could not apply template');
    } finally {
      setApplyingPreset(false);
      setConfirmPresetKey('');
    }
  };

  const handleCreateRole = async () => {
    if (!createName.trim()) {
      toast.error('Role name is required');
      return;
    }
    setCreating(true);
    try {
      const payload = { name: createName.trim() };
      if (createMode === 'template' && createTemplate) payload.template = createTemplate;
      if (createMode === 'duplicate' && createSourceId) {
        payload.source_role_id = Number(createSourceId);
      }
      const res = await rolesApi.create(payload);
      const role = res.data?.data?.role;
      toast.success('Role created');
      setCreateOpen(false);
      setCreateName('');
      setCreateMode('blank');
      await loadMatrix();
      if (role?.id) {
        setActiveRoleId(role.id);
        const next = new URLSearchParams(searchParams);
        next.set('role', role.slug);
        setSearchParams(next, { replace: true });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not create role');
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (role) => {
    setRoleActionBusy(true);
    try {
      const res = await rolesApi.duplicate(role.id);
      toast.success('Role duplicated');
      await loadMatrix();
      const created = res.data?.data?.role;
      if (created?.id) setActiveRoleId(created.id);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not duplicate role');
    } finally {
      setRoleActionBusy(false);
    }
  };

  const handleArchive = async () => {
    if (!confirmArchive) return;
    setRoleActionBusy(true);
    try {
      await rolesApi.archive(confirmArchive.id);
      toast.success('Role archived');
      setConfirmArchive(null);
      await loadMatrix();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not archive role');
    } finally {
      setRoleActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setRoleActionBusy(true);
    try {
      await rolesApi.destroy(confirmDelete.id);
      toast.success('Role deleted');
      setConfirmDelete(null);
      await loadMatrix();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not delete role');
    } finally {
      setRoleActionBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 w-full min-w-0">
        <div className="space-y-2">
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="grid h-[min(88vh,920px)] overflow-hidden rounded-2xl border lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-3 border-r bg-muted/15 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[5.5rem] w-full rounded-xl" />
            ))}
          </div>
          <div className="flex flex-col">
            <div className="space-y-3 border-b p-5">
              <Skeleton className="h-7 w-40" />
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <Skeleton className="h-8 rounded-lg" />
                <Skeleton className="h-8 rounded-lg" />
                <Skeleton className="h-8 rounded-lg" />
                <Skeleton className="h-8 rounded-lg" />
              </div>
            </div>
            <div className="flex-1 space-y-0 p-0">
              <Skeleton className="h-14 w-full rounded-none" />
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="mt-px h-12 w-full rounded-none" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="space-y-5 w-full min-w-0">
        <PageHeader title="Roles & access" subtitle="Manage what each role can do." />
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-2xl border bg-muted/40">
              <Lock className="size-5 text-muted-foreground" />
            </span>
            <div className="space-y-1">
              <p className="font-semibold">You don&apos;t have access</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Ask a company admin to grant roles & permissions management.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to={base}>Back to workspace</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleStatusLabel = activeRole?.is_active === false ? 'Archived' : 'Active';

  return (
    <div className="space-y-4 w-full min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
            <Link to={base} className="hover:text-foreground">
              Workspace
            </Link>
            <ChevronRight className="size-3.5 opacity-50" />
            <Link to={`${base}/employee`} className="hover:text-foreground">
              Employees
            </Link>
            <ChevronRight className="size-3.5 opacity-50" />
            <span className="font-medium text-foreground">Roles & access</span>
          </nav>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-10 items-center justify-center rounded-xl border bg-muted/40">
              <Shield className="size-5" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Roles & access</h1>
              <p className="text-sm text-muted-foreground">
                Choose a role, then set what people can view, create, approve, and manage.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SaveStatusBadge
            status={saveStatus}
            canUndo={!!undoAction && saveStatus === 'saved'}
            onUndo={handleUndo}
          />
          <Button variant="outline" asChild>
            <Link to={`${base}/employee`}>
              <Users className="size-4 mr-1.5" />
              Employees
            </Link>
          </Button>
          {canEdit && (
            <Button
              variant="mono"
              onClick={() => {
                setCreateOpen(true);
                setCreateMode('blank');
                setCreateName('');
                setCreateTemplate('');
                setCreateSourceId('');
              }}
            >
              <Plus className="size-4 mr-1.5" />
              Create role
            </Button>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="flex items-center gap-2.5 rounded-xl border bg-muted/40 px-4 py-3 text-sm">
          <Lock className="size-4 shrink-0 text-muted-foreground" />
          <span>
            <span className="font-semibold">View only</span>
            <span className="text-muted-foreground"> — you can review but not change permissions.</span>
          </span>
        </div>
      )}

      {!roles.length ? (
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-center gap-4 py-20 text-center">
            <span className="inline-flex size-16 items-center justify-center rounded-3xl border bg-muted/40 shadow-sm">
              <Shield className="size-7 text-muted-foreground" />
            </span>
            <div className="space-y-1.5">
              <p className="text-lg font-semibold">No roles created</p>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                Create your first company role to control what people can view, create, approve, and manage.
              </p>
            </div>
            {canEdit ? (
              <Button
                variant="mono"
                size="lg"
                onClick={() => {
                  setCreateOpen(true);
                  setCreateMode('blank');
                  setCreateName('');
                }}
              >
                <Plus className="size-4 mr-1.5" />
                Create role
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="grid h-[min(88vh,920px)] min-h-[480px] grid-rows-[auto_minmax(0,1fr)] lg:grid-rows-1 lg:grid-cols-[280px_minmax(0,1fr)]">
          <RoleRail
            roles={filteredRoles}
            rolePermissions={rolePermissions}
            totalAssignable={totalAssignable}
            activeRoleId={activeRoleId}
            roleSearch={roleSearch}
            roleFilter={roleFilter}
            canEdit={canEdit}
            onRoleSearch={setRoleSearch}
            onRoleFilter={setRoleFilter}
            onSelect={selectRole}
            onDuplicate={handleDuplicate}
            onArchive={setConfirmArchive}
            onDelete={setConfirmDelete}
            onCreateRole={() => {
              setCreateOpen(true);
              setCreateMode('blank');
              setCreateName('');
            }}
          />

          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <div className="shrink-0 space-y-2.5 border-b px-4 py-3 sm:px-5">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight">
                      {activeRole
                        ? formatRoleLabel(activeRole.label || activeRole.name)
                        : 'Role'}
                    </h2>
                    <Badge variant={activeRole?.is_system ? 'secondary' : 'outline'} className="text-xs">
                      {activeRole?.is_system ? 'System role' : 'Custom role'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {roleStatusLabel}
                    </Badge>
                  </div>
                  {activeRole?.updated_at ? (
                    <p className="text-xs text-muted-foreground">
                      Last updated {formatDisplayDateTime(activeRole.updated_at)}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-60">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search modules or actions…"
                      className="h-10 pl-9 pr-9 text-sm bg-background"
                      autoComplete="off"
                      aria-label="Search permissions"
                    />
                    {search ? (
                      <button
                        type="button"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setSearch('')}
                        aria-label="Clear search"
                      >
                        <X className="size-4" />
                      </button>
                    ) : null}
                  </div>

                  {canEdit ? (
                    <Button
                      type="button"
                      variant="mono"
                      className="h-10"
                      onClick={() => setTemplatePickerOpen(true)}
                    >
                      <Sparkles className="size-4 mr-1.5" />
                      Templates
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/15 px-2.5 py-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <KeyRound className="size-3" />
                    Permissions
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{activePermissionCount}</span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/15 px-2.5 py-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <Users className="size-3" />
                    Users
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {activeRole?.usage_count ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/15 px-2.5 py-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">Coverage</span>
                  <span className="text-sm font-semibold tabular-nums">{activeCoverage}%</span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/15 px-2.5 py-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">Type</span>
                  <span className="text-sm font-semibold">
                    {activeRole?.is_system ? 'System' : 'Custom'}
                    {roleMembers.length > 0 ? (
                      <>
                        {' · '}
                        <Link
                          to={`${base}/employee?role=${encodeURIComponent(activeRole?.slug || activeRole?.name || '')}`}
                          className="font-medium underline-offset-2 hover:underline"
                        >
                          People
                        </Link>
                      </>
                    ) : null}
                  </span>
                </div>
              </div>

              {search.trim() ? (
                <MatchCount count={filteredModules.length} query={search} />
              ) : null}
            </div>

            <PermissionMatrix
              modules={filteredModules}
              permissionSet={activePermissionSet}
              canEdit={canEdit}
              busyCell={busyCell}
              bulkBusy={bulkBusy}
              expandedModules={expandedModules}
              searchQuery={search}
              flashCellKey={flashCellKey}
              onToggleExpanded={(key) =>
                setExpandedModules((prev) => ({
                  ...prev,
                  [key]: prev[key] === false,
                }))
              }
              onExpandAll={expandAllModules}
              onCollapseAll={collapseAllModules}
              onCellToggle={handleCellToggle}
              onConfirmBulk={setConfirmBulk}
              onOpenAdvanced={setAdvancedModule}
            />

            <div className="flex shrink-0 items-center gap-2 border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground sm:px-5">
              <Info className="size-3.5 shrink-0" />
              <p className="min-w-0">
                Changes save automatically. Granting create/edit/delete also enables View. Use ⋯ → Advanced for Print, Export, Import.
              </p>
            </div>
          </section>
        </div>
      </div>
      )}

      <AdvancedPermissionsDrawer
        open={!!advancedModule}
        onOpenChange={(o) => !o && setAdvancedModule(null)}
        module={advancedModule}
        permissionSet={activePermissionSet}
        canEdit={canEdit}
        busyCell={busyCell}
        bulkBusy={bulkBusy}
        onToggle={handleCellToggle}
      />

      <CreateRoleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        creating={creating}
        templates={templates}
        roles={roles}
        createMode={createMode}
        createName={createName}
        createTemplate={createTemplate}
        createSourceId={createSourceId}
        onModeChange={setCreateMode}
        onNameChange={setCreateName}
        onTemplateChange={setCreateTemplate}
        onSourceChange={setCreateSourceId}
        onSubmit={handleCreateRole}
      />

      <TemplatePickerDialog
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        presets={presets}
        applying={applyingPreset}
        onApply={(key) => {
          setTemplatePickerOpen(false);
          setConfirmPresetKey(key);
        }}
      />

      <ConfirmDialog
        open={!!confirmPresetKey}
        title="Apply permission template?"
        description="This replaces all permissions for the selected role. You can fine-tune afterward."
        confirmLabel="Apply template"
        confirmVariant="default"
        isLoading={applyingPreset}
        overlayClassName={FAST_OVERLAY}
        onConfirm={handleApplyPreset}
        onCancel={() => setConfirmPresetKey('')}
      />
      <ConfirmDialog
        open={!!confirmBulk}
        title={confirmBulk?.title || 'Confirm bulk change'}
        description={confirmBulk?.description || 'This will update many permissions at once.'}
        confirmLabel={confirmBulk?.grant === false ? 'Clear' : 'Apply'}
        confirmVariant={confirmBulk?.grant === false ? 'destructive' : 'default'}
        isLoading={bulkBusy}
        overlayClassName={FAST_OVERLAY}
        onConfirm={handleConfirmBulk}
        onCancel={() => setConfirmBulk(null)}
      />
      <ConfirmDialog
        open={!!confirmArchive}
        title="Archive this role?"
        description="Archived roles cannot be assigned to new employees. You can delete them later if unused."
        confirmLabel="Archive"
        isLoading={roleActionBusy}
        overlayClassName={FAST_OVERLAY}
        onConfirm={handleArchive}
        onCancel={() => setConfirmArchive(null)}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this role?"
        description="Only archived roles with no assigned users can be deleted. This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="destructive"
        isLoading={roleActionBusy}
        overlayClassName={FAST_OVERLAY}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
