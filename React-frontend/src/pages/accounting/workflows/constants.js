export const MODULES = [
  { value: 'invoice', label: 'Invoices', noun: 'Invoice', created: 'Invoice Created', posted: 'Invoice Posted' },
  { value: 'bill', label: 'Bills', noun: 'Bill', created: 'Bill Created', posted: 'Bill Posted' },
  { value: 'expense', label: 'Expenses', noun: 'Expense', created: 'Expense Created', posted: 'Expense Posted' },
  { value: 'payment', label: 'Customer Payments', noun: 'Payment', created: 'Payment Created', posted: 'Payment Posted' },
  { value: 'bill_payment', label: 'Bill Payments', noun: 'Bill Payment', created: 'Bill Payment Created', posted: 'Bill Payment Posted' },
  { value: 'purchase_order', label: 'Purchase Orders', noun: 'Purchase Order', created: 'PO Created', posted: 'PO Confirmed' },
  { value: 'vendor_credit', label: 'Vendor Credits', noun: 'Vendor Credit', created: 'Credit Created', posted: 'Credit Applied' },
  { value: 'stock_adjustment', label: 'Stock Adjustments', noun: 'Stock Adjustment', created: 'Adjustment Created', posted: 'Stock Updated' },
  { value: 'transfer', label: 'Bank Transfers', noun: 'Transfer', created: 'Transfer Created', posted: 'Transfer Posted' },
  { value: 'deposit', label: 'Deposits', noun: 'Deposit', created: 'Deposit Created', posted: 'Deposit Posted' },
  { value: 'withdrawal', label: 'Withdrawals', noun: 'Withdrawal', created: 'Withdrawal Created', posted: 'Withdrawal Posted' },
  { value: 'recurring_expense', label: 'Recurring Expenses', noun: 'Recurring Expense', created: 'Schedule Created', posted: 'Schedule Active' },
  { value: 'vendor', label: 'Vendors', noun: 'Vendor', created: 'Vendor Created', posted: 'Vendor Active' },
];

export const MODULE_MAP = Object.fromEntries(MODULES.map((m) => [m.value, m]));

export const APPROVER_PRESETS = [
  { id: 'owner', label: 'Owner', description: 'Company owner makes the decision', assignee_type: 'owner', roles: ['owner', 'company_owner'] },
  { id: 'manager', label: 'Manager', description: 'Any user with the Manager role', assignee_type: 'role', roles: ['manager'] },
  { id: 'accountant', label: 'Accountant', description: 'Finance / accounting team', assignee_type: 'role', roles: ['accountant'] },
  { id: 'employee', label: 'Employee', description: 'Staff members with Employee role', assignee_type: 'role', roles: ['employee'] },
  { id: 'role', label: 'Custom role', description: 'Choose any company role', assignee_type: 'role', roles: ['manager'] },
];

export const ROLE_OPTIONS = [
  { value: 'company_owner', label: 'Company Owner' },
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'employee', label: 'Employee' },
];

export const APPROVAL_TYPES = [
  { value: 'sequential', label: 'One after another', hint: 'Each approver must finish before the next starts' },
  { value: 'parallel_any', label: 'Anyone can approve', hint: 'One approval from the group completes this step' },
  { value: 'parallel_all', label: 'Everyone must approve', hint: 'All listed roles must approve this step' },
];

export const RULE_FIELDS = [
  { value: 'always', label: 'Always', type: 'always' },
  { value: 'amount', label: 'Document amount', type: 'number', unit: 'amount' },
  { value: 'currency', label: 'Currency', type: 'text' },
  { value: 'discount_percent', label: 'Discount %', type: 'number' },
  { value: 'warehouse_id', label: 'Warehouse', type: 'text', placeholder: 'Warehouse ID' },
  { value: 'branch_id', label: 'Branch', type: 'text', placeholder: 'Branch ID' },
  { value: 'payment_method', label: 'Payment method', type: 'text' },
  { value: 'user_role', label: 'Created by role', type: 'text' },
];

