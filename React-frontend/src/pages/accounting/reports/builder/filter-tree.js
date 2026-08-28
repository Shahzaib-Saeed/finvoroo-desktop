let idCounter = 0;

export function nextFilterNodeId() {
  return `f${Date.now()}_${idCounter++}`;
}

function ensureNodeId(node) {
  if (!node || node.id) return node;
  return { ...node, id: nextFilterNodeId() };
}

/**
 * UI filter builder expects a root group node. Backend also accepts a bare
 * condition at the root — wrap those (and repair missing children) here.
 */
export function normalizeFilterTree(tree) {
  if (!tree || typeof tree !== 'object') return null;

  if (tree.type === 'condition') {
    return {
      id: tree.id || nextFilterNodeId(),
      type: 'group',
      operator: 'and',
      children: [ensureNodeId(tree)],
    };
  }

  if (tree.type === 'group') {
    const children = Array.isArray(tree.children) ? tree.children : [];
    return {
      ...ensureNodeId(tree),
      operator: tree.operator === 'or' ? 'or' : 'and',
      children: children.map((child) => {
        if (child?.type === 'group') {
          return normalizeFilterTree(child);
        }
        return ensureNodeId(child);
      }),
    };
  }

  return null;
}

export function countFilterConditions(node) {
  if (!node) return 0;
  if (node.type === 'condition') return 1;
  return (node.children || []).reduce((sum, child) => sum + countFilterConditions(child), 0);
}
