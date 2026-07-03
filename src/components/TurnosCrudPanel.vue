<template>
  <section class="crud-page">
    <div class="crud-toolbar">
      <button type="button" class="crud-btn-new" @click="abrirNuevo">
        <AppIcon name="plus" :size="16" />
        <span>Nuevo turno</span>
      </button>

      <div class="crud-search crud-search--autocomplete">
        <AppAutocomplete
          v-model="terminoBusqueda"
          variant="toolbar"
          mode="filter"
          :options="opcionesBusqueda"
          placeholder="Buscar por nombre, día o tipo..."
        />
      </div>
    </div>

    <div v-if="mensaje || error" class="crud-alerts">
      <p v-if="mensaje" class="ui-alert ui-alert--success">{{ mensaje }}</p>
      <p v-if="error" class="ui-alert ui-alert--error">{{ error }}</p>
    </div>

    <div class="turnos-parrilla-wrap">
      <div class="turnos-parrilla-header">
        <span>Parrilla semanal</span>
        <label class="semana-visual">
          Semana
          <AppWeekPicker v-model="semanaVisual" />
        </label>
      </div>

      <div class="turnos-parrilla-scroll">
        <table class="turnos-parrilla">
          <thead>
            <tr class="parrilla-fila-dias">
              <th v-for="dia in diasSemana" :key="dia.numero" :colspan="tiposPorDia(dia.numero).length">
                {{ dia.nombre }}
              </th>
            </tr>
            <tr class="parrilla-fila-fechas">
              <th v-for="celda in celdasParrilla" :key="`fecha-${celda.turno?.id || celda.etiqueta}`">
                {{ celda.fecha }}
              </th>
            </tr>
            <tr class="parrilla-fila-tipos">
              <th v-for="celda in celdasParrilla" :key="`tipo-${celda.turno?.id || celda.etiqueta}`">
                {{ celda.etiqueta }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr class="parrilla-fila-personal">
              <td v-for="celda in celdasParrilla" :key="`count-${celda.turno?.id || celda.etiqueta}`">
                <span class="parrilla-count" :title="'Rutas que usan este turno'">
                  {{ celda.turno ? conteoRutasPorTurno(celda.turno.id) : '—' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="crud-muted parrilla-leyenda">Fila inferior: número de rutas activas que operan en cada turno.</p>
    </div>

    <div class="tabla-header-row">
      <span class="tabla-label">Turnos del catálogo ({{ turnosFiltrados.length }})</span>
      <span class="tabla-hint">Los turnos deshabilitados permanecen en el catálogo y pueden rehabilitarse.</span>
    </div>

    <div class="crud-table-wrap">
      <div v-if="cargando" class="crud-empty">Cargando turnos...</div>
      <div v-else-if="!turnosFiltrados.length" class="crud-empty">
        {{ terminoBusqueda ? 'Sin resultados para la búsqueda.' : 'No hay turnos en el catálogo. Crea uno con «Nuevo turno».' }}
      </div>
      <div v-else class="crud-table-scroll">
        <table class="crud-table turnos-catalogo-tabla">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tipo</th>
              <th>Nombre</th>
              <th>Horario</th>
              <th class="th-center">Estado</th>
              <th class="th-center">Rutas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="grupo in turnosAgrupadosFiltrados" :key="grupo.dia">
              <tr class="turno-grupo-separador" :class="{ 'turno-grupo-separador--fin-semana': grupo.dia >= 6 }">
                <td colspan="7">
                  <div class="turno-grupo-header">
                    <div class="turno-grupo-titulo">
                      <span class="turno-grupo-abbr">{{ abreviaturaDia(grupo.dia) }}</span>
                      <span class="turno-grupo-nombre">{{ grupo.etiqueta }}</span>
                    </div>
                    <span class="turno-grupo-count">
                      {{ grupo.turnos.length }} {{ grupo.turnos.length === 1 ? 'turno' : 'turnos' }}
                    </span>
                  </div>
                </td>
              </tr>
              <tr
                v-for="turno in grupo.turnos"
                :key="turno.id"
                class="turno-fila"
                :class="{ 'turno-fila--inactivo': turno.activo === false }"
              >
                <td><span class="crud-id turno-id">{{ turno.id }}</span></td>
                <td>
                  <span class="turno-tipo-badge" :class="claseTipoBadge(turno.tipo)">
                    {{ etiquetaTipo(turno.tipo) }}
                  </span>
                </td>
                <td><span class="crud-name">{{ turno.nombre || '—' }}</span></td>
                <td>
                  <span class="turno-horario" :class="{ 'turno-horario--vacio': !turno.hora_inicio || !turno.hora_fin }">
                    {{ horarioTurno(turno) }}
                  </span>
                </td>
                <td class="td-center">
                  <span
                    class="turno-estado-badge"
                    :class="turno.activo === false ? 'turno-estado-badge--inactivo' : 'turno-estado-badge--activo'"
                  >
                    {{ turno.activo === false ? 'Deshabilitado' : 'Activo' }}
                  </span>
                </td>
                <td class="td-center">
                  <span
                    class="turno-rutas-badge"
                    :class="{ 'turno-rutas-badge--activo': conteoRutasPorTurno(turno.id) > 0 }"
                  >
                    {{ conteoRutasPorTurno(turno.id) }}
                  </span>
                </td>
                <td>
                  <div class="crud-actions">
                    <button
                      v-if="turno.activo !== false"
                      type="button"
                      class="crud-action-btn crud-action-btn--edit"
                      @click="editarTurno(turno)"
                    >
                      <AppIcon name="pencil" :size="13" />
                      Editar
                    </button>
                    <button
                      v-if="turno.activo !== false"
                      type="button"
                      class="crud-action-btn crud-action-btn--delete"
                      @click="deshabilitarTurno(turno)"
                    >
                      <AppIcon name="trash-2" :size="13" />
                      Deshabilitar
                    </button>
                    <button
                      v-else
                      type="button"
                      class="crud-action-btn crud-action-btn--edit"
                      @click="habilitarTurnoCatalogo(turno)"
                    >
                      <AppIcon name="check" :size="13" />
                      Habilitar
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="modalAbierto" class="crud-modal-overlay" @click.self="cerrarModal">
        <form class="crud-modal turno-modal" @submit.prevent="guardarTurno">
          <h3>{{ editandoId ? 'Editar turno' : 'Nuevo turno' }}</h3>

          <template v-if="!editandoId">
            <label>
              Día
              <select v-model.number="form.dia_semana" required>
                <option v-for="dia in diasSemana" :key="dia.numero" :value="dia.numero">
                  {{ dia.nombre }}
                </option>
              </select>
            </label>

            <label>
              Tipo
              <select v-model="form.tipo" required>
                <option v-for="tipo in tiposDisponiblesForm" :key="tipo.value" :value="tipo.value">
                  {{ tipo.label }}
                </option>
              </select>
            </label>
          </template>

          <label v-else>
            Identificador
            <input :value="editandoId" type="text" disabled readonly />
          </label>

          <p v-if="!editandoId" class="ui-muted">
            El identificador del turno se genera automáticamente según el día y el tipo.
          </p>

          <label>
            Nombre
            <input v-model.trim="form.nombre" type="text" placeholder="Ej. 1er Turno" required />
          </label>

          <div class="turno-horario-row">
            <label>
              Hora inicio
              <AppTimePicker v-model="form.hora_inicio" />
            </label>
            <label>
              Hora fin
              <AppTimePicker v-model="form.hora_fin" />
            </label>
          </div>

          <label>
            Orden (opcional)
            <input v-model.number="form.orden" type="number" min="1" max="99" />
          </label>

          <p v-if="errorModal" class="ui-alert ui-alert--error">{{ errorModal }}</p>

          <div class="crud-modal-actions">
            <button type="submit" class="crud-btn-new" :disabled="guardando">
              {{ guardando ? 'Guardando...' : 'Guardar' }}
            </button>
            <button type="button" class="crud-btn-secondary" :disabled="guardando" @click="cerrarModal">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppIcon from './ui/AppIcon.vue';
import AppAutocomplete, { type AutocompleteOption } from './ui/AppAutocomplete.vue';
import AppTimePicker from './ui/AppTimePicker.vue';
import AppWeekPicker from './ui/AppWeekPicker.vue';
import { coincideBusqueda } from '../utils/busqueda';
import { useAuth } from '../composables/useAuth';
import { useDialog } from '../composables/useDialog';
import {
  useOperacionModulos,
  type TurnoCatalogo,
} from '../composables/useOperacionModulos';

interface RutaResumen {
  id: string;
  turnos?: string[];
  activa?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const DIAS_SEMANA = [
  { numero: 1, nombre: 'Lunes' },
  { numero: 2, nombre: 'Martes' },
  { numero: 3, nombre: 'Miércoles' },
  { numero: 4, nombre: 'Jueves' },
  { numero: 5, nombre: 'Viernes' },
  { numero: 6, nombre: 'Sábado' },
  { numero: 7, nombre: 'Domingo' },
];

const TIPOS_LUN_VIE = [
  { value: '1er', label: '1er' },
  { value: '2do', label: '2do' },
  { value: 'mixto', label: 'Mixto' },
  { value: '3er', label: '3er' },
];

const TIPOS_FIN_SEMANA = [
  { value: '1er', label: '1er' },
  { value: '2do', label: '2do' },
  { value: '3er', label: '3er' },
];

const { authHeaders } = useAuth();
const { dialogConfirm } = useDialog();
const {
  listarTurnos,
  crearTurno,
  actualizarTurno,
  deshabilitarTurno: deshabilitarTurnoApi,
  habilitarTurno,
} = useOperacionModulos();

const turnos = ref<TurnoCatalogo[]>([]);
const rutas = ref<RutaResumen[]>([]);
const cargando = ref(false);
const guardando = ref(false);
const error = ref<string | null>(null);
const mensaje = ref<string | null>(null);
const errorModal = ref<string | null>(null);
const terminoBusqueda = ref('');
const modalAbierto = ref(false);
const editandoId = ref<string | null>(null);

function semanaInputActual() {
  const fecha = new Date();
  const inicioAnio = new Date(Date.UTC(fecha.getUTCFullYear(), 0, 1));
  const dias = Math.floor((fecha.getTime() - inicioAnio.getTime()) / 86400000);
  const semana = Math.ceil((dias + inicioAnio.getUTCDay() + 1) / 7);
  return `${fecha.getUTCFullYear()}-W${String(semana).padStart(2, '0')}`;
}

const semanaVisual = ref(semanaInputActual());

const form = reactive({
  dia_semana: 1,
  tipo: '1er',
  nombre: '',
  hora_inicio: '',
  hora_fin: '',
  orden: null as number | null,
});

const diasSemana = DIAS_SEMANA;

const tiposDisponiblesForm = computed(() =>
  form.dia_semana >= 6 ? TIPOS_FIN_SEMANA : TIPOS_LUN_VIE,
);

const opcionesBusqueda = computed<AutocompleteOption[]>(() =>
  turnos.value.map((turno) => ({
    value: turno.id,
    label: `${turno.dia_nombre || 'Día'} · ${turno.nombre || turno.id}`,
    hint: turno.tipo || undefined,
    keywords: `${turno.id} ${turno.nombre} ${turno.dia_nombre} ${turno.tipo}`,
  })),
);

const turnosFiltrados = computed(() => {
  const termino = terminoBusqueda.value;
  if (!termino.trim()) return turnos.value;

  return turnos.value.filter((turno) =>
    coincideBusqueda(
      termino,
      turno.id,
      turno.nombre,
      turno.dia_nombre,
      turno.tipo,
    ),
  );
});

const turnosAgrupadosFiltrados = computed(() => {
  const mapa = new Map<number, TurnoCatalogo[]>();

  turnosFiltrados.value.forEach((turno) => {
    const dia = turno.dia_semana ?? 99;
    if (!mapa.has(dia)) mapa.set(dia, []);
    mapa.get(dia)!.push(turno);
  });

  return [...mapa.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([dia, items]) => ({
      dia,
      etiqueta: DIAS_SEMANA.find((d) => d.numero === dia)?.nombre || `Día ${dia}`,
      turnos: [...items].sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0)),
    }));
});

const fechasSemanaVisual = computed(() => {
  const weekInput = semanaVisual.value;
  const match = /^(\d{4})-W(\d{2})$/.exec(weekInput);
  if (!match) return [] as string[];

  const anio = Number(match[1]);
  const semana = Number(match[2]);
  const eneroCuatro = new Date(Date.UTC(anio, 0, 4));
  const diaSemana = eneroCuatro.getUTCDay() || 7;
  const lunesSemanaUno = new Date(eneroCuatro);
  lunesSemanaUno.setUTCDate(eneroCuatro.getUTCDate() - diaSemana + 1);
  const lunes = new Date(lunesSemanaUno);
  lunes.setUTCDate(lunesSemanaUno.getUTCDate() + (semana - 1) * 7);

  const fechas: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    const actual = new Date(lunes);
    actual.setUTCDate(lunes.getUTCDate() + i);
    const d = String(actual.getUTCDate()).padStart(2, '0');
    const m = String(actual.getUTCMonth() + 1).padStart(2, '0');
    fechas.push(`${d}/${m}`);
  }
  return fechas;
});

function tiposPorDia(diaSemana: number) {
  return diaSemana <= 5 ? TIPOS_LUN_VIE : TIPOS_FIN_SEMANA;
}

function buscarTurnoEnCatalogo(diaSemana: number, tipo: string) {
  return turnos.value.find(
    (t) => t.activo !== false
      && t.dia_semana === diaSemana
      && String(t.tipo || '').toLowerCase() === tipo,
  ) || null;
}

const celdasParrilla = computed(() => {
  const fechas = fechasSemanaVisual.value;
  const celdas: Array<{ etiqueta: string; fecha: string; turno: TurnoCatalogo | null }> = [];

  DIAS_SEMANA.forEach((dia, indice) => {
    const tipos = tiposPorDia(dia.numero);
    tipos.forEach((tipo) => {
      celdas.push({
        etiqueta: tipo.label,
        fecha: fechas[indice] || '—',
        turno: buscarTurnoEnCatalogo(dia.numero, tipo.value),
      });
    });
  });

  return celdas;
});

const conteoRutasMapa = computed(() => {
  const mapa = new Map<string, number>();
  rutas.value.forEach((ruta) => {
    if (ruta.activa === false) return;
    (ruta.turnos || []).forEach((turnoId) => {
      mapa.set(turnoId, (mapa.get(turnoId) || 0) + 1);
    });
  });
  return mapa;
});

function conteoRutasPorTurno(turnoId: string) {
  return conteoRutasMapa.value.get(turnoId) || 0;
}

const ABREV_DIAS: Record<number, string> = {
  1: 'LUN',
  2: 'MAR',
  3: 'MIÉ',
  4: 'JUE',
  5: 'VIE',
  6: 'SÁB',
  7: 'DOM',
};

function abreviaturaDia(dia: number) {
  return ABREV_DIAS[dia] || `D${dia}`;
}

function etiquetaTipo(tipo?: string | null) {
  if (!tipo) return '—';
  if (tipo === 'mixto') return 'Mixto';
  if (tipo === '1er') return '1er';
  if (tipo === '2do') return '2do';
  if (tipo === '3er') return '3er';
  return tipo;
}

function claseTipoBadge(tipo?: string | null) {
  const normalizado = String(tipo || '').toLowerCase();
  if (normalizado === 'mixto') return 'turno-tipo-badge--mixto';
  if (normalizado === '1er') return 'turno-tipo-badge--primero';
  if (normalizado === '2do') return 'turno-tipo-badge--segundo';
  if (normalizado === '3er') return 'turno-tipo-badge--tercero';
  return 'turno-tipo-badge--otro';
}

function horarioTurno(turno: TurnoCatalogo) {
  if (turno.hora_inicio && turno.hora_fin) {
    return `${turno.hora_inicio} – ${turno.hora_fin}`;
  }
  return '—';
}

function limpiarAlertas() {
  error.value = null;
  mensaje.value = null;
}

function resetForm() {
  form.dia_semana = 1;
  form.tipo = '1er';
  form.nombre = '';
  form.hora_inicio = '';
  form.hora_fin = '';
  form.orden = null;
}

async function cargarRutas() {
  try {
    const headers = await authHeaders();
    const respuesta = await fetch(`${API_BASE_URL}/api/rutas`, { headers });
    const json = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok || json?.success === false) {
      return;
    }
    rutas.value = (Array.isArray(json?.data) ? json.data : []).map((item: Record<string, unknown>) => ({
      id: String(item.id || ''),
      turnos: Array.isArray(item.turnos) ? item.turnos.map(String) : [],
      activa: item.activa !== false,
    }));
  } catch {
    // Conteo opcional; no bloquea el panel.
  }
}

