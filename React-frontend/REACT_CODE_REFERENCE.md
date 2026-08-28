# React ERP Frontend — Code Reference

> **For AI assistants:** Read this file first before exploring the repo. It maps patterns, file locations, and conventions so you do not need to scan the whole tree for every task.

---

## 1. Project layout

| Path | Purpose |
|------|---------|
| `React-frontend/src/` | Main ERP app (workspace, accounting modules) |
| `React-frontend/_archive/store-inventory/` | UI reference templates (Metronic store-inventory demos), moved out of the top level during a repo cleanup — **copy patterns from here, do not wire into ERP routes** |
| `Laravel-api-backend/` | API (`/api/v1/...`) |
| `React-frontend/.env` | `VITE_API_BASE_URL` (default `/api/v1`) |

**Stack:** Vite, React 19, React Router, TanStack Table, Axios, Tailwind 4, Radix UI (`radix-ui` package), Sonner toasts, `@/` path alias → `src/`.

---

## 2. Routing & URLs

- Workspace routes: `/workspace/:id/accounting/...` where `:id` is company/workspace id (`useParams().id`).
- Menu + breadcrumbs: `@/config/menu.workspace` (`WORKSPACE_MENU`) + `src/lib/workspace-breadcrumb.js`.
- **Global chrome** (breadcrumb, search, company, mega menu): `src/layouts/workspace/components/workspace-header.jsx` — do **not** duplicate a second page toolbar unless explicitly requested.
- Page-level title: `src/components/ui/PageHeader.jsx`.

---

## 3. API layer

- Shared client: `src/lib/api.js` (Bearer token + `X-Company-ID` header).
- Per-module APIs: `src/pages/accounting/<module>/api/*.api.js`.
- Response shape: usually `{ data: { data: [...], meta: {...} } }` for lists; `{ data: { data: {...} } }` for show.

**Example — customers:**

```
src/pages/accounting/customers/api/customers.api.js
Laravel-api-backend/app/Http/Controllers/Api/V1/Workspace/CustomerController.php
```

---

## 4. UI building blocks

| Component | File | Use for |
|-----------|------|---------|
| `Sheet` (offcanvas) | `src/components/ui/sheet.jsx` | Side panels, customer details |
| `Dialog` | `src/components/ui/dialog.jsx` | Modals, pickers |
| `DataGrid` + table | `src/components/ui/data-grid*.jsx` | Lists with sort/pagination |
| `Card` + `CardTable` | `src/components/ui/card.jsx` | List page wrapper |
| `PageHeader` | `src/components/ui/PageHeader.jsx` | Title + subtitle + actions |
| `ConfirmDialog` | `src/components/ui/ConfirmDialog.jsx` | Destructive confirms |
| `ScrollArea` | `src/components/ui/scroll-area.jsx` | Long sheet bodies |
| `Tabs` | `src/components/ui/tabs.jsx` | Detail panel sections |

**Buttons:** Primary black actions use `variant="mono"`. Destructive uses `variant="destructive"`.

---

## 5. List page pattern (store-inventory style)

Reference implementation: `src/pages/accounting/customers/index.jsx`, `src/pages/accounting/products/components/ProductListSection.jsx`.

1. `PageHeader` with actions (e.g. New … `variant="mono"`).
2. `Card` → `CardHeader` / `CardToolbar` (search, filters) → `DataGrid` → `DataGridTable` → `DataGridPagination`.
3. Row select: `DataGridTableRowSelect` / `DataGridTableRowSelectAll`; `getRowId: (row) => String(row.id)`.
4. Bulk bar when `selectedCount > 0` (delete, activate/deactivate).
5. Module API `bulk({ ids, action })` where backend supports it.

---

## 6. Offcanvas (Sheet) pattern — **important**

### Reference UI

- ERP: `src/pages/accounting/customers/components/CustomerDetailsSheet.jsx` + `CustomerDetailsPanel.jsx`
- Template: `_archive/store-inventory/pages/components/customer-details-sheet.jsx`

### How to implement

1. List page state: `detailsOpen`, `detailsCustomerId` (or entity id).
2. Open from row: `openDetails(row) => { setId(row.id); setOpen(true); }` — **do not navigate to a full page** unless deep-linking is required.
3. Render at bottom of list page:

```jsx
<CustomerDetailsSheet
  open={detailsOpen}
  onOpenChange={(open) => { setDetailsOpen(open); if (!open) setDetailsCustomerId(null); }}
  customerId={detailsCustomerId}
  workspaceId={workspaceId}
  onEdit={handleEditFromSheet}
  onListRefresh={fetchList}
/>
```

4. Sheet wraps **panel** only; panel holds tabs + API calls.
5. **Mount panel only when open:** `{open && id ? <Panel /> : null}` inside `SheetBody` (see `CustomerDetailsSheet.jsx`).

### Performance rules (offcanvas felt “slow”)

| Do | Don't |
|----|--------|
| Use default sheet overlay (no blur) | `backdrop-filter: blur()` on overlay (very expensive while animating) |
| Keep open animation ~200ms | 400ms+ slide + blur together |
| Load `show(id)` first, show header quickly | `Promise.all` of 6 list endpoints before showing anything |
| Lazy-load tab data when tab is selected | Fetch all invoices/orders/quotations on every open |
| `overlayBlur={true}` only if design insists | Blur by default |

