<template>
  <div :class="esAdmin || esJefe ? 'admin-layout' : ''">
    <AdminSidebar v-if="esAdmin" />
    <JefeSidebar v-else-if="esJefe" />

    <main class="page" :class="{ 'with-sidebar': esAdmin || esJefe }">
      <header class="page-header">
        <div>
          <h2>Programación semanal</h2>
          <p v-if="esJefe">Asigna empleados a rutas, turnos y asientos de tu equipo.</p>
          <p v-else>Asigna empleados a rutas, turnos y asientos. Los cambios se reflejan automáticamente en Abordajes y Métricas.</p>
        </div>
        <div class="quick-nav">
          <AppInfoButton title="Programación Semanal">
            <p>Módulo para asignar empleados a rutas y turnos por semana completa.</p>
            <ul>
              <li><strong>Semana, turno y ruta:</strong> elígelos una sola vez arriba; la parrilla y la asignación usan esa selección.</li>
              <li><strong>Asignación:</strong> busca al empleado, elige un asiento libre y confirma.</li>
              <li><strong>Sincronización:</strong> al guardar o eliminar, la operación diaria se actualiza automáticamente.</li>
            </ul>
          </AppInfoButton>
        </div>
      </header>

      <section class="card filtros">
        <label>
          Semana
          <AppWeekPicker v-model="semana" />
        </label>
        <label class="filtro-dropdown">
          Turno
          <AppGroupedSelect
            v-model="turnoSeleccionado"
            :groups="turnosOpcionesAgrupadas"
            placeholder="Seleccione un turno..."
          >
            <template #optiongroup="{ option }">
              <div class="dia-grupo">
                <span class="dia-grupo__badge">{{ abreviarDiaGrupo(option.code) }}</span>
                <span>{{ option.label }}</span>
              </div>
            </template>
          </AppGroupedSelect>
        </label>
        <label class="filtro-dropdown">
          Ruta
          <AppGroupedSelect
            v-model="rutaSeleccionadaId"
            :options="rutasOpciones"
            placeholder="Seleccione una ruta..."
          />
        </label>
        <span v-if="cargando" class="filtros-estado">Actualizando...</span>
      </section>

      <p v-if="mensaje" class="status ok">{{ mensaje }}</p>
      <p v-if="error" class="status error">{{ error }}</p>

      <section class="asignador">
        <div class="card parrilla-card">
          <BusSeatGrid
            :capacidad="capacidadRuta"
            :ocupados="asientosOcupados"
            :seleccionado="form.asiento"
            :titulo="`Interior: ${rutaSeleccionada?.zona || rutaSeleccionada?.nombre || 'Selecciona una ruta'}`"
            @seleccionar="seleccionarAsiento"
            @seleccionar-ocupado="avisarOcupado"
          />
        </div>

        <div class="card panel-asignacion">
          <h3>Nueva asignación</h3>
          <p class="contexto-seleccion">{{ contextoSeleccion }}</p>
          <p class="hint">{{ avisoCapacidad }}</p>

          <label class="field">
            Empleado
            <AppAutocomplete
              v-model="form.id_empleado"
              mode="select"
              :options="opcionesEmpleados"
              placeholder="Buscar empleado por id o nombre..."
            />
          </label>

          <p v-if="conflictoAsignacionEmpleado" class="ui-alert-inline warning">
            Este empleado ya tiene turno el {{ conflictoAsignacionEmpleado.diaNombre }}
            ({{ conflictoAsignacionEmpleado.asignacion.turno_nombre || conflictoAsignacionEmpleado.asignacion.turno_id }}
            en {{ conflictoAsignacionEmpleado.asignacion.ruta_nombre || `Ruta ${conflictoAsignacionEmpleado.asignacion.ruta_numero}` }}).
            Elimínalo en la tabla inferior o elige otro día.
          </p>

          <p class="hint asiento-hint" v-if="form.asiento">
            Asiento seleccionado: <strong>{{ form.asiento }}</strong>
          </p>
          <p class="hint asiento-hint" v-else-if="capacidadRuta > 0">
            Toca un asiento libre en la parrilla.
          </p>

          <button
            class="btn btn-primary btn-block"
            :disabled="!puedeConfirmar || guardando"
            @click="guardarAsignacion"
          >
            {{ guardando ? 'Guardando...' : 'Confirmar asignación' }}
          </button>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <h3>Asignaciones de la semana ({{ asignacionesFiltradas.length }}{{ filtroTabla ? ` / ${asignaciones.length}` : '' }})</h3>
          <div class="tabla-filtro">
            <AppAutocomplete
              v-model="filtroTabla"
              variant="toolbar"
              mode="filter"
              :options="opcionesFiltroTabla"
              placeholder="Buscar empleado o ruta..."
            />
          </div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Ruta</th>
                <th>Turno</th>
                <th>Asiento</th>
                <th>Parada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in asignacionesFiltradas" :key="item.id">
                <td>{{ item.id_empleado }} — {{ item.empleado_nombre }}</td>
                <td>{{ item.ruta_nombre || `Ruta ${item.ruta_numero ?? 'N/D'}` }}</td>
                <td>{{ item.turno_nombre || item.turno_id || '—' }}</td>
                <td>{{ item.asiento ?? '—' }}</td>
                <td>{{ item.parada?.nombre || '—' }}</td>
                <td>
                  <button
                    class="btn btn-danger"
                    :disabled="eliminandoId === item.id"
                    @click="eliminar(item.id)"
                  >
                    {{ eliminandoId === item.id ? 'Eliminando...' : 'Eliminar' }}
                  </button>
                </td>
              </tr>
              <tr v-if="!asignacionesFiltradas.length">
                <td colspan="6" class="muted center">Sin asignaciones registradas para la semana seleccionada.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <h3>Empleados sin asignar ({{ sinAsignar.length }})</h3>
        <ul class="list" v-if="sinAsignar.length">
          <li v-for="item in sinAsignar" :key="item.uid">
            <strong>{{ item.id_empleado }}</strong> — {{ item.nombre || 'Sin nombre' }}
          </li>
        </ul>
        <p v-else class="muted">Todos los empleados activos ya tienen al menos un turno asignado para esta semana.</p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AppWeekPicker from '../components/ui/AppWeekPicker.vue';