async function cargarTurnos() {
  cargando.value = true;
  limpiarAlertas();
  try {
    turnos.value = await listarTurnos({ incluirInactivos: true });
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar el catálogo de turnos.';
  } finally {
    cargando.value = false;
  }
}

async function recargar() {
  await Promise.all([cargarTurnos(), cargarRutas()]);
}

function abrirNuevo() {
  editandoId.value = null;
  resetForm();
  errorModal.value = null;
  modalAbierto.value = true;
}

function editarTurno(turno: TurnoCatalogo) {
  editandoId.value = turno.id;
  form.dia_semana = turno.dia_semana ?? 1;
  form.tipo = turno.tipo || '1er';
  form.nombre = turno.nombre || '';
  form.hora_inicio = turno.hora_inicio || '';
  form.hora_fin = turno.hora_fin || '';
  form.orden = turno.orden ?? null;
  errorModal.value = null;
  modalAbierto.value = true;
}

function cerrarModal() {
  if (guardando.value) return;
  modalAbierto.value = false;
  editandoId.value = null;
  errorModal.value = null;
}

async function guardarTurno() {
  guardando.value = true;
  errorModal.value = null;
  try {
    if (editandoId.value) {
      await actualizarTurno(editandoId.value, {
        nombre: form.nombre,
        hora_inicio: form.hora_inicio || null,
        hora_fin: form.hora_fin || null,
        orden: form.orden,
      });
      mensaje.value = 'Turno actualizado correctamente.';
    } else {
      await crearTurno({
        nombre: form.nombre,
        dia_semana: form.dia_semana,
        tipo: form.tipo,
        hora_inicio: form.hora_inicio || null,
        hora_fin: form.hora_fin || null,
        orden: form.orden,
      });
      mensaje.value = 'Turno creado correctamente.';
    }

    cerrarModal();
    await recargar();
  } catch (err) {
    errorModal.value = err instanceof Error ? err.message : 'No se pudo guardar el turno.';
  } finally {
    guardando.value = false;
  }
}

