export const FAQ_CATEGORIES = [
  { id: 'all', label: 'All topics' },
  { id: 'getting-started', label: 'Getting started' },
  { id: 'account', label: 'Account & companies' },
  { id: 'accounting', label: 'Accounting' },
  { id: 'sales', label: 'Sales & invoicing' },
  { id: 'purchases', label: 'Purchases & expenses' },
  { id: 'banking', label: 'Banking' },
  { id: 'permissions', label: 'Roles & permissions' },
];

export const ACCOUNT_OWNER_FAQS = [
  {
    category: 'getting-started',
    keywords: 'dashboard account workspace difference overview',
    q: 'What is the difference between my account dashboard and a company workspace?',
    a: 'Your account dashboard shows all companies under your subscription—usage, plan limits, and quick links. A company workspace is where day-to-day ERP work happens: invoicing, bills, journals, inventory, and reports for one legal entity. Open a company from the dashboard or company list to enter its workspace.',
  },
  {
    category: 'account',
    keywords: 'create company new register entity',
    q: 'How do I create a new company?',
    a: 'Go to Companies → Create company (or use New company on the dashboard). Complete the wizard with legal name, currency, and contact details. After creation, open the workspace to configure chart of accounts, taxes, and opening balances before posting transactions.',
  },
  {
    category: 'account',
    keywords: 'switch company switcher multiple',
    q: 'How do I switch between companies?',
    a: 'Use the company switcher in the top header to jump between workspaces. Each company keeps its own books, users, and settings. Your account owner dashboard always shows the full portfolio regardless of which workspace you last visited.',
  },
  {
    category: 'account',
    keywords: 'plan limit subscription companies quota',
    q: 'What happens when I reach my company limit?',
    a: 'Your plan defines how many active companies you can create. When the limit is reached, the Create company action is disabled until you upgrade or deactivate an unused company. Check usage on the account dashboard or Companies page.',
  },
  {
    category: 'permissions',
    keywords: 'invite user team member access role',
    q: 'How do I give someone access to a company?',
    a: 'Open the company workspace → Settings → Users (or Team). Invite by email and assign a role. Roles control which modules and actions are visible. Account owners manage companies; workspace admins manage users inside each company.',
  },
  {
    category: 'getting-started',
    keywords: 'tour onboarding walkthrough guide',
    q: 'Can I replay the workspace tour?',
    a: 'Yes. On this Help page, click Run workspace tour again (inside a company workspace) to reset the guided walkthrough and return to the dashboard. Account owners can open any company workspace first, then start the tour from that workspace Help page.',
  },
  {
    category: 'accounting',
    keywords: 'opening balance setup chart accounts coa',
    q: 'Do I need opening balances before I start?',
    a: 'For a new company mid-year or migrating from another system, post opening balances via the Opening balances wizard so trial balance and reports are correct from day one. Brand-new companies with no prior history can start posting transactions directly.',
  },
  {
    category: 'permissions',
    keywords: 'profile password security two factor',
    q: 'Where do I update my profile and password?',
    a: 'Open Profile from the header menu. Update name, email, phone, and timezone under Overview. Change your password under the Security tab. Profile settings apply to your login across all companies.',
  },
];

export const WORKSPACE_FAQS = [
  {
    category: 'sales',
    keywords: 'invoice post ledger accounting sales',
    q: 'How do I post an invoice to the general ledger?',
    a: 'Create the invoice with customer, line items, and taxes, then use Post (or Save & post). Posting creates the receivable and revenue journal entries. Draft invoices do not affect the ledger until posted.',
  },
  {
    category: 'sales',
    keywords: 'payment customer receive apply invoice',
    q: 'How do I record a customer payment?',
    a: 'Go to Sales → Payments (or receive payment from an invoice). Enter amount, date, and deposit account. Apply the payment to open invoices or leave as customer credit. Posted payments update bank and accounts receivable automatically.',
  },
  {
    category: 'purchases',
    keywords: 'bill vendor expense post accounts payable',
    q: 'How do vendor bills and expenses differ?',
    a: 'Bills are accounts-payable documents tied to a vendor—you receive goods/services now and pay later. Expenses are typically paid immediately (cash or card). Both can post to the ledger; bills support payment runs and aging reports.',
  },
  {
    category: 'accounting',
    keywords: 'journal entry manual debit credit',
    q: 'When should I use a manual journal entry?',
    a: 'Use journals for adjustments, accruals, depreciation, or corrections that are not created by sales, purchases, or banking modules. Each line must balance (debits = credits). Post only when you are sure of the accounts and amounts.',
  },
  {
    category: 'accounting',
    keywords: 'fiscal period lock close month end',
    q: 'What is a fiscal period and why is it locked?',
    a: 'Fiscal periods define accounting months or quarters. Locking a period prevents new or edited postings in that date range—protecting closed month-end balances. Unlock only with appropriate permission if a correction is required.',
  },
  {
    category: 'accounting',
    keywords: 'undo reverse posted cancel delete',
    q: 'Can I undo a posted transaction?',
    a: 'Most posted documents cannot be deleted; use void, cancel, or reversing entries depending on the module. Invoices may be cancelled if no payments applied; journal reversals create offsetting entries. Check module-specific rules before posting.',
  },
  {
    category: 'banking',
    keywords: 'bank deposit transfer reconciliation',
    q: 'How do deposits, transfers, and reconciliation work?',
    a: 'Record deposits and withdrawals against bank accounts linked in Banking. Transfers move funds between your own accounts. Reconciliation matches statement lines to posted transactions until the account is balanced for the period.',
  },
  {
    category: 'permissions',
    keywords: 'menu missing role permission access',
    q: "Why can't I see a menu item?",
    a: 'Modules and actions are controlled by your role. If Sales, Payroll, or Settings is missing, ask your company owner or admin to review role permissions. Super admins see all modules; limited roles see only assigned areas.',
  },
  {
    category: 'getting-started',
    keywords: 'bookmark shortcut search command palette',
    q: 'How can I work faster in the workspace?',
    a: 'Bookmark frequent pages from the header, use date filters on large lists, and press ⌘K / Ctrl+K to search. Export options appear on many data tables when you need spreadsheets for review.',
  },
  {
    category: 'purchases',
    keywords: 'purchase order po convert bill',
    q: 'Can I convert a purchase order to a bill?',
    a: 'Yes. Approved purchase orders can be converted to vendor bills, carrying line items and quantities. This keeps procurement aligned with payables and reduces duplicate data entry.',
  },
];

