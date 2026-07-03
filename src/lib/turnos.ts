/**
 * Utilidades de turnos (fallback de etiquetas y lógica de días).
 * El catálogo oficial viene de GET /api/turnos vía useTurnosCatalogo.
 */

export interface TurnoOption {
  value: string;
  label: string;
}

/** @deprecated Usar useTurnosCatalogo — solo se conserva para etiquetaTurnoFallback en IDs legados */
export const TURNOS_DEFAULT: TurnoOption[] = [
  { value: 'mixto_1', label: 'Mixto 1' },
  { value: 'mixto_2', label: 'Mixto 2' },
  { value: 'sab_3', label: 'Sábado 3er' },
  { value: 'dom_1', label: 'Domingo 1er' },
  { value: 'dom_2', label: 'Domingo 2do' },
  { value: 'dom_3', label: 'Domingo 3er' },
];

export const TURNOS_LABEL: Record<string, string> = TURNOS_DEFAULT.reduce<Record<string, string>>((acc, turno) => {
  acc[turno.value] = turno.label;
  return acc;
}, {});

/** Número de día ISO (1=lun … 7=dom) por prefijo de turno. */
const DIA_POR_PREFIJO_TURNO: Record<string, number> = {
  lun: 1,
  mar: 2,
  mie: 3,
  jue: 4,
  vie: 5,
  sab: 6,
  dom: 7,
};

const NOMBRE_DIA_POR_NUMERO: Record<number, string> = {
  1: 'lunes',
  2: 'martes',
  3: 'miércoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sábado',
  7: 'domingo',
};

/** Días de operación (1–7) para un ID de turno de plantilla. */
export function diasOperacionPorTurno(turnoId: string): number[] {
  const turno = turnoId.trim().toLowerCase();
  if (!turno) {
    return [];
  }

  const prefijo = turno.split('_')[0] || '';
  if (DIA_POR_PREFIJO_TURNO[prefijo]) {
    return [DIA_POR_PREFIJO_TURNO[prefijo]];
  }

  if (turno.startsWith('mixto')) {
    return [1, 2, 3, 4, 5];
  }
  if (turno.startsWith('sab')) {
    return [6];
  }
  if (turno.startsWith('dom')) {
    return [7];
  }

  return [];
}

/** Indica si dos turnos comparten al menos un día de la semana. */
export function turnosCompartenDia(turnoA: string, turnoB: string): boolean {
  const diasB = new Set(diasOperacionPorTurno(turnoB));
  return diasOperacionPorTurno(turnoA).some((dia) => diasB.has(dia));
}

export function nombreDiaOperacion(diaNumero: number): string {
  return NOMBRE_DIA_POR_NUMERO[diaNumero] || `día ${diaNumero}`;
}

const PREFIJOS_DIA_ETIQUETA: Record<string, string> = {
  lun: 'Lunes',
  mar: 'Martes',
  mie: 'Miércoles',
  jue: 'Jueves',
  vie: 'Viernes',
  sab: 'Sábado',
  dom: 'Domingo',
};

const TIPOS_ETIQUETA: Record<string, string> = {
  '1er': '1er Turno',
  '2do': '2do Turno',
  mixto: 'Mixto',
  '3er': '3er Turno',
};

/** Etiqueta legible a partir del ID de plantilla (lun_1er, mar_mixto, etc.). */
export function etiquetaTurnoFallback(turnoId: string): string {
  if (TURNOS_LABEL[turnoId]) {
    return TURNOS_LABEL[turnoId];
  }

  const partes = turnoId.toLowerCase().split('_');
  const prefijo = partes[0] || '';
  const tipo = partes.slice(1).join('_');
  const dia = prefijo ? PREFIJOS_DIA_ETIQUETA[prefijo] : undefined;
  const tipoLabel = tipo ? TIPOS_ETIQUETA[tipo] : undefined;

  if (dia && tipoLabel) {
    return `${dia} · ${tipoLabel}`;
  }

  return turnoId;
}