async function deshabilitarTurno(turno: TurnoCatalogo) {
  const rutasUsando = conteoRutasPorTurno(turno.id);
  if (rutasUsando > 0) {
    error.value = `No se puede deshabilitar: ${rutasUsando} ruta(s) activa(s) usan "${turno.nombre || turno.id}".`;
    return;
  }

  if (!await dialogConfirm(`¿Deshabilitar el turno "${turno.nombre || turno.id}"? Podrás volver a habilitarlo después.`, { title: 'Deshabilitar turno', confirmLabel: 'Deshabilitar' })) {
    return;
  }

  limpiarAlertas();
  try {
    await deshabilitarTurnoApi(turno.id);
    mensaje.value = 'Turno deshabilitado correctamente.';
    await recargar();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo deshabilitar el turno.';
  }
}

async function habilitarTurnoCatalogo(turno: TurnoCatalogo) {
  if (!await dialogConfirm(`¿Habilitar nuevamente el turno "${turno.nombre || turno.id}"?`, { title: 'Habilitar turno', confirmLabel: 'Habilitar' })) {
    return;
  }

  limpiarAlertas();
  try {
    await habilitarTurno(turno.id);
    mensaje.value = 'Turno habilitado correctamente.';
    await recargar();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo habilitar el turno.';
  }
}

