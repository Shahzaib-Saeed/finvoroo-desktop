import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Info,
  Loader2,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { reportBuilderApi } from '../api/report-builder.api';
import { reportCenterApi } from '../../api/report-center.api';
import { emptyDefinition } from '../hooks/useReportBuilderState';
import { normalizeFilterTree } from '../filter-tree';
import {
  DEFAULT_REPORT_DATE_RANGE_KEY,
  REPORT_DEFAULT_DATE_RANGE_OPTIONS,
} from '../filter-operators';
import { FilterBuilder } from '../components/FilterBuilder';
import { BuilderContextTip, getBuilderTip } from '../components/BuilderContextTip';
import { datasetDescription, datasetIcon } from '../dataset-meta';
import { WIZARD_STEPS } from '../../lib/report-business-copy';
import {
  datasetsForTopic,
  REPORT_TOPICS,
  resolveDatasetKey,
  starterColumnsForDataset,
} from '../../lib/dataset-topics';
import { markReportWizardCompleted } from '../../lib/reports-hub-storage';

function WizardInfoBanner({ children }) {
  return (
    <div className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3">
      <Info className="mt-0.5 size-4 shrink-0 text-blue-600" strokeWidth={2} />
      <p className="text-sm leading-relaxed text-blue-900/90">{children}</p>
    </div>
  );
}

