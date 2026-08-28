/**
 * Client-side mirror of App\Domain\Reporting\Builder\FilterOperator — for
 * populating the operator picker only. The server re-validates every
 * condition against the same rules (FilterTreeValidator) regardless of
 * what the client sends, so this list being out of sync would just be a
 * worse UX, never a safety gap.
 */
export const OPERATOR_LABELS = {
  equals: 'Equals',
  not_equals: 'Not equals',
  contains: 'Contains',
  starts_with: 'Starts with',
  ends_with: 'Ends with',
  greater_than: 'Greater than',
  greater_than_or_equal: 'Greater than or equal',
  less_than: 'Less than',
  less_than_or_equal: 'Less than or equal',
  between: 'Between',
  in: 'In',
  not_in: 'Not in',
  is_empty: 'Is empty',
  is_not_empty: 'Is not empty',
  relative_date: 'Relative date',
};

export const RELATIVE_DATE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'last_quarter', label: 'Last Quarter' },
  { value: 'year_to_date', label: 'Year to date (Jan 1 – today)' },
  { value: 'this_year', label: 'This calendar year (Jan – Dec)' },
  { value: 'custom_range', label: 'Custom Range' },
];

/** Presets shown when creating a custom report (default date filter). */
export const REPORT_DEFAULT_DATE_RANGE_OPTIONS = [
  { value: 'year_to_date', label: 'Year to date (Jan 1 – today)' },
  { value: 'this_month', label: 'This month' },
  { value: 'this_quarter', label: 'This quarter' },
  { value: 'this_year', label: 'This calendar year (Jan – Dec)' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_month', label: 'Last month' },
];

export const DEFAULT_REPORT_DATE_RANGE_KEY = 'year_to_date';

const NO_VALUE = ['is_empty', 'is_not_empty'];
const ARRAY_VALUE = ['between', 'in', 'not_in'];
const STRING_ONLY = ['contains', 'starts_with', 'ends_with'];
const COMPARISON_ONLY = ['greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'between'];

export function operatorsForType(type) {
  const ops = ['equals', 'not_equals', 'in', 'not_in', 'is_empty', 'is_not_empty'];
  if (type === 'string') ops.push(...STRING_ONLY);
  if (['number', 'money', 'date', 'datetime'].includes(type)) ops.push(...COMPARISON_ONLY);
  if (type === 'date' || type === 'datetime') ops.push('relative_date');
  return ops;
}

export function operatorNeedsValue(operator) {
  return !NO_VALUE.includes(operator);
}

export function operatorNeedsArrayValue(operator) {
  return ARRAY_VALUE.includes(operator);
}
