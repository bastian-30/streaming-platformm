export interface UpdateFields {
  [column: string]: unknown;
}

/** Construye una cláusula SET parametrizada a partir de los campos definidos. */
export function buildUpdate(fields: UpdateFields, startIndex = 1): { set: string; values: unknown[] } {
  const keys = Object.keys(fields).filter((key) => fields[key] !== undefined);
  const values: unknown[] = [];
  const assignments = keys.map((key) => {
    values.push(fields[key]);
    return `${key} = $${startIndex + values.length - 1}`;
  });
  return { set: assignments.join(', '), values };
}

export interface Viewer {
  id: string | null;
  role: string | null;
}

export const isAdminViewer = (viewer: Viewer | undefined): boolean => viewer?.role === 'admin';

/**
 * Visibilidad compartida por publicaciones, multimedia y transmisiones:
 * - administrador: ve todo
 * - usuario autenticado: ve lo público y lo suyo
 * - visitante: solo lo público
 */
export function visibilityCondition(
  viewer: Viewer | undefined,
  column: string,
  ownerColumn: string,
  conditions: string[],
  params: unknown[]
): void {
  if (isAdminViewer(viewer)) return;
  if (viewer?.id) {
    params.push(viewer.id);
    conditions.push(`(${column} = 'public' OR ${ownerColumn} = $${params.length})`);
  } else {
    conditions.push(`${column} = 'public'`);
  }
}