import AdminSidebar from '../components/layout/AdminSidebar.vue';
import JefeSidebar from '../components/layout/JefeSidebar.vue';
import AppInfoButton from '../components/ui/AppInfoButton.vue';
import BusSeatGrid, { type OcupanteAsiento } from '../components/BusSeatGrid.vue';
import AppAutocomplete, { type AutocompleteOption } from '../components/ui/AppAutocomplete.vue';
import AppGroupedSelect, {
  type GroupedSelectOption,
} from '../components/ui/AppGroupedSelect.vue';
import { coincideBusqueda } from '../utils/busqueda';
import {
  diasOperacionPorTurno,
  nombreDiaOperacion,
  turnosCompartenDia,
} from '../lib/turnos';
import { useAuth } from '../composables/useAuth';
import { useTurnosCatalogo } from '../composables/useTurnosCatalogo';
import {
  useOperacionModulos,
  type ProgramacionSemanalItem,
  type EmpleadoSinAsignar,
  type TurnoCatalogo,
} from '../composables/useOperacionModulos';
import { useDialog } from '../composables/useDialog';

interface RutaSemanal {
  id: string;
  ruta: number;
  zona?: string | null;
  nombre?: string | null;
  turnos: string[];
  unidad_por_turno: Record<string, { tipo?: string | null; codigo?: string | null; capacidad?: number | null; vehiculo_id?: string | null }>;
}

interface EmpleadoOption {
  id_empleado: string;
  nombre: string;
  email: string;
}

const { obtenerRol, authHeaders } = useAuth();
const { dialogConfirm } = useDialog();
const esAdmin = obtenerRol() === 'ADMIN';
const esJefe = obtenerRol() === 'JEFE';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const {
  listarProgramacionSemanal,
  crearProgramacionSemanal,
  eliminarProgramacionSemanal,
  listarEmpleadosSinAsignar,
  materializarSemana,
} = useOperacionModulos();

const {
  turnosCatalogo,
  turnosOpcionesAgrupadas: turnosOpcionesCatalogo,
  cargarTurnos,
  abreviarDiaGrupo,
} = useTurnosCatalogo();

function semanaInputActual() {
  const fecha = new Date();
  const inicioAnio = new Date(Date.UTC(fecha.getUTCFullYear(), 0, 1));
  const dias = Math.floor((Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()) - inicioAnio.getTime()) / 86400000);
  const semana = Math.ceil((dias + inicioAnio.getUTCDay() + 1) / 7);
  return `${fecha.getUTCFullYear()}-W${String(semana).padStart(2, '0')}`;
}