onMounted(() => {
  recargar();
});
</script>

<style scoped>
.turnos-parrilla-wrap {
  margin-bottom: 1.75rem;
  background: var(--ilpea-white);
  border: 1px solid var(--ilpea-border);
  border-radius: 12px;
  padding: 1.25rem 1.25rem 1rem;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
}

.turnos-parrilla-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ilpea-gray-700);
}

.semana-visual {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.82rem;
}

.input-semana {
  border: 1px solid var(--ilpea-border);
  border-radius: 8px;
  padding: 0.4rem 0.6rem;
  font-size: 0.82rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-semana:focus {
  outline: none;
  border-color: var(--ilpea-accent);
  box-shadow: 0 0 0 3px rgba(16, 124, 65, 0.12);
}

.turnos-parrilla-scroll {
  overflow-x: auto;
  border-radius: 10px;
  border: 1px solid var(--ilpea-border);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
}

.turnos-parrilla {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 920px;
  font-size: 0.78rem;
}

.turnos-parrilla th,
.turnos-parrilla td {
  border-right: 1px solid var(--ilpea-border);
  border-bottom: 1px solid var(--ilpea-border);
  text-align: center;
  padding: 0.6rem 0.4rem;
  transition: background-color 0.2s ease;
}

/* Remove outer borders inside scroll container */
.turnos-parrilla th:last-child,
.turnos-parrilla td:last-child {
  border-right: none;
}
.turnos-parrilla tr:last-child td {
  border-bottom: none;
}

.parrilla-fila-dias th {
  background: var(--ilpea-black);
  color: var(--ilpea-white);
  font-weight: 700;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.7rem 0.4rem;
}

.parrilla-fila-fechas th {
  background: #f8fafc;
  color: var(--ilpea-gray-700);
  font-weight: 700;
  font-size: 0.76rem;
  font-variant-numeric: tabular-nums;
}

.parrilla-fila-tipos th {
  background: var(--ilpea-success-bg);
  color: var(--ilpea-success);
  font-weight: 700;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.parrilla-fila-personal td {
  background: var(--ilpea-white);
}

.parrilla-fila-personal:hover td {
  background: var(--ilpea-gray-100);
}

.parrilla-count {
  display: inline-flex;
  min-width: 1.8rem;
  height: 1.8rem;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--ilpea-accent);
  background: var(--ilpea-success-bg);
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(16, 124, 65, 0.2);
}

.parrilla-leyenda {
  margin: 0.75rem 0 0;
  font-size: 0.78rem;
  color: var(--ilpea-gray-500);
}

.tabla-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.6rem;
}

