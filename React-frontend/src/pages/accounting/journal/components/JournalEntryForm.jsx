import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeftRight,
  BookOpen,
  CheckCircle2,
  Landmark,
  Plus,
  Receipt,
  RefreshCw,
  Scale,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { journalsApi } from "../api/journals.api";
import {
  EMPTY_JOURNAL_LINE,
  JOURNAL_TYPE_HINTS,
  JOURNAL_TYPES_WITH_JOB_ORDER,
  TYPE_COLORS,
  buildJournalPayload,
  formatCurrency,
  getJournalBalanceSummary,
  isJournalEntryBalanced,
  lineTotals,
} from "../constants";
import { AccountPickerSelect } from "@/components/accounting/AccountPickerSelect";
import { JobOrderPickerSelect } from "@/components/accounting/JobOrderPickerSelect";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

const NO_NUMBER_SPINNER =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const LINE_INPUT =
  "h-9 w-full border-0 shadow-none bg-transparent rounded-none px-3 focus-visible:ring-0 focus-visible:ring-offset-0";

const LINE_INPUT_NUM = cn(
  LINE_INPUT,
  NO_NUMBER_SPINNER,
  "text-right tabular-nums font-medium",
);

const FIELD_LABEL =
  "text-[11px] font-medium uppercase tracking-wide text-muted-foreground";

const TYPE_ICONS = {
  general: BookOpen,
  expense: Receipt,
  adjustment: SlidersHorizontal,
  accrual: TrendingUp,
  payment: Wallet,
  transfer: ArrowLeftRight,
  investment: Landmark,
};

function FieldError({ message }) {
  if (!message) return null;
  return <p className="text-[11px] text-destructive mt-0.5">{message}</p>;
}

function BalanceMetric({ label, value, tone = "neutral" }) {
  const toneClass =
    tone === "debit"
      ? "border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/25"
      : tone === "credit"
        ? "border-sky-200/80 bg-sky-50/50 dark:border-sky-900/40 dark:bg-sky-950/25"
        : tone === "gap"
          ? "border-amber-200/80 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/25"
          : tone === "matched"
            ? "border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/25"
            : "border-border bg-muted/30";

  const valueClass =
    tone === "debit"
      ? "text-emerald-800 dark:text-emerald-300"
      : tone === "credit"
        ? "text-sky-800 dark:text-sky-300"
        : tone === "gap"
          ? "text-amber-900 dark:text-amber-300"
          : tone === "matched"
            ? "text-emerald-800 dark:text-emerald-300"
            : "text-foreground";

  return (
    <div className={cn("rounded-lg border px-3 py-2 min-w-[7.5rem]", toneClass)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("text-sm font-bold tabular-nums mt-0.5", valueClass)}>{value}</p>
    </div>
  );
}

