import { formatDisplayDate } from '@/lib/format-datetime';

export const EMPLOYEE_ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'manager', label: 'Manager' },
];

export function formatEmployeeDate(iso) {
  return formatDisplayDate(iso);
}

export function employeeInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Light, fast dialog overlay — no blur, short fade. */
export const FAST_DIALOG_OVERLAY =
  'bg-black/25 backdrop-blur-none duration-75 data-[state=open]:duration-75 data-[state=closed]:duration-75';

