import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Inbox, Loader2, Plus, Workflow } from 'lucide-react';
import { toast } from 'sonner';
import { TemplateGallery } from './components/TemplateGallery';
import { WorkflowDesigner } from './components/WorkflowDesigner';
import { WorkflowListPanel } from './components/WorkflowListPanel';
import { emptyForm } from './constants';
import { payloadFromForm, workflowFromApi } from './utils';
import { workflowsApi } from '../approvals/api/approvals.api';
import { Container } from '@/components/common/container';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCan } from '@/hooks/use-can';

export function WorkflowDesignerPage() {
  const { id: workspaceId } = useParams();
  const canManage = useCan('approvals.manage');

  const [workflows, setWorkflows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyTemplate, setBusyTemplate] = useState(null);

  const [mode, setMode] = useState('browse'); // browse | design
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [baseline, setBaseline] = useState('');
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [archiveTarget, setArchiveTarget] = useState(null);

  const dirty = useMemo(() => JSON.stringify(form) !== baseline, [form, baseline]);

  const load = useCallback(async () => {
    if (!canManage) return;
    setLoading(true);
    try {
      const [listRes, tplRes] = await Promise.all([workflowsApi.list(), workflowsApi.templates()]);
      setWorkflows(listRes.data?.data || []);
      setTemplates(tplRes.data?.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = (seed) => {
    const next = seed || emptyForm({ name: 'New approval workflow', module: 'invoice' });
    setSelectedId(null);
    setForm(next);
    setBaseline(JSON.stringify(next));
    setMode('design');
  };

  const openEdit = (wf) => {
    const next = workflowFromApi(wf);
    setSelectedId(wf.id);
    setForm(next);
    setBaseline(JSON.stringify(next));
    setMode('design');
  };

  const closeDesign = () => {
    setMode('browse');
    setSelectedId(null);
  };

  const save = async () => {
    if (!form.name?.trim()) {
      toast.error('Please enter a workflow name');
      return;
    }
    if (!(form.steps || []).length) {
      toast.error('Add at least one approval step');
      return;
    }
    setSaving(true);
    try {
      const payload = payloadFromForm(form);
      if (selectedId) {
        const res = await workflowsApi.update(selectedId, payload);
        const saved = res.data?.data;
        toast.success(form.is_active ? 'Workflow activated successfully' : 'Workflow saved successfully');
        if (saved) {
          const next = workflowFromApi(saved);
          setForm(next);
          setBaseline(JSON.stringify(next));
          setSelectedId(saved.id);
        } else {
          setBaseline(JSON.stringify(form));
        }
      } else {
        const res = await workflowsApi.create(payload);
        const saved = res.data?.data;
        toast.success(form.is_active ? 'Workflow activated successfully' : 'Workflow saved successfully');
        if (saved) {
          setSelectedId(saved.id);
          const next = workflowFromApi(saved);
          setForm(next);
          setBaseline(JSON.stringify(next));
        }
      }
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save workflow');
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async (wf) => {
    try {
      await workflowsApi.duplicate(wf.id);
      toast.success('Workflow duplicated');
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not duplicate');
    }
  };

  const archive = async () => {
    if (!archiveTarget) return;
    try {
      await workflowsApi.remove(archiveTarget.id);
      toast.success('Workflow archived');
      setArchiveTarget(null);
      if (selectedId === archiveTarget.id) closeDesign();
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not archive');
    }
  };

  const useApiTemplate = async (tpl) => {
    setBusyTemplate(tpl.key);
    try {
      const res = await workflowsApi.fromTemplate({
        template: tpl.key,
        module: tpl.module,
        name: tpl.name,
      });
      toast.success('Template applied — customize and save');
      await load();
      if (res.data?.data) openEdit(res.data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Template failed');
    } finally {
      setBusyTemplate(null);
    }
  };

  const useLocalTemplate = (card) => {
    const built = typeof card.build === 'function' ? card.build() : emptyForm();
    openNew(built);
    toast.message('Template loaded', { description: 'Review the steps, then save when ready.' });
  };

  if (!canManage) {
    return (
      <Container className="py-8">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            You need <code className="text-foreground">approvals.manage</code> to design workflows.
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-6 space-y-5">
      {mode === 'browse' ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground mb-2">
                <Workflow className="size-3.5" />
                Approval workflows
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Workflow designer</h1>
              <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                Design who approves invoices, bills, expenses, and more — visually, in minutes.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to={`/workspace/${workspaceId}/accounting/approvals`}>
                  <Inbox className="size-4 mr-1" />
                  Approvals inbox
                </Link>
              </Button>
              <Button type="button" variant="mono" onClick={() => openNew()}>
                <Plus className="size-4 mr-1" />
                Create workflow
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="py-24 flex justify-center text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-8">
              <WorkflowListPanel
                workflows={workflows}
                query={query}
                moduleFilter={moduleFilter}
                statusFilter={statusFilter}
                onQueryChange={setQuery}
                onModuleFilter={setModuleFilter}
                onStatusFilter={setStatusFilter}
                onEdit={openEdit}
                onDuplicate={duplicate}
                onArchive={setArchiveTarget}
                selectedId={selectedId}
              />

              {!workflows.length && (
                <div className="flex justify-center">
                  <Button type="button" variant="mono" size="lg" onClick={() => openNew()}>
                    <Plus className="size-4 mr-1" />
                    Create your first workflow
                  </Button>
                </div>
              )}

              <TemplateGallery
                apiTemplates={templates}
                onUseApiTemplate={useApiTemplate}
                onUseLocalTemplate={useLocalTemplate}
                busyKey={busyTemplate}
              />
            </div>
          )}
        </>
      ) : (
        <WorkflowDesigner
          form={form}
          onChange={setForm}
          saving={saving}
          isNew={!selectedId}
          dirty={dirty}
          onSave={save}
          onCancel={() => {
            if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
            closeDesign();
          }}
        />
      )}

      <ConfirmDialog
        open={!!archiveTarget}
        title="Archive this workflow?"
        description={
          archiveTarget
            ? `"${archiveTarget.name}" will be deactivated. Existing pending approvals are not deleted.`
            : ''
        }
        confirmLabel="Archive"
        confirmVariant="destructive"
        onConfirm={archive}
        onCancel={() => setArchiveTarget(null)}
      />
    </Container>
  );
}

export default WorkflowDesignerPage;
