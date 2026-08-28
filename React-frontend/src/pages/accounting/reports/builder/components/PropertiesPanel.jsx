import { Calculator, Filter, ListOrdered, Palette, Settings2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { FilterBuilder } from './FilterBuilder';
import { SortPanel } from './SortPanel';
import { GroupByPanel } from './GroupByPanel';
import { AggregationPanel } from './AggregationPanel';
import { CalculatedFieldBuilder } from './CalculatedFieldBuilder';
import { FormattingPanel } from './FormattingPanel';
import { ReportSettingsPanel } from './ReportSettingsPanel';
import { EmptyPanelPlaceholder } from './EmptyPanelPlaceholder';
import { countFilterConditions } from '../filter-tree';
import { BUILDER_COPY } from '../../lib/report-business-copy';

function CountDot({ count }) {
  if (!count) return null;
  return (
    <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-semibold text-white">
      {count > 9 ? '9+' : count}
    </span>
  );
}

/**
 * Right-side properties panel: Filters, Organize, Calculations,
 * Display, and Details — with clearer hierarchy and blue theme accents.
 */
export function PropertiesPanel({
  filterableFields,
  sortableFields,
  groupableFields,
  aggregatableFields,
  numericFields,
  definition,
  onUpdate,
  categories,
}) {
  const filterCount = countFilterConditions(definition.filters);
  const sortCount = definition.sort.length;
  const groupCount = definition.group_by.length;
  const aggCount = definition.aggregations.length;
  const shapeCount = sortCount + groupCount + aggCount;
  const calcCount = definition.calculated_fields.length;

  return (
    <Tabs defaultValue="filters" className="flex h-full w-full flex-col bg-[#F8FAFC]">
      <div className="border-b border-slate-200/80 bg-white px-3 pt-3">
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Configure
        </p>
        <TabsList className="grid h-auto w-full grid-cols-5 gap-1 rounded-xl bg-slate-100/80 p-1">
          <PanelTab value="filters" icon={Filter} label={BUILDER_COPY.filtersTab} count={filterCount} />
          <PanelTab value="shape" icon={ListOrdered} label={BUILDER_COPY.shapeTab} count={shapeCount} />
          <PanelTab value="calc" icon={Calculator} label={BUILDER_COPY.calcTab} count={calcCount} />
          <PanelTab value="format" icon={Palette} label={BUILDER_COPY.formatTab} />
          <PanelTab value="settings" icon={Settings2} label={BUILDER_COPY.setupTab} />
        </TabsList>
      </div>

      <div className="flex-1 overflow-y-auto">
        <TabsContent value="filters" className="mt-0 px-4 py-4">
          <PanelHeading title={BUILDER_COPY.filtersTitle} description={BUILDER_COPY.filtersDescription} />
          {filterableFields.length === 0 ? (
            <EmptyPanelPlaceholder
              icon={Filter}
              title={BUILDER_COPY.filterEmptyTitle}
              description={BUILDER_COPY.filterEmptyDescription}
            />
          ) : (
            <FilterBuilder
              filterableFields={filterableFields}
              tree={definition.filters}
              onChange={(filters) => onUpdate({ filters })}
            />
          )}
        </TabsContent>

        <TabsContent value="shape" className="mt-0 flex flex-col gap-6 px-4 py-4">
          <div>
            <PanelHeading
              title={BUILDER_COPY.sortTitle}
              description="Control the order rows appear in your report."
            />
            {sortableFields.length === 0 ? (
              <EmptyPanelPlaceholder
                icon={ListOrdered}
                title={BUILDER_COPY.sortEmptyTitle}
                description={BUILDER_COPY.sortEmptyDescription}
              />
            ) : (
              <SortPanel
                sortableFields={sortableFields}
                sort={definition.sort}
                onChange={(sort) => onUpdate({ sort })}
              />
            )}
          </div>
          <div>
            <PanelHeading title={BUILDER_COPY.groupTitle} description={BUILDER_COPY.groupEmptyDescription} />
            <GroupByPanel
              groupableFields={groupableFields}
              groupBy={definition.group_by}
              onChange={(group_by) => onUpdate({ group_by })}
            />
          </div>
          <div>
            <PanelHeading title={BUILDER_COPY.aggTitle} description="Summarize amounts across each group." />
            <AggregationPanel
              aggregatableFields={aggregatableFields}
              aggregations={definition.aggregations}
              onChange={(aggregations) => onUpdate({ aggregations })}
            />
          </div>
        </TabsContent>

        <TabsContent value="calc" className="mt-0 px-4 py-4">
          <PanelHeading
            title="Calculated fields"
            description="Build a formula from fields already in this report."
          />
          {numericFields.length === 0 ? (
            <EmptyPanelPlaceholder
              icon={Calculator}
              title="No numeric fields available"
              description="Calculated fields need at least one number or money field."
            />
          ) : (
            <CalculatedFieldBuilder
              numericFields={numericFields}
              calculatedFields={definition.calculated_fields}
              onChange={(calculated_fields) => onUpdate({ calculated_fields })}
            />
          )}
        </TabsContent>

        <TabsContent value="format" className="mt-0 px-4 py-4">
          <PanelHeading title="Formatting" description="Display preferences for numbers and dates." />
          <FormattingPanel
            formatting={definition.formatting}
            onChange={(formatting) => onUpdate({ formatting })}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-0 px-4 py-4">
          <PanelHeading
            title="Report settings"
            description="Name, default date filter, category, and who can see this report."
          />
          <ReportSettingsPanel
            settings={definition.render_settings}
            categories={categories}
            onChange={(render_settings) => onUpdate({ render_settings })}
            dateRange={definition.date_range}
            onDateRangeChange={(date_range) => onUpdate({ date_range })}
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}

function PanelTab({ value, icon: Icon, label, count }) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        'flex-col gap-0.5 rounded-lg py-2 text-[10px] font-medium text-slate-500',
        'data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm',
      )}
    >
      <span className="flex items-center">
        <Icon className="size-3.5" strokeWidth={1.75} />
        <CountDot count={count} />
      </span>
      {label}
    </TabsTrigger>
  );
}

function PanelHeading({ title, description }) {
  return (
    <div className="mb-3">
      <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
      {description ? (
        <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}