function aSemanaIso(weekInput: string) {
  if (!weekInput) return '';
  const [anio, semanaTxt] = weekInput.split('-W');
  return `${anio}-W${Number(semanaTxt)}`;
}

const semana = ref(semanaInputActual());
const cargando = ref(false);
const guardando = ref(false);
const eliminandoId = ref<string | null>(null);
const error = ref('');
const mensaje = ref('');
const filtroTabla = ref('');

const asignaciones = ref<ProgramacionSemanalItem[]>([]);
const sinAsignar = ref<EmpleadoSinAsignar[]>([]);
const rutas = ref<RutaSemanal[]>([]);
const empleados = ref<EmpleadoOption[]>([]);

const turnoSeleccionado = ref<string>('');
const rutaSeleccionadaId = ref<string>('');

const form = ref({
  id_empleado: '',
  asiento: null as number | null,
});

const turnosDisponibles = computed<TurnoCatalogo[]>(() => {
  if (turnosCatalogo.value.length) {
    return turnosCatalogo.value;
  }
  // Fallback: turnos derivados de las rutas si el catálogo falla al cargar.
  const ids = new Set<string>();
  rutas.value.forEach((r) => r.turnos.forEach((t) => ids.add(t)));
  return Array.from(ids).map((id) => ({ id, nombre: id }));
});

const turnosOpcionesAgrupadas = computed(() => {
  if (turnosCatalogo.value.length) {
    return turnosOpcionesCatalogo.value;
  }
  return [{
    label: 'Turnos',
    items: turnosDisponibles.value.map((turno) => ({
      value: turno.id,
      label: turno.nombre || turno.id,
    })),
  }];
});

const rutasParaTurno = computed<RutaSemanal[]>(() => {
  const conTurno = rutas.value.filter((r) => r.turnos.includes(turnoSeleccionado.value));
  return conTurno.length ? conTurno : rutas.value;
});

const rutasOpciones = computed<GroupedSelectOption[]>(() =>
  rutasParaTurno.value.map((ruta) => ({
    value: ruta.id,
    label: `Ruta ${ruta.ruta} — ${ruta.zona || ruta.nombre || 'Sin nombre'}`,
  })),
);

const rutaSeleccionada = computed<RutaSemanal | null>(() =>
  rutas.value.find((r) => r.id === rutaSeleccionadaId.value) || null,
);

const capacidadRuta = computed(() => {
  const unidad = rutaSeleccionada.value?.unidad_por_turno?.[turnoSeleccionado.value];
  return Number(unidad?.capacidad) || 0;
});

const contextoSeleccion = computed(() => {
  const partes = [`Semana ${aSemanaIso(semana.value)}`];
  const turno = turnosDisponibles.value.find((t) => t.id === turnoSeleccionado.value);
  if (turno) {
    const dia = turno.dia_nombre ? `${turno.dia_nombre} · ` : '';
    partes.push(`${dia}${turno.nombre || turno.id}`);
  }
  if (rutaSeleccionada.value) {
    const zona = rutaSeleccionada.value.zona || rutaSeleccionada.value.nombre || '';
    partes.push(`Ruta ${rutaSeleccionada.value.ruta}${zona ? ` (${zona})` : ''}`);
  }
  return partes.join(' · ');
});

const avisoCapacidad = computed(() => {
  if (!rutaSeleccionada.value) return 'Selecciona turno y ruta arriba.';
  if (capacidadRuta.value <= 0) {
    return 'Esta ruta no tiene unidad para este turno. Configúrala en Gestión de rutas → Catálogo.';
  }
  const libres = capacidadRuta.value - Object.keys(asientosOcupados.value).length;
  const unidad = rutaSeleccionada.value.unidad_por_turno[turnoSeleccionado.value];
  return `${unidad?.codigo || unidad?.tipo || 'Unidad'} · ${libres} asiento(s) libre(s)`;
});

const asignacionesRutaTurno = computed(() =>
  asignaciones.value.filter(
    (a) => a.ruta_id === rutaSeleccionadaId.value && (a.turno_id || '') === turnoSeleccionado.value,
  ),
);

