import { computed, ref } from 'vue';
import type { GroupedSelectGroup } from '../components/ui/AppGroupedSelect.vue';
import { etiquetaTurnoFallback } from '../lib/turnos';
import { useOperacionModulos, type TurnoCatalogo } from './useOperacionModulos';

const NOMBRES_DIA: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

const ABREV_DIA_POR_CODIGO: Record<string, string> = {
  '1': 'Lu',
  '2': 'Ma',
  '3': 'Mi',
  '4': 'Ju',
  '5': 'Vi',
  '6': 'Sá',
  '7': 'Do',
  '99': '—',
};

export function abreviarDiaGrupo(code?: string) {
  if (!code) return '—';
  return ABREV_DIA_POR_CODIGO[code] || '—';
}

export function useTurnosCatalogo() {
  const { listarTurnos } = useOperacionModulos();
  const turnosCatalogo = ref<TurnoCatalogo[]>([]);
  const cargandoTurnos = ref(false);
  const errorTurnos = ref<string | null>(null);

  const turnosDisponibles = computed<TurnoCatalogo[]>(() =>
    turnosCatalogo.value.filter((turno) => turno.activo !== false),
  );

  const turnosAgrupados = computed(() => {
    if (!turnosCatalogo.value.length) {
      return [];
    }

    const mapa = new Map<number, TurnoCatalogo[]>();
    turnosCatalogo.value.forEach((turno) => {
      const dia = turno.dia_semana ?? 99;
      if (!mapa.has(dia)) {
        mapa.set(dia, []);
      }
      mapa.get(dia)!.push(turno);
    });

    return [...mapa.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([grupoDia, items]) => ({
        dia: grupoDia,
        etiqueta: turnosCatalogo.value.find((t) => t.dia_semana === grupoDia)?.dia_nombre
          || NOMBRES_DIA[grupoDia]
          || `Día ${grupoDia}`,
        turnos: [...items].sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0)),
      }));
  });

  const turnosOpcionesAgrupadas = computed<GroupedSelectGroup[]>(() => {
    if (turnosAgrupados.value.length) {
      return turnosAgrupados.value.map((grupo) => ({
        label: grupo.etiqueta,
        code: String(grupo.dia),
        items: grupo.turnos.map((turno) => ({
          value: turno.id,
          label: turno.nombre || turno.id,
        })),
      }));
    }

    return [{
      label: 'Turnos',
      items: turnosDisponibles.value.map((turno) => ({
        value: turno.id,
        label: turno.nombre || turno.id,
      })),
    }];
  });

  function turnosOpcionesConVacio(etiquetaVacio = 'Sin asignar'): GroupedSelectGroup[] {
    return [{
      label: '',
      items: [{ value: '', label: etiquetaVacio }],
    }, ...turnosOpcionesAgrupadas.value];
  }

  function etiquetaTurno(turnoId: string) {
    const delCatalogo = turnosCatalogo.value.find((t) => t.id === turnoId);
    if (delCatalogo?.nombre) {
      return delCatalogo.nombre;
    }
    return etiquetaTurnoFallback(turnoId);
  }

  async function cargarTurnos() {
    cargandoTurnos.value = true;
    errorTurnos.value = null;
    try {
      turnosCatalogo.value = await listarTurnos();
    } catch (err) {
      errorTurnos.value = err instanceof Error ? err.message : 'No se pudieron cargar los turnos.';
      turnosCatalogo.value = [];
    } finally {
      cargandoTurnos.value = false;
    }
  }

  return {
    turnosCatalogo,
    turnosDisponibles,
    turnosAgrupados,
    turnosOpcionesAgrupadas,
    turnosOpcionesConVacio,
    cargandoTurnos,
    errorTurnos,
    etiquetaTurno,
    cargarTurnos,
    abreviarDiaGrupo,
  };
}