.tabla-label {
  font-size: 0.82rem;
  color: var(--ilpea-gray-500);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.turnos-catalogo-tabla thead {
  background: var(--ilpea-black);
}

.turnos-catalogo-tabla thead th {
  padding: 0.85rem 1.1rem;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
}

.turnos-catalogo-tabla .th-center,
.turnos-catalogo-tabla .td-center {
  text-align: center;
}

.turno-grupo-separador td {
  padding: 0;
  border-bottom: none;
  background: transparent;
}

.turno-grupo-separador:hover td {
  background: transparent;
}

.turno-grupo-separador:not(:first-child) .turno-grupo-header {
  border-top: 1px solid var(--ilpea-border);
}

.turno-grupo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.7rem 1.1rem;
  background: linear-gradient(90deg, var(--ilpea-success-bg) 0%, #f8fafc 72%);
  border-left: 3px solid var(--ilpea-accent);
}

.turno-grupo-separador--fin-semana .turno-grupo-header {
  background: linear-gradient(90deg, #fffbeb 0%, #f8fafc 72%);
  border-left-color: #d97706;
}

.turno-grupo-titulo {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.turno-grupo-abbr {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.4rem;
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
  background: var(--ilpea-accent);
  color: var(--ilpea-white);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.turno-grupo-separador--fin-semana .turno-grupo-abbr {
  background: #d97706;
}

.turno-grupo-nombre {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--ilpea-gray-900);
  letter-spacing: -0.01em;
}

.turno-grupo-count {
  flex-shrink: 0;
  padding: 0.22rem 0.65rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid var(--ilpea-border);
  color: var(--ilpea-gray-500);
  font-size: 0.72rem;
  font-weight: 600;
}

.turno-fila td {
  padding: 0.85rem 1.1rem;
}

.turno-id {
  font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace;
  font-size: 0.82rem;
  letter-spacing: -0.02em;
}

.turno-tipo-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 3rem;
  padding: 0.28rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.turno-tipo-badge--primero {
  background: #eff6ff;
  color: #1d4ed8;
  box-shadow: inset 0 0 0 1px rgba(29, 78, 216, 0.15);
}

.turno-tipo-badge--segundo {
  background: #f5f3ff;
  color: #6d28d9;
  box-shadow: inset 0 0 0 1px rgba(109, 40, 217, 0.15);
}

.turno-tipo-badge--mixto {
  background: var(--ilpea-warning-bg);
  color: var(--ilpea-warning);
  box-shadow: inset 0 0 0 1px rgba(217, 119, 6, 0.18);
}

.turno-tipo-badge--tercero {
  background: #ecfeff;
  color: #0e7490;
  box-shadow: inset 0 0 0 1px rgba(14, 116, 144, 0.15);
}

.turno-tipo-badge--otro {
  background: var(--ilpea-gray-100);
  color: var(--ilpea-gray-700);
}

.turno-horario {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.55rem;
  border-radius: 6px;
  background: var(--ilpea-gray-100);
  color: var(--ilpea-gray-700);
  font-size: 0.82rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.turno-horario--vacio {
  background: transparent;
  color: var(--ilpea-gray-500);
  font-weight: 500;
}

.turno-rutas-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.75rem;
  height: 1.75rem;
  padding: 0 0.45rem;
  border-radius: 999px;
  background: var(--ilpea-gray-100);
  color: var(--ilpea-gray-500);
  font-size: 0.8rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.turno-rutas-badge--activo {
  background: var(--ilpea-success-bg);
  color: var(--ilpea-accent);
  box-shadow: inset 0 0 0 1px rgba(16, 124, 65, 0.2);
}

.turno-fila--inactivo {
  opacity: 0.75;
  background: #f8fafc;
}

.turno-estado-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
}

.turno-estado-badge--activo {
  background: var(--ilpea-success-bg);
  color: var(--ilpea-accent);
}

.turno-estado-badge--inactivo {
  background: #fee2e2;
  color: #991b1b;
}

.tabla-header-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.tabla-hint {
  font-size: 0.78rem;
  color: var(--ilpea-gray-500);
  font-weight: 400;
}

.turnos-catalogo-tabla tbody tr.turno-grupo-separador:hover {
  background: transparent;
}

.turno-modal {
  width: min(480px, 95vw);
}

.turno-horario-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
</style>