const asientosOcupados = computed<Record<number, OcupanteAsiento>>(() => {
  const mapa: Record<number, OcupanteAsiento> = {};
  asignacionesRutaTurno.value.forEach((a) => {
    if (a.asiento && Number.isInteger(a.asiento)) {
      mapa[a.asiento] = { id_empleado: a.id_empleado, nombre: a.empleado_nombre };
    }
  });
  return mapa;
});

const conflictoAsignacionEmpleado = computed(() => {
  if (!form.value.id_empleado || !turnoSeleccionado.value) {
    return null;
  }

  const turnoActual = turnoSeleccionado.value;
  const conflicto = asignaciones.value.find((asignacion) => {
    if (asignacion.id_empleado !== form.value.id_empleado) {
      return false;
    }
    const turnoExistente = asignacion.turno_id || '';
    if (turnoExistente === turnoActual) {
      return false;
    }
    return turnosCompartenDia(turnoExistente, turnoActual);
  });

  if (!conflicto) {
    return null;
  }

  const diasComun = diasOperacionPorTurno(conflicto.turno_id || '').filter((dia) =>
    diasOperacionPorTurno(turnoActual).includes(dia),
  );

  return {
    asignacion: conflicto,
    diaNombre: nombreDiaOperacion(diasComun[0] || 0),
  };
});

const opcionesEmpleados = computed<AutocompleteOption[]>(() =>
  empleados.value.map((e) => ({
    value: e.id_empleado,
    label: `${e.id_empleado} — ${e.nombre}`,
    hint: e.email,
    keywords: `${e.id_empleado} ${e.nombre} ${e.email}`,
  })),
);

const opcionesFiltroTabla = computed<AutocompleteOption[]>(() => {
  const opciones: AutocompleteOption[] = [];
  const empleadosVistos = new Set<string>();
  const rutasVistas = new Set<string>();

  asignaciones.value.forEach((a) => {
    if (!empleadosVistos.has(a.id_empleado)) {
      empleadosVistos.add(a.id_empleado);
      opciones.push({
        value: a.id_empleado,
        label: `${a.id_empleado} — ${a.empleado_nombre}`,
        hint: a.ruta_nombre || undefined,
        keywords: `${a.id_empleado} ${a.empleado_nombre}`,
      });
    }

    const rutaLabel = a.ruta_nombre || `Ruta ${a.ruta_numero ?? 'N/D'}`;
    if (a.ruta_id && !rutasVistas.has(a.ruta_id)) {
      rutasVistas.add(a.ruta_id);
      opciones.push({
        value: a.ruta_id,
        label: rutaLabel,
        hint: 'Ruta',
        keywords: `${rutaLabel} ruta ${a.ruta_numero ?? ''}`,
      });
    }
  });

  return opciones.sort((a, b) => a.label.localeCompare(b.label, 'es'));
});

const asignacionesFiltradas = computed(() => {
  const termino = filtroTabla.value;
  if (!termino.trim()) return asignaciones.value;
  return asignaciones.value.filter((a) =>
    coincideBusqueda(
      termino,
      a.id_empleado,
      a.empleado_nombre,
      a.ruta_nombre,
      String(a.ruta_numero ?? ''),
      a.turno_nombre,
      a.turno_id,
    ),
  );
});

const puedeConfirmar = computed(() =>
  Boolean(form.value.id_empleado)
  && Boolean(rutaSeleccionadaId.value)
  && Boolean(turnoSeleccionado.value)
  && form.value.asiento !== null
  && capacidadRuta.value > 0
  && !conflictoAsignacionEmpleado.value,
);

function seleccionarAsiento(asiento: number) {
  form.value.asiento = asiento;
}

function avisarOcupado(_asiento: number, ocupante: OcupanteAsiento) {
  mensaje.value = '';
  error.value = `El asiento está ocupado por ${ocupante.nombre || ocupante.id_empleado}.`;
}

async function cargarRutas() {
  const headers = await authHeaders();
  const respuesta = await fetch(`${API_BASE_URL}/api/rutas`, { headers });
  const json = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || json?.success === false) {
    throw new Error(json?.message || 'No se pudieron cargar rutas.');
  }
  const data = Array.isArray(json?.data) ? json.data : [];
  rutas.value = data.map((ruta: Record<string, unknown>) => ({
    id: String(ruta.id || ''),
    ruta: Number(ruta.ruta || 0),
    zona: ruta.zona ? String(ruta.zona) : null,
    nombre: ruta.nombre ? String(ruta.nombre) : null,
    turnos: Array.isArray(ruta.turnos) ? (ruta.turnos as string[]) : [],
    unidad_por_turno: (ruta.unidad_por_turno && typeof ruta.unidad_por_turno === 'object'
      ? ruta.unidad_por_turno
      : {}) as RutaSemanal['unidad_por_turno'],
  }));
}

