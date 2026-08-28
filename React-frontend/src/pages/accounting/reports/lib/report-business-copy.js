/** Business-friendly labels — no backend changes, UI copy only. */

export const BUILDER_COPY = {
  datasetExplorerTitle: "Choose a data source",
  datasetSearchPlaceholder: "Search sales, customers, inventory…",
  fieldExplorerTitle: "Active display layout",
  fieldSearchPlaceholder: "Search available fields…",
  selectedFieldsTitle: "Active layout",
  filtersTab: "Filter",
  filtersTitle: "Only show…",
  filtersDescription:
    "Narrow your report to specific dates, customers, statuses, and more.",
  shapeTab: "Organize",
  sortTitle: "Sort rows",
  groupTitle: "Group rows",
  aggTitle: "Totals & summaries",
  calcTab: "Calculations",
  formatTab: "Display",
  setupTab: "Details",
  previewEmptyTitle: "Build your layout",
  previewEmptyDescription:
    "Add columns from the left panel, or drag fields into this preview to start.",
  previewDropHint: "Drop here to add to your report",
  previewNoRows: "No records match your filters",
  previewNoRowsHint: "Try widening the date range or removing a filter.",
  filterEmptyTitle: "No filters yet",
  filterEmptyDescription:
    "Choose a field on the left to start filtering your data.",
  sortEmptyTitle: "Using default order",
  sortEmptyDescription: "Add a sort field to control how rows are ordered.",
  groupEmptyTitle: "Showing every row",
  groupEmptyDescription:
    "Group by Customer to create a customer sales summary.",
};

export const WIZARD_STEPS = [
  {
    id: 1,
    label: "Topic",
    title: "What would you like to report on?",
    subtitle: "Choose the area of your business this report should cover.",
    nextLabel: "Next: Select Columns",
    infoBanner:
      "Select a core source below. Your chosen module determines available filters, metrics, and default column structures.",
  },
  {
    id: 2,
    label: "Fields",
    title: "Choose the information you want",
    subtitle: "Select the columns that matter most — you can add more later.",
    nextLabel: "Next: Add Filters",
    infoBanner:
      "Pick standard columns and your custom fields. Custom field values appear on invoice, bill, and ledger rows when available.",
  },
  {
    id: 3,
    label: "Filter",
    title: "Filter your data",
    subtitle: "Optional — narrow results by date, customer, status, and more.",
    nextLabel: "Next: Arrange Columns",
    infoBanner:
      "Filters are optional — skip this step if you want to see everything first.",
  },
  {
    id: 4,
    label: "Order",
    title: "Arrange your columns",
    subtitle: "Set the left-to-right order columns appear in your report.",
    nextLabel: "Next: Name & Save",
    infoBanner:
      "Drag the order with the arrows. The first column appears on the far left of your report.",
  },
  {
    id: 5,
    label: "Save",
    title: "Name & save your report",
    subtitle: "Finalize your custom report configuration.",
    nextLabel: "Generate Report",
    successTitle: "Report Configuration Ready",
    successMessage:
      "Give your report a name to save it to your Reports Hub.",
  },
];
