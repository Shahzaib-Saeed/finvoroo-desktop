/**
 * Navigation paths for saved report definitions.
 * View and Edit are intentionally separate experiences.
 */

/** Read-only report viewer — default when opening a saved custom report. */
export function definitionViewerPath(definition, workspaceBase) {
  if (!definition?.id) return `${workspaceBase}/accounting/reports`;
  if (definition.source_type === 'custom' || definition.dataset_key) {
    return `${workspaceBase}/accounting/reports/view/${definition.id}`;
  }
  return `${workspaceBase}/accounting/reports/view/${definition.id}`;
}

/** Advanced builder — only for editing. */
export function definitionEditPath(definition, workspaceBase) {
  if (!definition?.id) return `${workspaceBase}/accounting/reports/builder?mode=advanced`;
  return `${workspaceBase}/accounting/reports/builder?definition_id=${definition.id}&mode=advanced`;
}

/** Default open path: viewer for custom, standard page for saved standard reports. */
export function definitionOpenPath(definition, workspaceBase, standardItemsByKey) {
  if (!definition?.id) {
    return `${workspaceBase}/accounting/reports`;
  }

  if (definition.source_type === 'custom' || definition.dataset_key) {
    return definitionViewerPath(definition, workspaceBase);
  }

  if (definition.standard_report_key && standardItemsByKey?.get(definition.standard_report_key)?.path) {
    return standardItemsByKey.get(definition.standard_report_key).path;
  }

  return definitionViewerPath(definition, workspaceBase);
}

export function recentViewPath(view, workspaceBase, standardItemsByKey) {
  if (view.favoritable_kind === 'standard') {
    return (
      standardItemsByKey?.get(view.standard_report_key)?.path ||
      `${workspaceBase}/accounting/reports`
    );
  }

  if (view.report_definition?.id) {
    return definitionOpenPath(view.report_definition, workspaceBase, standardItemsByKey);
  }

  return `${workspaceBase}/accounting/reports`;
}

export function recordViewPayload(definition) {
  if (!definition) return null;

  if (definition.source_type === 'custom' || definition.dataset_key) {
    return {
      favoritable_kind: 'definition',
      report_definition_id: definition.id,
    };
  }

  if (definition.standard_report_key) {
    return {
      favoritable_kind: 'standard',
      standard_report_key: definition.standard_report_key,
    };
  }

  return {
    favoritable_kind: 'definition',
    report_definition_id: definition.id,
  };
}

export function recentViewRecordPayload(view) {
  if (view.favoritable_kind === 'standard' && view.standard_report_key) {
    return {
      favoritable_kind: 'standard',
      standard_report_key: view.standard_report_key,
    };
  }

  if (view.report_definition) {
    return recordViewPayload(view.report_definition);
  }

  return null;
}