async function cargarEmpleados() {
  const headers = await authHeaders();
  const respuesta = await fetch(`${API_BASE_URL}/api/empleados`, { headers });
  const json = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || json?.success === false) {
    throw new Error(json?.message || 'No se pudieron cargar empleados.');
  }
  const data = Array.isArray(json?.data) ? json.data : [];
  empleados.value = data
    .filter((e: Record<string, unknown>) => e.activo !== false)
    .map((e: Record<string, unknown>) => ({
      id_empleado: String(e.id_empleado || `EMP-${String(e.uid || '').slice(-6).toUpperCase()}`),
      nombre: String(e.nombre || 'Sin nombre'),
      email: String(e.email || ''),
    }))
    .sort((a: EmpleadoOption, b: EmpleadoOption) => a.nombre.localeCompare(b.nombre, 'es'));
}

function asegurarSeleccionValida() {
  if (!turnoSeleccionado.value && turnosDisponibles.value.length) {
    turnoSeleccionado.value = turnosDisponibles.value[0]?.id || '';
  }
  const rutasValidas = rutasParaTurno.value;
  if (!rutasValidas.some((r) => r.id === rutaSeleccionadaId.value)) {
    rutaSeleccionadaId.value = rutasValidas[0]?.id || '';
  }
}

async function cargarDatos() {
  cargando.value = true;
  error.value = '';
  mensaje.value = '';

  try {
    const semanaIso = aSemanaIso(semana.value);
    const [asignacionSemana, empleadosSin] = await Promise.all([
      listarProgramacionSemanal(semanaIso),
      listarEmpleadosSinAsignar(semanaIso),
    ]);

    asignaciones.value = asignacionSemana;
    sinAsignar.value = empleadosSin;
    asegurarSeleccionValida();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar la programación semanal.';
  } finally {
    cargando.value = false;
  }
}

async function sincronizarOperacionDiaria() {
  try {
    await materializarSemana(aSemanaIso(semana.value));
  } catch {
    // La asignación semanal ya quedó guardada; la sync diaria puede reintentarse al actualizar.
  }
}

async function guardarAsignacion() {
  if (!puedeConfirmar.value) {
    error.value = 'Selecciona empleado, ruta con unidad y un asiento libre.';
    return;
  }

  guardando.value = true;
  error.value = '';
  mensaje.value = '';

  try {
    await crearProgramacionSemanal({
      semana: aSemanaIso(semana.value),
      id_empleado: form.value.id_empleado,
      ruta_id: rutaSeleccionadaId.value,
      turno_id: turnoSeleccionado.value || null,
      asiento: form.value.asiento,
    });

    mensaje.value = 'Asignación registrada correctamente.';
    form.value.id_empleado = '';
    form.value.asiento = null;
    await cargarDatos();
    await sincronizarOperacionDiaria();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'No se pudo registrar la asignación.';
  } finally {
    guardando.value = false;
  }
}

async function eliminar(id: string) {
  if (!await dialogConfirm('¿Eliminar esta asignación semanal?', { title: 'Eliminar asignación', confirmLabel: 'Eliminar' })) return;

  eliminandoId.value = id;
  error.value = '';
  mensaje.value = '';

  try {
    await eliminarProgramacionSemanal(id);
    mensaje.value = 'Asignación eliminada correctamente.';
    await cargarDatos();
    await sincronizarOperacionDiaria();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'No se pudo eliminar la asignación.';
  } finally {
    eliminandoId.value = null;
  }
}

watch(semana, () => {
  filtroTabla.value = '';
  cargarDatos();
});

watch([turnoSeleccionado, rutaSeleccionadaId], () => {
  form.value.asiento = null;
});

watch(turnoSeleccionado, asegurarSeleccionValida);

