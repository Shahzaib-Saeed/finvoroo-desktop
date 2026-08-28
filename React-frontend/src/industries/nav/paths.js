export function resolveMegaPath(path, companyId) {
  return path.replace(':id', String(companyId));
}