export const GUIDE_SECTIONS = {
  'getting-started': {
    label: 'Getting started',
    articles: [
      {
        title: 'First steps in a new workspace',
        keywords: 'setup configure welcome',
        body: 'Confirm company profile (currency, fiscal year, address). Review or customize the chart of accounts. Add taxes, payment terms, and at least one bank account. Invite team members with appropriate roles before posting live transactions.',
      },
      {
        title: 'Navigation overview',
        keywords: 'sidebar menu modules',
        body: 'The sidebar groups modules by function: Sales, Purchases, Banking, Accounting, Inventory, HR, and Reports. Section tabs under the header provide quick links within the current area. Breadcrumbs help you trace where you are in deep screens.',
      },
    ],
  },
  accounting: {
    label: 'Accounting',
    articles: [
      {
        title: 'Chart of accounts',
        keywords: 'coa account types',
        body: 'Accounts are organized by type (assets, liabilities, equity, income, expense). Use subtypes for reporting rollups. Inactive accounts remain in history but cannot receive new postings.',
      },
      {
        title: 'Month-end checklist',
        keywords: 'close period reconcile',
        body: 'Reconcile all bank accounts, review open receivables and payables, post accruals and depreciation, run trial balance and key reports, then lock the fiscal period when satisfied.',
      },
    ],
  },
  sales: {
    label: 'Sales & invoicing',
    articles: [
      {
        title: 'Invoice lifecycle',
        keywords: 'draft post send payment',
        body: 'Draft → Posted → Partially paid → Paid (or Cancelled). Credit notes reduce customer balance. Always verify tax and revenue accounts before posting high-volume invoices.',
      },
    ],
  },
  banking: {
    label: 'Banking',
    articles: [
      {
        title: 'Connecting bank activity',
        keywords: 'deposit withdrawal transfer',
        body: 'Each bank account in the system maps to a GL cash account. Record deposits and withdrawals with correct dates for accurate cash flow reporting. Use transfers—not journals—for moving money between your own accounts.',
      },
    ],
  },
};

export const SECTION_LABELS = Object.fromEntries(
  Object.entries(GUIDE_SECTIONS).map(([key, section]) => [key, section.label]),
);

export const QUICK_TOPICS = [
  {
    id: 'invoices',
    label: 'Invoicing',
    keywords: 'invoice sales post customer',
    description: 'Create, post, and collect on customer invoices.',
    category: 'sales',
  },
  {
    id: 'payments',
    label: 'Payments',
    keywords: 'payment receive apply bank',
    description: 'Record customer receipts and vendor payments.',
    category: 'banking',
  },
  {
    id: 'pos',
    label: 'POS',
    keywords: 'pos point of sale checkout receipt',
    description: 'Point of sale workflows, shifts, and receipts.',
    category: 'sales',
  },
  {
    id: 'reports',
    label: 'Reports',
    keywords: 'reports financial trial balance profit',
    description: 'Financial reports, exports, and report builder.',
    category: 'accounting',
  },
  {
    id: 'printing',
    label: 'Printing',
    keywords: 'print invoice pdf thermal receipt',
    description: 'Print layouts, PDF output, and thermal receipts.',
    category: 'sales',
  },
  {
    id: 'permissions',
    label: 'Roles & Permissions',
    keywords: 'role permission user invite access',
    description: 'Roles, invites, and module access control.',
    category: 'permissions',
  },
  {
    id: 'journals',
    label: 'Journals',
    keywords: 'journal entry adjustment debit credit',
    description: 'Manual entries for accruals and corrections.',
    category: 'accounting',
  },
];