onMounted(async () => {
  try {
    await Promise.all([cargarRutas(), cargarTurnos()]);
    await cargarEmpleados();
    asegurarSeleccionValida();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'No se pudieron cargar los datos base.';
  }
  await cargarDatos();
});
</script>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; background: #f8fafc; color: #1a1a1a; width: 100%; }
.page { flex: 1; min-width: 0; padding: 2rem; width: 100%; color: #1a1a1a; }
.page.with-sidebar { padding: 2.5rem 2rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
.page-header h2 { margin: 0; color: #0f172a; font-weight: 700; font-size: 1.5rem; }
.page-header p { margin: 0.35rem 0 0; color: #475569; }
.quick-nav { display: flex; gap: 0.5rem; }

.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; margin-bottom: 1rem; color: #1a1a1a; }
.card h3 { margin: 0 0 0.5rem; color: #0f172a; font-weight: 700; font-size: 1.1rem; }
.card-head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
.filtros { display: flex; gap: 0.8rem; align-items: end; flex-wrap: wrap; }
.filtro-dropdown { min-width: min(100%, 220px); flex: 1; max-width: 280px; }
.filtros-estado { font-size: 0.78rem; color: #64748b; font-weight: 600; padding-bottom: 0.55rem; }

.dia-grupo { display: flex; align-items: center; gap: 0.5rem; }
.dia-grupo__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: #0f172a;
  color: #fff;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  flex-shrink: 0;
}
.tabla-filtro { min-width: min(100%, 320px); flex: 1; max-width: 360px; }

.asignador { display: grid; grid-template-columns: 1fr 380px; gap: 1rem; align-items: start; }
.parrilla-card { display: flex; align-items: center; justify-content: center; min-height: 320px; }
.panel-asignacion h3 { margin: 0 0 0.25rem; color: #0f172a; font-weight: 700; }
.contexto-seleccion { margin: 0 0 0.35rem; font-size: 0.88rem; font-weight: 600; color: #0f172a; line-height: 1.4; }
.asiento-hint { margin-bottom: 0.75rem; }

label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem; font-weight: 600; color: #334155; }
.field { margin-bottom: 1rem; }
.input { border: 1px solid var(--ilpea-border); border-radius: 8px; padding: 0.65rem 0.8rem; font-size: 0.9rem; background: var(--ilpea-white); color: var(--ilpea-gray-900); font-family: inherit; transition: border-color 0.2s, box-shadow 0.2s; }
.input:focus { outline: none; border-color: var(--ilpea-accent); box-shadow: 0 0 0 3px rgba(16, 124, 65, 0.12); }
.hint { margin: 0.25rem 0 0; color: #64748b; font-size: 0.78rem; }
.panel-asignacion .muted { color: #64748b; }

.btn { border: 1px solid #cbd5e1; background: #fff; color: #0f172a; border-radius: 8px; padding: 0.5rem 0.8rem; cursor: pointer; font-weight: 600; font-size: 0.85rem; }
.btn:disabled { opacity: 0.55; cursor: not-allowed; color: #64748b; }
.btn-primary { background: #0f172a; color: #fff; border-color: #0f172a; }
.btn-primary:disabled { background: #64748b; border-color: #64748b; color: #e2e8f0; opacity: 1; }
.btn-block { width: 100%; margin-top: 0.5rem; }
.btn-danger { background: #be123c; color: #fff; border-color: #be123c; font-size: 0.75rem; padding: 0.35rem 0.55rem; }

.status { margin: 0 0 0.75rem; font-size: 0.85rem; font-weight: 600; }
.ok { color: #166534; }
.error { color: #b91c1c; }
.ui-alert-inline { padding: 0.5rem 0.65rem; border-radius: 8px; font-size: 0.78rem; margin: 0 0 0.75rem; }
.ui-alert-inline.warning { background: #fef3c7; color: #92400e; }

.list { margin: 0; padding-left: 1rem; color: #1e293b; }
.list li { margin: 0.3rem 0; }
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; min-width: 760px; }
.table th, .table td { border-top: 1px solid #e2e8f0; padding: 0.65rem; text-align: left; font-size: 0.85rem; color: #1e293b; }
.table thead th { border-top: none; background: #f8fafc; font-size: 0.75rem; text-transform: uppercase; color: #475569; font-weight: 700; }
.muted { color: #64748b; }
.center { text-align: center; }

@media (max-width: 900px) {
  .asignador { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .admin-layout { flex-direction: column; }
}
</style>