Sheet tuning lives in `src/components/ui/sheet.jsx` (`overlayBlur`, `duration-200`, `transform-gpu`, blur off by default).

### Deep links (optional)

`customers/show.jsx` — thin route that renders `<CustomerDetailsSheet open />` and `navigate` back to list on close. Prefer offcanvas on list for normal UX.

---

## 7. Form offcanvas providers (create/edit without new page)

| Entity | Provider / hook | Form component | API |
|--------|-----------------|----------------|-----|
| Customer | `useCustomerDialog()` — `customer-dialog-provider.jsx` | `CustomerForm` `variant="sheet"` | `customers.api.js` |
| Product | `useProductDialog()` — `product-dialog-provider.jsx` | `ProductForm` `variant="sheet"` | `products.api.js` |

- Product create flow: **type picker sheet** (`ProductTypePickerDialog` — uses `Sheet`) → **product form sheet**.
- Hooks keep `openCreate` / `openEdit` names; UI is offcanvas, not centered dialog.
- Pattern: close detail sheet → `openEdit(entity, { onSuccess: refreshList })`.

---

## 8. Module file map (accounting)

### Customers

| File | Role |
|------|------|
| `pages/accounting/customers/index.jsx` | List + bulk + opens sheet |
| `pages/accounting/customers/show.jsx` | Deep-link sheet only |
| `pages/accounting/customers/components/CustomerDetailsSheet.jsx` | Offcanvas shell |
| `pages/accounting/customers/components/CustomerDetailsPanel.jsx` | Tabs + lazy API |
| `pages/accounting/customers/api/customers.api.js` | HTTP client |

### Products

| File | Role |
|------|------|
| `pages/accounting/products/index.jsx` | Tabs: All / Units / Categories / Brands |
| `pages/accounting/products/components/ProductListSection.jsx` | Product grid |
| `pages/accounting/products/components/MasterDataGrid.jsx` | Units/categories/brands tables |
| `components/workspace/product/api/products.api.js` | Products + bulk master data |

### Invoices

| File | Role |
|------|------|
| `pages/accounting/invoices/show.jsx` | Document view |
| `pages/accounting/invoices/components/InvoiceDocument.jsx` | Print-style layout |
| `pages/accounting/invoices/components/InvoiceAppearancePanel.jsx` | Print/PDF toggles |
| `pages/accounting/invoices/components/InvoiceLinesGrid.jsx` | Shared line grid (mobile cards + desktop table) |
| `pages/accounting/invoices/invoice-print-display.js` | Display flags helper |

### Forms with line items

Reuse `InvoiceLinesGrid` on: invoices, bills, quotations, sales orders, purchase orders (create/edit).

---

## 9. Workspace layout

| File | Role |
|------|------|
| `layouts/workspace/components/workspace-header.jsx` | Top bar: breadcrumb, search, actions |
| `layouts/workspace/components/workspace-breadcrumb.jsx` | Breadcrumb UI |
| `layouts/workspace/components/workspace-sidebar.jsx` | Side nav from `WORKSPACE_MENU` |
| `layouts/workspace/components/workspace-mega-menu.jsx` | **Click-only** popover (not hover) |
| `layouts/workspace/components/workspace-search.jsx` | Global search |
| `config/workspace-mega-menu.js` | Mega menu config |

---

## 10. Backend pairing

When adding frontend list/detail/bulk:

1. Route in `Laravel-api-backend/routes/api_v1.php` (workspace group).
2. Controller under `app/Http/Controllers/Api/V1/Workspace/`.
3. Resource under `app/Http/Resources/Api/V1/Workspace/`.

Customer show includes invoice totals (for sheet overview stats) — see `CustomerController::show`.

---

## 11. Coding conventions

- **Minimal diff** — only touch files needed for the task.
- **Match existing naming** — `*Page`, `*Sheet`, `*Panel`, `*.api.js`.
- **Toasts** — `sonner`: `toast.success` / `toast.error` with API message fallback.
- **Money** — module `constants.js` `formatMoney` where present.
- **Imports** — `@/components/...`, `@/lib/...`, relative for same-module files.
- **Store-inventory** — use as visual/UX reference; implement in `src/pages/accounting/...`.

---

## 12. Quick tasks cheat sheet

| Task | Go to |
|------|--------|
| Slow offcanvas | `sheet.jsx` + lazy-load in detail `*Panel.jsx` |
| New list page | Copy `customers/index.jsx` or `ProductListSection.jsx` |
| New offcanvas detail | Copy `CustomerDetailsSheet` + `CustomerDetailsPanel` |
| Bulk actions | API `bulk` + list selection + `ConfirmDialog` |
| Breadcrumb wrong | `menu.workspace` + `workspace-breadcrumb.js` |
| Invoice PDF/print toggles | `InvoiceAppearancePanel` + `updatePrintDisplay` API |
| Product type picker | `ProductTypePickerDialog.jsx` |

---

## 13. Maintenance

Update this document when you:

- Add a new accounting module or standard pattern
- Change sheet/dialog/list conventions
- Add global layout or API conventions

Last updated: customer sheet performance (blur off, lazy tabs, staged load) + this reference file created.