export const RULE_OPS = [
  { value: 'eq', label: 'equals', symbol: '=' },
  { value: 'neq', label: 'does not equal', symbol: '≠' },
  { value: 'gt', label: 'is greater than', symbol: '>' },
  { value: 'gte', label: 'is at least', symbol: '≥' },
  { value: 'lt', label: 'is less than', symbol: '<' },
  { value: 'lte', label: 'is at most', symbol: '≤' },
];

export const WIZARD_STEPS = [
  { key: 'basics', title: 'Basics', subtitle: 'Name and document type' },
  { key: 'rules', title: 'When it runs', subtitle: 'Conditions for this workflow' },
  { key: 'flow', title: 'Approval flow', subtitle: 'Who approves, and in what order' },
  { key: 'review', title: 'Review', subtitle: 'Confirm and activate' },
];

/** Visual enrichment for API templates (keyed by backend template key). */
export const TEMPLATE_CARDS = {
  single_manager: {
    title: 'Single approval',
    blurb: 'Perfect for small companies — one manager reviews every document.',
    preview: ['Created', 'Manager', 'Posted'],
    tone: 'emerald',
  },
  amount_dual: {
    title: 'Two-level approval',
    blurb: 'Manager reviews first, then the owner gives final approval.',
    preview: ['Created', 'Manager', 'Owner', 'Posted'],
    tone: 'sky',
  },
  high_value: {
    title: 'High-value threshold',
    blurb: 'Owner approval when the amount is at least 10,000.',
    preview: ['Created', 'Owner', 'Posted'],
    tone: 'amber',
  },
  parallel_finance: {
    title: 'Parallel finance',
    blurb: 'Any one of Manager or Accountant can approve.',
    preview: ['Created', 'Finance (any)', 'Posted'],
    tone: 'violet',
  },
};

export const LOCAL_STARTER_TEMPLATES = [
  {
    key: 'local_three_level',
    title: 'Three-level approval',
    blurb: 'Manager → Finance → Owner. Ideal for mid-size finance controls.',
    preview: ['Created', 'Manager', 'Finance', 'Owner', 'Posted'],
    tone: 'indigo',
    module: 'invoice',
    build: () => ({
      name: 'Three-level approval',
      description: 'Manager, then accountant, then owner.',
      module: 'invoice',
      priority: 50,
      is_active: true,
      amount_min: '',
      rules: [{ field: 'always', op: 'eq', value: true }],
      steps: [
        emptyStep({ name: 'Manager Approval', roles: ['manager'] }),
        emptyStep({ name: 'Finance Approval', roles: ['accountant'] }),
        emptyStep({ name: 'Owner Approval', assignee_type: 'owner', roles: ['owner', 'company_owner'] }),
      ],
    }),
  },
  {
    key: 'local_owner_only',
    title: 'Owner approval',
    blurb: 'Employee submits → Owner decides. Simple and clear.',
    preview: ['Created', 'Owner', 'Posted'],
    tone: 'zinc',
    module: 'expense',
    build: () => ({
      name: 'Owner approval',
      description: 'Documents go straight to the company owner.',
      module: 'expense',
      priority: 80,
      is_active: true,
      amount_min: '',
      rules: [{ field: 'always', op: 'eq', value: true }],
      steps: [emptyStep({ name: 'Owner Approval', assignee_type: 'owner', roles: ['owner', 'company_owner'] })],
    }),
  },
];

export function emptyStep(overrides = {}) {
  return {
    id: `step_${Math.random().toString(36).slice(2, 9)}`,
    name: 'Manager Approval',
    mode: 'sequential',
    assignee_type: 'role',
    roles: ['manager'],
    min_amount: 0,
    sla_hours: '',
    expanded: true,
    ...overrides,
  };
}

export function emptyForm(overrides = {}) {
  return {
    name: '',
    description: '',
    module: 'invoice',
    priority: 100,
    is_active: true,
    amount_min: '',
    rules: [{ field: 'always', op: 'eq', value: true }],
    steps: [emptyStep()],
    ...overrides,
  };
}