function WizardStepper({ step, total }) {
  return (
    <div className="flex items-center gap-0">
      {WIZARD_STEPS.map((s, index) => {
        const done = step > s.id;
        const active = step === s.id;
        return (
          <div key={s.id} className="flex items-center">
            <div
              className={cn(
                'flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                active
                  ? 'bg-blue-600 text-white shadow-sm'
                  : done
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-400',
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={2.5} /> : s.id}
            </div>
            {index < total - 1 ? (
              <div
                className={cn(
                  'mx-1 h-px w-6 sm:w-8',
                  step > s.id ? 'bg-emerald-300' : 'bg-slate-200',
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function TopicPickerCard({ icon: Icon, label, description, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex w-full items-start gap-3.5 rounded-xl border p-4 text-left transition-all',
        active
          ? 'border-blue-500 bg-white shadow-[0_0_0_1px_rgba(59,130,246,0.12)]'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm',
      )}
    >
      {active ? (
        <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-blue-600 text-white">
          <Check className="size-3" strokeWidth={2.5} />
        </span>
      ) : null}
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors',
          active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600',
        )}
      >
        <Icon className="size-[18px]" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 pr-6">
        <p className="text-[15px] font-semibold leading-snug text-slate-900">{label}</p>
        <p className="mt-0.5 text-sm leading-snug text-slate-500">{description}</p>
      </div>
    </button>
  );
}

function isCustomReportField(field) {
  return (
    field?.is_custom_field === true ||
    field?.group === 'Custom Fields' ||
    String(field?.key || '').startsWith('cf:')
  );
}

function FieldPickerButton({ field, checked, onToggle }) {
  const isCustom = isCustomReportField(field);
  return (
    <button
      type="button"
      onClick={() => onToggle(field.key)}
      className={cn(
        'flex items-center gap-2.5 rounded-lg border-2 bg-white px-3 py-2.5 text-left text-sm font-medium transition-colors',
        checked
          ? isCustom
            ? 'border-violet-500 text-slate-900 shadow-[0_0_0_1px_rgba(139,92,246,0.08)]'
            : 'border-blue-500 text-slate-900 shadow-[0_0_0_1px_rgba(59,130,246,0.08)]'
          : isCustom
            ? 'border-transparent ring-1 ring-violet-200 text-violet-950 hover:border-violet-300 hover:bg-violet-50/40'
            : 'border-transparent ring-1 ring-slate-200 text-slate-800 hover:border-blue-200 hover:bg-blue-50/30',
      )}
    >
      <span
        className={cn(
          'flex size-4 shrink-0 items-center justify-center rounded border',
          checked
            ? isCustom
              ? 'border-violet-500 bg-violet-500 text-white'
              : 'border-blue-500 bg-blue-500 text-white'
            : isCustom
              ? 'border-violet-300 bg-white'
              : 'border-slate-300 bg-white',
        )}
      >
        {checked ? <Check className="size-3" /> : null}
      </span>
      <span className="min-w-0 truncate">{field.label}</span>
    </button>
  );
}

function ColumnOrderList({ columns, fields, onReorder }) {
  const fieldByKey = useMemo(() => {
    const map = new Map();
    fields.forEach((f) => map.set(f.key, f));
    return map;
  }, [fields]);

  const moveColumn = (index, direction) => {
    const next = [...columns];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next);
  };

  if (!columns.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-600">
        No columns selected. Go back and choose at least one field.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {columns.map((key, index) => {
        const field = fieldByKey.get(key);
        const custom = field ? isCustomReportField(field) : false;
        return (
          <li
            key={key}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <GripVertical className="size-4 shrink-0 text-slate-300" strokeWidth={1.75} />
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold tabular-nums text-slate-600">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{field?.label || key}</p>
              {custom ? (
                <p className="text-xs text-violet-600">Custom field</p>
              ) : (
                <p className="text-xs text-slate-500">Standard column</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-8 p-0 text-slate-400 hover:text-slate-700"
                disabled={index === 0}
                onClick={() => moveColumn(index, -1)}
                aria-label="Move up"
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-8 p-0 text-slate-400 hover:text-slate-700"
                disabled={index === columns.length - 1}
                onClick={() => moveColumn(index, 1)}
                aria-label="Move down"
              >
                <ChevronDown className="size-4" />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ReportCreationWizard() {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const base = `/workspace/${workspaceId}`;

  const [step, setStep] = useState(1);
  const [datasets, setDatasets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [datasetsError, setDatasetsError] = useState(null);

  const [topicId, setTopicId] = useState(null);
  const [datasetKey, setDatasetKey] = useState(null);
  const [columns, setColumns] = useState([]);
  const [filters, setFilters] = useState(null);
  const [sort, setSort] = useState([]);
  const [groupBy, setGroupBy] = useState([]);
  const [aggregations, setAggregations] = useState([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [visibility, setVisibility] = useState('private');
  const [tagsInput, setTagsInput] = useState('');
  const [defaultDateRangeKey, setDefaultDateRangeKey] = useState(DEFAULT_REPORT_DATE_RANGE_KEY);
  const [saving, setSaving] = useState(false);

  const loadDatasets = useCallback(async () => {
    setLoadingDatasets(true);
    setDatasetsError(null);

    // Load datasets independently — hub failure must never wipe field options.
    try {
      const dsRes = await reportBuilderApi.datasets();
      const raw = dsRes?.data?.data ?? dsRes?.data ?? [];
      const list = Array.isArray(raw) ? raw : Object.values(raw || {});
      setDatasets(list);
      if (!list.length) {
        setDatasetsError('No report data sources are available for your account.');
      }
    } catch (err) {
      setDatasets([]);
      setDatasetsError(
        err?.response?.data?.message || 'Could not load report fields. Please try again.',
      );
    } finally {
      setLoadingDatasets(false);
    }

    try {
      const hubRes = await reportCenterApi.index();
      setCategories(hubRes?.data?.data?.categories ?? []);
    } catch {
      // Categories are optional for the wizard.
    }
  }, []);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  const topic = useMemo(() => REPORT_TOPICS.find((t) => t.id === topicId), [topicId]);
  const selectedDataset = useMemo(
    () => (Array.isArray(datasets) ? datasets.find((d) => d.key === datasetKey) : null),
    [datasets, datasetKey],
  );
  const topicDatasets = useMemo(() => datasetsForTopic(topic, datasets), [topic, datasets]);
  const fields = useMemo(() => {
    const list = selectedDataset?.fields;
    return Array.isArray(list) ? list : [];
  }, [selectedDataset]);
  const filterableFields = useMemo(() => fields.filter((f) => f.filterable), [fields]);

  const standardFields = useMemo(
    () => fields.filter((f) => !isCustomReportField(f)),
    [fields],
  );

  const customReportFields = useMemo(
    () => fields.filter((f) => isCustomReportField(f)),
    [fields],
  );

  // Keep datasetKey / starter columns in sync once datasets finish loading
  useEffect(() => {
    if (!topicId || !datasets.length) return;
    const nextTopic = REPORT_TOPICS.find((t) => t.id === topicId);
    const key = resolveDatasetKey(nextTopic, datasets, datasetKey);
    if (!key) return;
    if (key !== datasetKey) {
      setDatasetKey(key);
    }
    const ds = datasets.find((d) => d.key === key);
    if (ds && (!columns.length || !datasetKey)) {
      setColumns(starterColumnsForDataset(ds));
    }
  }, [datasets, topicId]); // eslint-disable-line react-hooks/exhaustive-deps

  const definition = useMemo(
    () => ({
      ...emptyDefinition(datasetKey),
      date_range: { relative_key: defaultDateRangeKey || DEFAULT_REPORT_DATE_RANGE_KEY },
      columns,
      filters,
      sort,
      group_by: groupBy,
      aggregations,
    }),
    [datasetKey, columns, filters, sort, groupBy, aggregations, defaultDateRangeKey],
  );

  const selectTopic = (id) => {
    const nextTopic = REPORT_TOPICS.find((t) => t.id === id);
    setTopicId(id);
    setFilters(null);
    setSort([]);
    setGroupBy([]);
    setAggregations([]);
    if (!name && nextTopic) {
      setName(`${nextTopic.label} Report`);
    }

    // If datasets aren't ready yet, keep the topic selected — the sync effect
    // will attach the dataset/columns as soon as the API responds.
    if (loadingDatasets || !datasets.length) {
      setDatasetKey(null);
      setColumns([]);
      if (datasetsError) {
        toast.error(datasetsError);
        loadDatasets();
      }
      return;
    }

    const key = resolveDatasetKey(nextTopic, datasets, null);
    const ds = datasets.find((d) => d.key === key) || null;
    setDatasetKey(key);
    setColumns(starterColumnsForDataset(ds));
    if (!ds) {
      toast.error('No data source is available for this topic on your account.');
    }
  };

  const goNext = () => {
    if (step === 1 && topicId) {
      // Re-resolve before leaving step 1 so Step 2 always has a real dataset
      const nextTopic = REPORT_TOPICS.find((t) => t.id === topicId);
      const key = resolveDatasetKey(nextTopic, datasets, datasetKey);
      const ds = Array.isArray(datasets) ? datasets.find((d) => d.key === key) : null;
      if (!ds) {
        toast.error(
          datasetsError ||
            'Could not load fields for this report. Retry loading data sources.',
        );
        loadDatasets();
        return;
      }
      setDatasetKey(key);
      if (!columns.length) {
        setColumns(starterColumnsForDataset(ds));
      }
    }
    setStep((s) => s + 1);
  };

  const toggleColumn = (key) => {
    setColumns((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const canContinue = () => {
    if (step === 1) {
      return Boolean(
        topicId &&
          datasetKey &&
          Array.isArray(datasets) &&
          datasets.some((d) => d.key === datasetKey),
      );
    }
    if (step === 2) return columns.length > 0 && fields.length > 0;
    if (step === 4) return columns.length > 0;
    return true;
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a report name.');
      return;
    }
    setSaving(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const payload = {
        source_type: 'custom',
        dataset_key: datasetKey,
        name: name.trim(),
        description: description.trim() || null,
        category_id: categoryId,
        tags,
        visibility,
        definition: {
          date_range: definition.date_range,
          columns,
          filters: normalizeFilterTree(filters),
          sort,
          group_by: groupBy,
          aggregations,
          calculated_fields: [],
          formatting: {},
        },
      };
      const { data } = await reportCenterApi.createDefinition(payload);
      const newId = data?.data?.id;
      markReportWizardCompleted();
      toast.success('Report saved!');
      if (newId) {
        navigate(`${base}/accounting/reports/view/${newId}`);
      } else {
        navigate(`${base}/accounting/reports`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save report.');
    } finally {
      setSaving(false);
    }
  };

  const tip = getBuilderTip({
    datasetKey,
    columns,
    groupBy,
    filters,
    mode:
      step === 1
        ? 'wizard-topic'
        : step === 2
          ? 'wizard-fields'
          : step === 3
            ? 'wizard-filters'
            : step === 4
              ? 'wizard-reorder'
              : step === 5
                ? 'wizard-save'
                : undefined,
  });

  const currentStep = WIZARD_STEPS[step - 1];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-6 sm:px-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        {/* Header + stepper */}
        <div className="border-b border-slate-100 px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600">
                Step {step} of {WIZARD_STEPS.length}
              </p>
              <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-[22px]">
                {currentStep?.title}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
                {currentStep?.subtitle}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Link
                to={`${base}/accounting/reports/builder?mode=advanced`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 no-underline hover:text-blue-600"
              >
                <Settings2 className="size-3.5" />
                Advanced builder
              </Link>
              <WizardStepper step={step} total={WIZARD_STEPS.length} />
            </div>
          </div>
        </div>

        {/* Step content */}
        <div className="px-5 py-5 sm:px-8 sm:py-6">
          {loadingDatasets && step === 1 ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">
              <Loader2 className="size-4 animate-spin text-slate-500" />
              Loading report fields…
            </div>
          ) : null}

          {datasetsError && step === 1 && !loadingDatasets ? (
            <div className="mb-4 flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-red-800">{datasetsError}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => loadDatasets()}>
                Retry
              </Button>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              {currentStep?.infoBanner ? (
                <WizardInfoBanner>{currentStep.infoBanner}</WizardInfoBanner>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                {REPORT_TOPICS.map((t) => (
                  <TopicPickerCard
                    key={t.id}
                    icon={t.icon}
                    label={t.label}
                    description={t.description}
                    active={topicId === t.id}
                    onClick={() => selectTopic(t.id)}
                  />
                ))}
              </div>

              {topic && topicDatasets.length > 1 ? (
                <div className="space-y-3 border-t border-slate-100 pt-5">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Which data source?</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Multiple sources are available for this module.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {topicDatasets.map((ds) => {
                      const Icon = datasetIcon(ds.key);
                      return (
                        <TopicPickerCard
                          key={ds.key}
                          icon={Icon}
                          label={ds.label}
                          description={datasetDescription(ds.key)}
                          active={datasetKey === ds.key}
                          onClick={() => {
                            setDatasetKey(ds.key);
                            setColumns(starterColumnsForDataset(ds));
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {!loadingDatasets && step === 2 ? (
            <div className="space-y-4">
              {currentStep?.infoBanner ? (
                <WizardInfoBanner>{currentStep.infoBanner}</WizardInfoBanner>
              ) : (
                <BuilderContextTip tip={tip} />
              )}

              {selectedDataset ? (
                <p className="text-xs font-medium text-slate-500">
                  Data source: <span className="text-slate-800">{selectedDataset.label}</span>
                </p>
              ) : null}

              {fields.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-900">
                    No fields available for this report
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {datasetsError ||
                      'The data source could not be loaded, or your account does not have access to it.'}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setStep(1)}
                    >
                      Choose another topic
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => loadDatasets()}
                    >
                      Retry loading fields
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {standardFields.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Standard fields
                      </h3>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {standardFields.map((field) => (
                          <FieldPickerButton
                            key={field.key}
                            field={field}
                            checked={columns.includes(field.key)}
                            onToggle={toggleColumn}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {customReportFields.length > 0 ? (
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                          Your custom fields
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-600">
                          Fields you defined under Settings → Custom Fields
                        </p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {customReportFields.map((field) => (
                          <FieldPickerButton
                            key={field.key}
                            field={field}
                            checked={columns.includes(field.key)}
                            onToggle={toggleColumn}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-violet-200 bg-violet-50/40 px-3 py-3 text-xs text-violet-900">
                      No custom fields are linked to this data source yet. Create them in Settings → Custom Fields, then return here.
                    </div>
                  )}

                  <p className="text-sm font-medium text-slate-700">
                    {columns.length} field{columns.length === 1 ? '' : 's'} selected
                    {customReportFields.length > 0
                      ? ` · ${columns.filter((k) => customReportFields.some((f) => f.key === k)).length} custom`
                      : ''}
                  </p>
                </>
              )}
            </div>
          ) : null}

          {!loadingDatasets && step === 3 ? (
            <div className="space-y-4">
              {currentStep?.infoBanner ? (
                <WizardInfoBanner>{currentStep.infoBanner}</WizardInfoBanner>
              ) : (
                <BuilderContextTip tip={tip} />
              )}
              {filterableFields.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-900">
                    No filterable fields for this report
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Continue to arrange your columns — you can add filters later in the advanced builder.
                  </p>
                </div>
              ) : (
                <FilterBuilder
                  variant="wizard"
                  filterableFields={filterableFields}
                  tree={filters}
                  onChange={setFilters}
                />
              )}
            </div>
          ) : null}

          {!loadingDatasets && step === 4 ? (
            <div className="space-y-4">
              {currentStep?.infoBanner ? (
                <WizardInfoBanner>{currentStep.infoBanner}</WizardInfoBanner>
              ) : (
                <BuilderContextTip tip={tip} />
              )}
              <ColumnOrderList
                columns={columns}
                fields={fields}
                onReorder={setColumns}
              />
            </div>
          ) : null}

          {!loadingDatasets && step === 5 ? (
            <div className="mx-auto max-w-xl space-y-5">
              <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <Check className="size-5" strokeWidth={2.5} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    {currentStep?.successTitle || 'Report Configuration Ready'}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-emerald-800/90">
                    {currentStep?.successMessage ||
                      'Give your report a name to save it to your Reports Hub.'}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold text-slate-900">Report name</Label>
                <Input
                  className="mt-1.5 h-10 text-sm text-slate-900 placeholder:text-slate-400"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Inventory Stock Summary Report"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-900">
                  Description <span className="font-normal text-slate-400">(Optional)</span>
                </Label>
                <Textarea
                  className="mt-1.5 min-h-[88px] text-sm text-slate-900 placeholder:text-slate-400"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add notes for your team about this dataset…"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-900">Default date filter</Label>
                <Select value={defaultDateRangeKey} onValueChange={setDefaultDateRangeKey}>
                  <SelectTrigger className="mt-1.5 h-10">
                    <SelectValue placeholder="Choose default period" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_DEFAULT_DATE_RANGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-slate-500">
                  Example for year to date: 01/01/{new Date().getFullYear()} → today. You can still
                  change dates when viewing the report.
                </p>
              </div>
              {categories.length > 0 ? (
                <div>
                  <Label className="text-sm font-semibold text-slate-900">Folder / category</Label>
                  <Select value={categoryId ? String(categoryId) : ''} onValueChange={(v) => setCategoryId(v ? Number(v) : null)}>
                    <SelectTrigger className="mt-1.5 h-10">
                      <SelectValue placeholder="Choose a folder (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div>
                <Label className="text-sm font-semibold text-slate-900">Tags</Label>
                <Input
                  className="mt-1.5 h-10 text-sm text-slate-900 placeholder:text-slate-400"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="sales, monthly, finance"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-900">Who can see this?</Label>
                <Select value={visibility} onValueChange={setVisibility}>
                  <SelectTrigger className="mt-1.5 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Only me</SelectItem>
                    <SelectItem value="company">Everyone in company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Summary
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{selectedDataset?.label}</Badge>
                  <Badge variant="outline">{columns.length} columns</Badge>
                  {filters ? <Badge variant="outline">Filtered</Badge> : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-8">
          {step === 1 ? (
            <Button variant="outline" size="sm" className="h-9" asChild>
              <Link to={`${base}/accounting/reports`}>Cancel &amp; Exit</Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="h-9" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          {step < 5 ? (
            <Button
              size="sm"
              disabled={!canContinue() || (step === 1 && loadingDatasets)}
              className="h-9 gap-1.5 bg-blue-600 px-5 hover:bg-blue-700"
              onClick={goNext}
            >
              {currentStep?.nextLabel || 'Next'}
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={saving || !name.trim()}
              className="h-9 gap-1.5 bg-blue-600 px-5 hover:bg-blue-700"
              onClick={handleSave}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {currentStep?.nextLabel || 'Save report'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