function JournalBalanceFooter({ totals, currency, isBalanced, saving, submitLabel }) {
  const summary = getJournalBalanceSummary(totals, currency);
  const gapLabel =
    summary.state === "balanced"
      ? "Difference"
      : summary.state === "empty"
        ? "To balance"
        : "Shortfall";

  const gapValue =
    summary.state === "balanced"
      ? "Matched"
      : summary.state === "empty"
        ? "—"
        : formatCurrency(summary.shortfallAmount, currency);

  const gapTone =
    summary.state === "balanced"
      ? "matched"
      : summary.state === "empty"
        ? "neutral"
        : "gap";

  const statusStyles =
    summary.state === "balanced"
      ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/30"
      : summary.state === "empty"
        ? "border-border bg-muted/25"
        : "border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/25";

  const StatusIcon =
    summary.state === "balanced"
      ? CheckCircle2
      : summary.state === "empty"
        ? Scale
        : AlertCircle;

  const iconClass =
    summary.state === "balanced"
      ? "text-emerald-600 dark:text-emerald-400"
      : summary.state === "empty"
        ? "text-muted-foreground"
        : "text-amber-700 dark:text-amber-400";

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch lg:justify-between px-4 py-3.5 border-t bg-muted/10">
      <div
        className={cn(
          "flex gap-3 rounded-lg border px-3.5 py-3 min-w-0 flex-1",
          statusStyles,
        )}
      >
        <StatusIcon className={cn("size-5 shrink-0 mt-0.5", iconClass)} />
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold leading-tight">{summary.title}</p>
          <p className="text-xs text-foreground/85 leading-relaxed">{summary.message}</p>
          {summary.hint ? (
            <p className="text-[11px] text-muted-foreground leading-relaxed">{summary.hint}</p>
          ) : null}
          {summary.shortfallSide ? (
            <p className="text-[11px] font-medium text-amber-900/90 dark:text-amber-200/90 pt-0.5">
              {summary.shortfallSide === "credit"
                ? "→ Enter the shortfall on a credit line"
                : "→ Enter the shortfall on a debit line"}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <BalanceMetric
            label="Total debit"
            value={formatCurrency(totals.debit, currency)}
            tone="debit"
          />
          <BalanceMetric
            label="Total credit"
            value={formatCurrency(totals.credit, currency)}
            tone="credit"
          />
          <BalanceMetric label={gapLabel} value={gapValue} tone={gapTone} />
        </div>

        <Button
          type="submit"
          disabled={saving || !isBalanced}
          className="sm:min-w-[140px] shrink-0"
        >
          {saving ? "Saving…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

function JournalTypePicker({ value, onChange, types, error }) {
  const activeHint = JOURNAL_TYPE_HINTS[value];

  return (
    <div className="space-y-1">
      <Label className={FIELD_LABEL}>Type</Label>
      <div className="flex flex-wrap gap-1.5">
        {types.map((type) => {
          const Icon = TYPE_ICONS[type.value] || BookOpen;
          const selected = value === type.value;
          return (
            <button
              key={type.value}
              type="button"
              title={JOURNAL_TYPE_HINTS[type.value] || type.label}
              onClick={() => onChange(type.value)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors",
                selected
                  ? cn(
                      "shadow-sm",
                      TYPE_COLORS[type.value] || TYPE_COLORS.general,
                    )
                  : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="truncate max-w-[9rem]">{type.label}</span>
            </button>
          );
        })}
      </div>
      {activeHint ? (
        <p className="text-[11px] text-muted-foreground leading-snug">
          {activeHint}
        </p>
      ) : null}
      <FieldError message={error} />
    </div>
  );
}

export function JournalEntryForm({
  form,
  setForm,
  errors = {},
  groupedAccounts = [],
  journalTypes = [],
  baseCurrency = "USD",
  currencies = ["USD"],
  multiCurrency = false,
  canCreateCoa = true,
  onAccountCreated,
  saving = false,
  onSubmit,
  submitLabel = "Save entry",
}) {
  const [rateHint, setRateHint] = useState("");

  const totals = useMemo(() => lineTotals(form.lines), [form.lines]);
  const isBalanced = isJournalEntryBalanced(totals);
  const currency = form.currency || baseCurrency;
  const typeOptions =
    journalTypes.length > 0
      ? journalTypes
      : [{ value: "general", label: "General journal" }];

  useEffect(() => {
    if (!multiCurrency) {
      setRateHint("");
      return;
    }
    const curr = (form.currency || baseCurrency).toUpperCase();
    if (curr === baseCurrency.toUpperCase()) {
      setRateHint("");
      return;
    }
    setRateHint("Loading rate…");
    let cancelled = false;
    journalsApi
      .exchangeRate({ currency: curr, date: form.entry_date })
      .then((res) => {
        if (cancelled) return;
        const rate = parseFloat(res.data?.data?.rate ?? res.data?.rate);
        if (!Number.isFinite(rate) || rate <= 0) {
          setRateHint("Rate not found");
        } else {
          setRateHint(`1 ${curr} = ${rate.toFixed(6)} ${baseCurrency}`);
          setForm((f) => ({ ...f, exchange_rate: String(rate) }));
        }
      })
      .catch(() => {
        if (!cancelled) setRateHint("Rate unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [form.currency, form.entry_date, baseCurrency, multiCurrency, setForm]);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const setLine = (index, patch) => {
    setForm((f) => {
      const lines = [...f.lines];
      lines[index] = { ...lines[index], ...patch };
      return { ...f, lines };
    });
  };

  const addLine = () => {
    setForm((f) => ({
      ...f,
      lines: [...f.lines, { ...EMPTY_JOURNAL_LINE }],
    }));
  };

  const removeLine = (index) => {
    setForm((f) => {
      if (f.lines.length <= 2) return f;
      return { ...f, lines: f.lines.filter((_, i) => i !== index) };
    });
  };

  const handleDebitChange = (index, value) => {
    setLine(index, {
      debit: value,
      credit: value ? "" : form.lines[index]?.credit,
    });
  };

  const handleCreditChange = (index, value) => {
    setLine(index, {
      credit: value,
      debit: value ? "" : form.lines[index]?.debit,
    });
  };

  const showExchangeRate =
    multiCurrency &&
    (form.currency || "").toUpperCase() !== baseCurrency.toUpperCase();
  const showJobPicker = JOURNAL_TYPES_WITH_JOB_ORDER.includes(
    form.type || "general",
  );

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!isBalanced) return;
    onSubmit(buildJournalPayload(form));
  };

  return (
    <form onSubmit={handleFormSubmit} className="w-full min-w-0">
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/15 space-y-3">
          <JournalTypePicker
            value={form.type}
            onChange={(v) => setField("type", v)}
            types={typeOptions}
            error={errors.type}
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
            <div className="space-y-1 lg:col-span-2">
              <Label className={FIELD_LABEL}>Date</Label>
              <DatePicker
                value={form.entry_date}
                onChange={(v) => setField("entry_date", v || "")}
              />
              <FieldError message={errors.entry_date || errors.date} />
            </div>

            <div className="space-y-1 lg:col-span-2">
              <Label className={FIELD_LABEL}>Reference</Label>
              <Input
                className="h-9"
                value={form.reference}
                onChange={(e) => setField("reference", e.target.value)}
                placeholder="JE-001"
              />
              <FieldError message={errors.reference} />
            </div>

            <div className="space-y-1 lg:col-span-2">
              <Label className={FIELD_LABEL}>Currency</Label>
              <SearchableCombobox
                value={form.currency}
                onValueChange={(v) => setField("currency", v)}
                options={currencies.map((c) => ({ value: c, label: c }))}
                placeholder={baseCurrency}
                searchPlaceholder="Search…"
                disabled={!multiCurrency}
              />
            </div>

            {showExchangeRate ? (
              <div className="space-y-1 lg:col-span-3">
                <Label className={FIELD_LABEL}>Exchange rate</Label>
                <div className="flex gap-1.5">
                  <Input
                    className="h-9"
                    type="number"
                    step="0.000001"
                    min="0.000001"
                    value={form.exchange_rate}
                    onChange={(e) => setField("exchange_rate", e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 size-9"
                    title="Refresh rate"
                    onClick={() => {
                      const curr = form.currency;
                      setField("currency", "");
                      setTimeout(() => setField("currency", curr), 0);
                    }}
                  >
                    <RefreshCw className="size-3.5" />
                  </Button>
                </div>
                {rateHint ? (
                  <p className="text-[10px] text-muted-foreground">
                    {rateHint}
                  </p>
                ) : null}
                <FieldError message={errors.exchange_rate} />
              </div>
            ) : null}

            {showJobPicker ? (
              <div
                className={cn(
                  "space-y-1 sm:col-span-2",
                  showExchangeRate ? "lg:col-span-3" : "lg:col-span-3",
                )}
              >
                <JobOrderPickerSelect
                  value={form.job_order_id || ""}
                  onValueChange={(v) => setField("job_order_id", v || "")}
                  label="Job order"
                  hint="Costs on this entry count toward the linked job's profitability."
                />
                <FieldError message={errors.job_order_id} />
              </div>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label className={FIELD_LABEL}>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="What this entry is for — shown on reports and the general ledger."
              rows={2}
              className="min-h-[72px] resize-y text-sm leading-relaxed"
            />
            <FieldError message={errors.description} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b bg-muted/10">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Journal lines</h3>
            <p className="text-[11px] text-muted-foreground">
              Debits must equal credits before saving.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={addLine}
          >
            <Plus className="size-3.5 mr-1" />
            Add line
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b bg-muted/30 text-muted-foreground text-xs">
                <th className="text-center font-medium px-2 py-2 w-9">#</th>
                <th className="text-left font-medium px-3 py-2 w-[min(220px,28%)]">
                  Account
                </th>
                <th className="text-left font-medium px-3 py-2 min-w-[180px]">
                  Line memo
                </th>
                <th className="text-right font-medium px-3 py-2 w-[120px]">
                  Debit
                </th>
                <th className="text-right font-medium px-3 py-2 w-[120px]">
                  Credit
                </th>
                <th className="w-9" />
              </tr>
            </thead>
            <tbody>
              {form.lines.map((line, idx) => (
                <tr
                  key={idx}
                  className="border-b last:border-b-0 group hover:bg-muted/10 transition-colors"
                >
                  <td className="px-2 py-0 align-middle text-center text-[11px] text-muted-foreground tabular-nums border-r bg-muted/10">
                    {idx + 1}
                  </td>
                    <td className="p-0 align-middle border-r">
                    <AccountPickerSelect
                      value={line.account_id || undefined}
                      onValueChange={(v) => setLine(idx, { account_id: v })}
                      groupedAccounts={groupedAccounts}
                      placeholder="Select account"
                      currency={currency}
                      showBalance
                      canCreate={canCreateCoa}
                      onAccountCreated={onAccountCreated}
                      className={cn(LINE_INPUT, "min-w-[200px]")}
                    />
                    {errors[`lines.${idx}.account_id`] ? (
                      <div className="px-2 pb-1">
                        <FieldError
                          message={errors[`lines.${idx}.account_id`]}
                        />
                      </div>
                    ) : null}
                  </td>
                  <td className="p-0 align-middle border-r">
                    <Input
                      className={LINE_INPUT}
                      value={line.description}
                      onChange={(e) =>
                        setLine(idx, { description: e.target.value })
                      }
                      placeholder="Optional"
                    />
                  </td>
                  <td className="p-0 align-middle border-r bg-emerald-500/[0.04]">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className={LINE_INPUT_NUM}
                      value={line.debit}
                      onChange={(e) => handleDebitChange(idx, e.target.value)}
                      disabled={!!line.credit}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="p-0 align-middle border-r bg-sky-500/[0.04]">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className={LINE_INPUT_NUM}
                      value={line.credit}
                      onChange={(e) => handleCreditChange(idx, e.target.value)}
                      disabled={!!line.debit}
                      placeholder="0.00"
                    />
                  </td>
                  <td className="p-0 align-middle">
                    <div className="flex items-center justify-center h-9">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        disabled={form.lines.length <= 2}
                        onClick={() => removeLine(idx)}
                        aria-label={`Remove line ${idx + 1}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/25 border-t">
                <td
                  colSpan={3}
                  className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Totals
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  {formatCurrency(totals.debit, currency)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-sm font-semibold text-sky-800 dark:text-sky-300">
                  {formatCurrency(totals.credit, currency)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <JournalBalanceFooter
          totals={totals}
          currency={currency}
          isBalanced={isBalanced}
          saving={saving}
          submitLabel={submitLabel}
        />
      </div>

      <FieldError message={errors.lines} />
    </form>
  );
}
