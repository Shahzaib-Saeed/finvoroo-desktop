import {
  APPROVER_PRESETS,
  MODULE_MAP,
  ROLE_OPTIONS,
  RULE_FIELDS,
  RULE_OPS,
  emptyForm,
  emptyStep,
} from './constants';

export function moduleMeta(module) {
  return MODULE_MAP[module] || {
    value: module,
    label: String(module || '').replaceAll('_', ' '),
    noun: String(module || 'Document').replaceAll('_', ' '),
    created: 'Document Created',
    posted: 'Document Posted',
  };
}

export function roleLabel(role) {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label || String(role || '').replaceAll('_', ' ');
}

export function stepApproverLabel(step) {
  if (step.assignee_type === 'owner') return 'Owner';
  const roles = step.roles || [];
  if (roles.length === 1) return roleLabel(roles[0]);
  if (roles.length > 1) return roles.map(roleLabel).join(' + ');
  return 'Approver';
}

export function modeLabel(mode) {
  if (mode === 'parallel_any') return 'Anyone can approve';
  if (mode === 'parallel_all') return 'Everyone must approve';
  return 'One after another';
}

export function ruleToEnglish(rule) {
  if (!rule || rule.field === 'always') return 'Always — for every document';
  const field = RULE_FIELDS.find((f) => f.value === rule.field)?.label || rule.field;
  const op = RULE_OPS.find((o) => o.value === rule.op)?.label || rule.op;
  const value = rule.value === '' || rule.value == null ? '…' : rule.value;
  return `${field} ${op} ${value}`;
}

export function formRulesSummary(form) {
  const rules = form.rules?.length ? form.rules : [{ field: 'always', op: 'eq', value: true }];
  if (rules.length === 1) return ruleToEnglish(rules[0]);
  return rules.map(ruleToEnglish).join(' AND ');
}

export function estimatedHours(form) {
  return (form.steps || []).reduce((sum, s) => sum + (Number(s.sla_hours) || 0), 0);
}

export function workflowFromApi(wf) {
  const rule = wf.rules?.[0];
  const conditions = Array.isArray(rule?.conditions) && rule.conditions.length
    ? rule.conditions
    : [{ field: 'always', op: 'eq', value: true }];
  const amountCond = conditions.find((c) => c.field === 'amount' && (c.op === 'gte' || c.op === 'gt'));

  return emptyForm({
    name: wf.name || '',
    description: wf.description || '',
    module: wf.module || 'invoice',
    priority: wf.priority ?? 100,
    is_active: !!wf.is_active,
    amount_min: amountCond?.value ?? '',
    rules: conditions,
    steps: (wf.steps || []).map((s) => {
      let payload = {};
      try {
        payload = typeof s.assignee_value === 'string' ? JSON.parse(s.assignee_value) : s.assignee_value || {};
      } catch {
        payload = { roles: [s.assignee_value].filter(Boolean) };
      }
      return emptyStep({
        id: `step_${s.id || Math.random().toString(36).slice(2, 9)}`,
        name: s.name,
        mode: s.mode || 'sequential',
        assignee_type: s.assignee_type || 'role',
        roles: payload.roles || ['manager'],
        min_amount: payload.min_amount ?? 0,
        sla_hours: s.sla_hours ?? '',
        expanded: false,
      });
    }),
  });
}

export function payloadFromForm(form) {
  let conditions = (form.rules || []).filter(Boolean);
  if (!conditions.length) {
    conditions = [{ field: 'always', op: 'eq', value: true }];
  }
  // Keep amount_min shortcut in sync if present in UI summary fields
  if (form.amount_min !== '' && form.amount_min != null && !conditions.some((c) => c.field === 'amount')) {
    conditions = [{ field: 'amount', op: 'gte', value: Number(form.amount_min) || 0 }];
  }

  return {
    name: form.name,
    description: form.description,
    module: form.module,
    document_type: form.module,
    priority: Number(form.priority) || 100,
    is_active: !!form.is_active,
    logic: 'and',
    conditions,
    steps: (form.steps || []).map((s, idx) => ({
      name: s.name,
      mode: s.mode,
      assignee_type: s.assignee_type,
      sort_order: idx + 1,
      sla_hours: s.sla_hours === '' || s.sla_hours == null ? null : Number(s.sla_hours),
      assignee_value: {
        roles: s.assignee_type === 'owner' ? ['owner', 'company_owner'] : s.roles || ['manager'],
        min_amount: Number(s.min_amount) || 0,
      },
    })),
  };
}

export function detectApproverPreset(step) {
  if (step.assignee_type === 'owner') return 'owner';
  const roles = [...(step.roles || [])].sort().join(',');
  const match = APPROVER_PRESETS.find(
    (p) => p.id !== 'role' && p.assignee_type === step.assignee_type && [...p.roles].sort().join(',') === roles,
  );
  return match?.id || 'role';
}

export function applyApproverPreset(step, presetId, customRole = 'manager') {
  const preset = APPROVER_PRESETS.find((p) => p.id === presetId) || APPROVER_PRESETS[1];
  if (preset.id === 'role') {
    return {
      ...step,
      assignee_type: 'role',
      roles: [customRole],
      name: step.name?.includes('Approval') ? step.name : `${roleLabel(customRole)} Approval`,
    };
  }
  return {
    ...step,
    assignee_type: preset.assignee_type,
    roles: preset.roles,
    name: step.name && !['Approval', 'Manager Approval'].includes(step.name)
      ? step.name
      : `${preset.label} Approval`,
  };
}