export const POPULAR_SEARCHES = [
  { label: 'Create Invoice', query: 'create invoice post', topic: 'invoices' },
  { label: 'Customer Payment', query: 'customer payment receive', topic: 'payments' },
  { label: 'POS', query: 'pos sale checkout', topic: 'pos' },
  { label: 'Reports', query: 'reports trial balance', topic: 'reports' },
  { label: 'Printing', query: 'print invoice pdf', topic: 'printing' },
  { label: 'Roles & Permissions', query: 'roles permissions access', topic: 'permissions' },
];

/** Premium category cards for the Knowledge Center grid. */
export const KNOWLEDGE_CATEGORIES = [
  { id: 'sales', label: 'Invoicing', description: 'Create, post, print, and collect on sales.', faqCategory: 'sales', topic: 'invoices' },
  { id: 'banking', label: 'Payments', description: 'Customer receipts, vendor payments, and applications.', faqCategory: 'banking', topic: 'payments' },
  { id: 'purchases', label: 'Purchases', description: 'Vendor bills, POs, and expense workflows.', faqCategory: 'purchases', topic: null },
  { id: 'inventory', label: 'Inventory', description: 'Products, stock, warehouses, and adjustments.', faqCategory: 'accounting', topic: null },
  { id: 'accounting', label: 'Reports', description: 'Financial statements, exports, and analytics.', faqCategory: 'accounting', topic: 'reports' },
  { id: 'banking-module', label: 'Banking', description: 'Deposits, transfers, and reconciliation.', faqCategory: 'banking', topic: null },
  { id: 'tax', label: 'Tax', description: 'Tax rates, compliance, and document taxes.', faqCategory: 'accounting', topic: null },
  { id: 'permissions', label: 'Roles & Access', description: 'Users, roles, invites, and permissions.', faqCategory: 'permissions', topic: 'permissions' },
  { id: 'settings', label: 'Settings', description: 'Company profile, templates, and preferences.', faqCategory: 'getting-started', topic: null },
  { id: 'pos', label: 'POS', description: 'Checkout, shifts, holds, and receipt printing.', faqCategory: 'sales', topic: 'pos' },
];

export const GETTING_STARTED_ITEMS = [
  { id: 'tour', label: 'Workspace Tour', description: 'Guided walkthrough of navigation and modules.', action: 'tour' },
  { id: 'beginner', label: 'Beginner Guide', description: 'First steps in a new workspace.', query: 'first steps setup' },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', description: 'Speed up daily workflows.', action: 'shortcuts' },
  { id: 'first-invoice', label: 'First Invoice', description: 'Create and post your first invoice.', query: 'post invoice ledger', topic: 'invoices' },
  { id: 'first-customer', label: 'First Customer', description: 'Add customers and payment terms.', query: 'customer payment terms' },
  { id: 'first-payment', label: 'First Payment', description: 'Record a customer payment.', query: 'record customer payment', topic: 'payments' },
];

export const QUICK_ACTIONS = [
  { id: 'bug', label: 'Report a Bug', description: 'Tell us what broke and where.', href: '#help-support', external: false },
  { id: 'feature', label: 'Suggest a Feature', description: 'Share ideas for future releases.', href: '#help-support', external: false },
  { id: 'admin', label: 'Contact Administrator', description: 'Reach your company workspace admin.', href: '#help-support', external: false },
  { id: 'guide', label: 'Download User Guide', description: 'PDF overview of core modules.', href: '#help-guides', external: false },
  { id: 'releases', label: 'Release Notes', description: 'What changed in recent updates.', query: 'release updates new' },
  { id: 'status', label: 'System Status', description: 'Platform availability and incidents.', href: '#help-support', external: false },
];

export const KNOWLEDGE_SHORTCUTS = [
  { keys: ['Ctrl', 'K'], macKeys: ['⌘', 'K'], label: 'Global search' },
  { keys: ['F2'], label: 'Create invoice' },
  { keys: ['F4'], label: 'Customer search' },
  { keys: ['F6'], label: 'Complete POS sale' },
  { keys: ['Esc'], label: 'Close dialog' },
];

export function estimateReadMinutes(text = '') {
  const words = String(text).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function countCategoryArticles(categoryId, faqs = [], guideSections = {}) {
  const cat = KNOWLEDGE_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return 0;
  const faqCount = faqs.filter((f) => f.category === cat.faqCategory).length;
  const guideKey = cat.faqCategory === 'sales' ? 'sales' : cat.faqCategory;
  const guideCount = (guideSections[guideKey] || guideSections[cat.id] || []).length;
  return faqCount + guideCount;
}

export function getDefaultHelpContent(accountOwner) {
  return {
    section_labels: SECTION_LABELS,
    guide_sections: Object.fromEntries(
      Object.entries(GUIDE_SECTIONS).map(([key, section]) => [key, section.articles]),
    ),
    faqs: accountOwner ? ACCOUNT_OWNER_FAQS : WORKSPACE_FAQS,
  };
}
