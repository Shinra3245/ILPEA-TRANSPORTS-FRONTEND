<template>
  <section class="crud-page">
    <div class="crud-toolbar">
      <button type="button" class="crud-btn-new" @click="abrirNueva">
        <AppIcon name="plus" :size="16" />
        <span>Nueva ruta</span>
      </button>

      <div class="crud-search crud-search--autocomplete">
        <AppAutocomplete
          v-model="terminoBusqueda"
          variant="toolbar"
          mode="filter"
          :options="opcionesBusqueda"
          placeholder="Buscar por número, zona o turno..."
        />
      </div>
    </div>

    <div v-if="mensaje || error" class="crud-alerts">
      <p v-if="mensaje" class="ui-alert ui-alert--success">{{ mensaje }}</p>
      <p v-if="error" class="ui-alert ui-alert--error">{{ error }}</p>
    </div>

    <div class="tabla-header-row">
      <span class="tabla-label">Rutas registradas ({{ rutasFiltradas.length }})</span>
      <v-tooltip text="Exportar catálogo de rutas a Excel" location="top">
        <template #activator="{ props }">
          <button
            v-bind="props"
            type="button"
            class="btn-export-tabla"
            :disabled="exportando || !rutasFiltradas.length"
            @click="exportarExcel"
          >
            <AppIcon v-if="exportando" name="loader-2" :size="14" spin />
            <AppIcon v-else name="file-spreadsheet" :size="14" />
            {{ exportando ? 'Exportando...' : 'Exportar Excel' }}
          </button>
        </template>
      </v-tooltip>
    </div>

    <div class="crud-table-wrap">
      <div v-if="cargando" class="crud-empty">Cargando rutas...</div>
      <div v-else-if="!rutasFiltradas.length" class="crud-empty">
        {{ terminoBusqueda ? 'Sin resultados para la búsqueda.' : 'No hay rutas registradas.' }}
      </div>
      <div v-else class="crud-table-scroll">
        <table class="crud-table">
          <thead>
            <tr>
              <th>Ruta</th>
              <th>Zona</th>
              <th>Turnos</th>
              <th>Unidades</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ruta in rutasFiltradas" :key="ruta.id">
              <td><span class="crud-id">Ruta {{ ruta.ruta ?? '—' }}</span></td>
              <td><span class="crud-name">{{ ruta.zona || 'Sin zona' }}</span></td>
              <td class="cell-turnos">
                <span v-if="ruta.turnos?.length">{{ ruta.turnos.map(etiquetaTurno).join(', ') }}</span>
                <span v-else class="crud-muted">Sin turnos</span>
              </td>
              <td class="cell-unidades">
                <span v-if="resumenUnidades(ruta)">{{ resumenUnidades(ruta) }}</span>
                <span v-else class="crud-muted">Sin unidades</span>
              </td>
              <td>
                <span v-if="ruta.activa" class="crud-status-yes">
                  <AppIcon name="check" :size="12" />
                  Activa
                </span>
                <span v-else class="crud-status-no">Deshabilitada</span>
              </td>
              <td>
                <div class="crud-actions">
                  <button
                    type="button"
                    class="crud-action-btn crud-action-btn--edit"
                    :disabled="procesandoId === ruta.id"
                    @click="abrirEditarTurnos(ruta)"
                  >
                    <AppIcon name="pencil" :size="13" />
                    Turnos
                  </button>
                  <v-tooltip
                    :text="tieneTurnos(ruta) ? 'Asignar unidad por turno' : 'Asigna turnos primero'"
                    location="top"
                  >
                    <template #activator="{ props }">
                      <span v-bind="props" class="crud-action-btn-wrap">
                        <button
                          type="button"
                          class="crud-action-btn crud-action-btn--edit"
                          :class="{ 'crud-action-btn--inactive': !tieneTurnos(ruta) }"
                          :disabled="procesandoId === ruta.id || !tieneTurnos(ruta)"
                          @click="abrirAsignarUnidades(ruta)"
                        >
                          <AppIcon name="truck" :size="13" />
                          Unidades
                        </button>
                      </span>
                    </template>
                  </v-tooltip>
                  <button
                    v-if="ruta.activa"
                    type="button"
                    class="crud-action-btn crud-action-btn--delete"
                    :disabled="procesandoId === ruta.id"
                    @click="intentarDeshabilitar(ruta)"
                  >
                    <AppIcon name="trash-2" :size="13" />
                    Deshabilitar
                  </button>
                  <button
                    v-else
                    type="button"
                    class="crud-action-btn crud-action-btn--edit"
                    :disabled="procesandoId === ruta.id"
                    @click="habilitarRuta(ruta)"
                  >
                    <AppIcon name="check" :size="13" />
                    Habilitar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Teleport to="body">
      <!-- Modal: nueva ruta -->
      <div v-if="modalModo === 'nueva'" class="crud-modal-overlay" @click.self="() => cerrarModal()">
        <form class="crud-modal ruta-modal" @submit.prevent="guardarNuevaRuta">
          <h3>Nueva ruta</h3>

          <div class="ruta-form-grid">
            <label>
              Número de ruta
              <input v-model.number="form.ruta" type="number" min="1" required placeholder="Ej. 6" />
            </label>
            <label>
              Zona
              <input v-model.trim="form.zona" type="text" placeholder="Ej. Centro" />
            </label>
            <label class="ruta-form-full">
              Nombre (opcional)
              <input v-model.trim="form.nombre" type="text" :placeholder="nombreSugerido" />
            </label>
          </div>

          <div class="ruta-turnos-block">
            <span class="ruta-turnos-label">Turnos que opera</span>
            <p v-if="!turnosCatalogo.length" class="crud-muted">No hay turnos en el catálogo.</p>
            <template v-for="grupo in turnosAgrupados" :key="grupo.dia">
              <p class="turno-grupo-dia">{{ grupo.etiqueta }}</p>
              <div v-for="turno in grupo.turnos" :key="turno.id" class="turno-edit-row turno-edit-row--compact">
                <label class="turno-check container">
                  <input type="checkbox" :value="turno.id" v-model="turnosSeleccionados" />
                  <div class="checkmark"></div>
                  <div class="turno-check-labels">
                    <span>{{ turno.nombre || turno.id }}</span>
                    <small>{{ etiquetaTipoTurno(turno.tipo) }}</small>
                  </div>
                </label>
              </div>
            </template>
            <p class="crud-muted ruta-hint">Después de crear la ruta, usa el botón <strong>Unidades</strong> para asignar vehículos por turno.</p>
          </div>

          <p v-if="errorModal" class="ui-alert ui-alert--error">{{ errorModal }}</p>

          <div class="crud-modal-actions">
            <button type="submit" class="crud-btn-new" :disabled="guardando">
              {{ guardando ? 'Guardando...' : 'Crear ruta' }}
            </button>
            <button type="button" class="crud-btn-secondary" :disabled="guardando" @click="() => cerrarModal()">
              Cancelar
            </button>
          </div>
        </form>
      </div>

      <!-- Modal: editar turnos -->
      <div v-if="modalModo === 'turnos' && rutaEnEdicion" class="crud-modal-overlay" @click.self="() => cerrarModal()">
        <form class="crud-modal ruta-modal" @submit.prevent="guardarTurnos">
          <h3>Turnos — Ruta {{ rutaEnEdicion.ruta }}</h3>
          <p class="crud-muted modal-intro">Selecciona los turnos en los que opera esta ruta.</p>

          <div class="ruta-turnos-block">
            <p v-if="!turnosCatalogo.length" class="crud-muted">No hay turnos en el catálogo.</p>
            <template v-for="grupo in turnosAgrupados" :key="grupo.dia">
              <p class="turno-grupo-dia">{{ grupo.etiqueta }}</p>
              <div v-for="turno in grupo.turnos" :key="turno.id" class="turno-edit-row turno-edit-row--compact">
                <label class="turno-check container">
                  <input type="checkbox" :value="turno.id" v-model="turnosSeleccionados" />
                  <div class="checkmark"></div>
                  <div class="turno-check-labels">
                    <span>{{ turno.nombre || turno.id }}</span>
                    <small>{{ etiquetaTipoTurno(turno.tipo) }}</small>
                  </div>
                </label>
              </div>
            </template>
          </div>

          <p v-if="errorModal" class="ui-alert ui-alert--error">{{ errorModal }}</p>

          <div class="crud-modal-actions">
            <button type="submit" class="crud-btn-new" :disabled="guardando">
              {{ guardando ? 'Guardando...' : 'Guardar turnos' }}
            </button>
            <button type="button" class="crud-btn-secondary" :disabled="guardando" @click="() => cerrarModal()">
              Cancelar
            </button>
          </div>
        </form>
      </div>

      <!-- Modal: asignar unidades -->
      <div v-if="modalModo === 'unidades' && rutaEnEdicion" class="crud-modal-overlay" @click.self="() => cerrarModal()">
        <form class="crud-modal ruta-modal" @submit.prevent="guardarUnidades">
          <h3>Unidades — Ruta {{ rutaEnEdicion.ruta }}</h3>
          <p class="crud-muted modal-intro">
            Asigna un vehículo del catálogo a cada turno de la ruta.
            Las unidades ya usadas en el mismo turno por otra ruta aparecen deshabilitadas.
          </p>

          <div v-if="catalogoCargando" class="crud-muted modal-intro">
            Cargando catálogo de vehículos...
          </div>

          <div v-else-if="!turnosDeRuta.length" class="crud-muted">
            Esta ruta no tiene turnos. Usa el botón <strong>Turnos</strong> primero.
          </div>

          <div v-else-if="errorCatalogo" class="ui-alert ui-alert--error">
            {{ errorCatalogo }}
          </div>

          <div v-else-if="!vehiculosCatalogo.length" class="ui-alert ui-alert--error">
            No hay vehículos en el catálogo. Ejecuta el seed de catálogos en el backend.
          </div>

          <div v-else class="ruta-turnos-block">
            <div v-for="turnoId in turnosDeRuta" :key="turnoId" class="turno-edit-row">
              <span class="turno-nombre-unidad">{{ etiquetaTurno(turnoId) }}</span>
              <small class="turno-dias-unidad">{{ diasTurno(turnoId) }}</small>
              <select v-model="unidadPorTurno[turnoId]" class="turno-unit-select" required>
                <option value="">Selecciona unidad...</option>
                <option
                  v-for="veh in vehiculosCatalogo"
                  :key="veh.id"
                  :value="veh.id"
                  :disabled="!opcionVehiculoDisponible(turnoId, veh.id)"
                >
                  {{ etiquetaVehiculoOpcion(turnoId, veh) }}
                </option>
              </select>
            </div>
          </div>

          <p v-if="errorModal" class="ui-alert ui-alert--error">{{ errorModal }}</p>

          <div class="crud-modal-actions">
            <button
              type="submit"
              class="crud-btn-new"
              :disabled="guardando || catalogoCargando || !turnosDeRuta.length || !vehiculosCatalogo.length"
            >
              {{ guardando ? 'Guardando...' : 'Guardar unidades' }}
            </button>
            <button type="button" class="crud-btn-secondary" :disabled="guardando" @click="() => cerrarModal()">
              Cancelar
            </button>
          </div>
        </form>
      </div>

      <div v-if="modalBloqueoAbierto" class="crud-modal-overlay" @click.self="cerrarModalBloqueo">
        <div class="crud-modal bloqueo-modal">
          <h3>No se puede deshabilitar esta ruta</h3>
          <p class="crud-muted bloqueo-intro">
            La ruta <strong>Ruta {{ rutaSeleccionada?.ruta }}</strong> tiene pasajeros asignados.
            Reasígnalos antes de deshabilitarla.
          </p>

          <div class="crud-table-scroll bloqueo-tabla">
            <table class="crud-table">
              <thead>
                <tr>
                  <th>ID empleado</th>
                  <th>Nombre</th>
                  <th>Fecha</th>
                  <th>Turno</th>
                  <th>Asiento</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="empleado in rutaSeleccionada?.empleados_a_reasignar || []"
                  :key="`${empleado.id_empleado}-${empleado.fecha}-${empleado.turno || ''}`"
                >
                  <td><span class="crud-id">{{ empleado.id_empleado }}</span></td>
                  <td>{{ empleado.nombre }}</td>
                  <td>{{ empleado.fecha }}</td>
                  <td>{{ empleado.turno || '—' }}</td>
                  <td>{{ empleado.asiento ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="crud-modal-actions">
            <button type="button" class="crud-btn-secondary" @click="cerrarModalBloqueo">Cerrar</button>
            <button type="button" class="crud-btn-new" @click="irAAsignaciones">Ir a programación</button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import AppIcon from './ui/AppIcon.vue';
import AppAutocomplete, { type AutocompleteOption } from './ui/AppAutocomplete.vue';
import { coincideBusqueda } from '../utils/busqueda';
import { useAuth } from '../composables/useAuth';
import { useDialog } from '../composables/useDialog';
import { useTurnosCatalogo } from '../composables/useTurnosCatalogo';
import {
  useOperacionModulos,
  type VehiculoCatalogo,
} from '../composables/useOperacionModulos';

interface EmpleadoReasignar {
  id_empleado: string;
  nombre: string;
  fecha: string;
  turno?: string | null;
  asiento?: number | null;
}

interface RutaRegistro {
  id: string;
  ruta?: number | null;
  zona?: string | null;
  tipo_unidad?: string | null;
  turnos?: string[];
  unidad_por_turno?: Record<string, {
    vehiculo_id?: string | null;
    tipo?: string | null;
    codigo?: string | null;
    capacidad?: number | null;
  }>;
  activa: boolean;
  total_pasajeros: number;
  empleados_a_reasignar: EmpleadoReasignar[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const router = useRouter();
const { authHeaders } = useAuth();
const { dialogConfirm } = useDialog();
const { listarVehiculos, crearRuta, actualizarRuta } = useOperacionModulos();
const {
  turnosCatalogo,
  turnosAgrupados,
  etiquetaTurno: etiquetaTurnoCatalogo,
  cargarTurnos,
} = useTurnosCatalogo();

const rutas = ref<RutaRegistro[]>([]);
const vehiculosCatalogo = ref<VehiculoCatalogo[]>([]);
const cargando = ref(false);
const guardando = ref(false);
const exportando = ref(false);
const procesandoId = ref<string | null>(null);
const error = ref<string | null>(null);
const mensaje = ref<string | null>(null);
const terminoBusqueda = ref('');
const modalModo = ref<'nueva' | 'turnos' | 'unidades' | null>(null);
const modalBloqueoAbierto = ref(false);
const catalogoCargando = ref(false);
const rutaEnEdicion = ref<RutaRegistro | null>(null);
const errorModal = ref<string | null>(null);
const errorCatalogo = ref<string | null>(null);
const rutaSeleccionada = ref<RutaRegistro | null>(null);
const turnosSeleccionados = ref<string[]>([]);
const unidadPorTurno = reactive<Record<string, string>>({});

const form = reactive({
  ruta: null as number | null,
  zona: '',
  nombre: '',
});

const nombreSugerido = computed(() =>
  form.ruta ? `Ruta ${form.ruta}${form.zona ? ` - ${form.zona}` : ''}` : 'Ruta autogenerada',
);

const opcionesBusqueda = computed<AutocompleteOption[]>(() =>
  rutas.value.map((ruta) => ({
    value: String(ruta.id),
    label: `Ruta ${ruta.ruta ?? 'N/D'} — ${ruta.zona || 'Sin zona'}`,
    hint: ruta.turnos?.map(etiquetaTurno).join(', ') || undefined,
    keywords: `ruta ${ruta.ruta ?? ''} ${ruta.zona ?? ''} ${resumenUnidades(ruta)} ${ruta.id}`,
  })),
);

const rutasFiltradas = computed(() => {
  const termino = terminoBusqueda.value;
  if (!termino.trim()) return rutas.value;

  return rutas.value.filter((ruta) =>
    coincideBusqueda(
      termino,
      'ruta',
      ruta.ruta,
      ruta.zona,
      ruta.turnos?.join(' '),
      resumenUnidades(ruta),
      ruta.id,
    ),
  );
});

const turnosDeRuta = computed(() => {
  if (!rutaEnEdicion.value?.turnos?.length) return [];
  return [...rutaEnEdicion.value.turnos];
});

interface OcupacionUnidad {
  rutaId: string;
  rutaNumero: number | null;
  codigo?: string | null;
}

function normalizarTurnoId(turnoId: string) {
  return turnoId.trim().toLowerCase();
}

const ocupacionUnidades = computed(() => {
  const mapa = new Map<string, Map<string, OcupacionUnidad>>();
  const rutaActualId = rutaEnEdicion.value?.id;

  rutas.value.forEach((ruta) => {
    if (!ruta.activa || ruta.id === rutaActualId) return;

    const unidades = ruta.unidad_por_turno || {};
    Object.entries(unidades).forEach(([turnoId, unidad]) => {
      const vehId = unidad.vehiculo_id
        ? String(unidad.vehiculo_id)
        : resolverVehiculoId(unidad);
      if (!vehId) return;

      const turnoKey = normalizarTurnoId(turnoId);
      if (!mapa.has(turnoKey)) {
        mapa.set(turnoKey, new Map());
      }
      mapa.get(turnoKey)!.set(vehId, {
        rutaId: ruta.id,
        rutaNumero: ruta.ruta ?? null,
        codigo: unidad.codigo || null,
      });
    });
  });

  return mapa;
});

function etiquetaTurno(turnoId: string) {
  return etiquetaTurnoCatalogo(turnoId);
}

function tieneTurnos(ruta: RutaRegistro) {
  return Array.isArray(ruta.turnos) && ruta.turnos.length > 0;
}

function etiquetaTipoTurno(tipo?: string | null) {
  if (!tipo) return '';
  if (tipo === 'mixto') return 'Mixto';
  return tipo;
}

function diasTurno(turnoId: string) {
  const delCatalogo = turnosCatalogo.value.find((t) => t.id === turnoId);
  if (delCatalogo?.dia_nombre) return delCatalogo.dia_nombre;
  const id = turnoId.toLowerCase();
  if (id.startsWith('lun')) return 'Lunes';
  if (id.startsWith('mar')) return 'Martes';
  if (id.startsWith('mie')) return 'Miércoles';
  if (id.startsWith('jue')) return 'Jueves';
  if (id.startsWith('vie')) return 'Viernes';
  if (id.startsWith('sab')) return 'Sábado';
  if (id.startsWith('dom')) return 'Domingo';
  if (id.startsWith('mixto')) return 'Lun-Vie';
  return '—';
}

function etiquetaVehiculo(veh: VehiculoCatalogo) {
  const partes = [veh.codigo || veh.id];
  if (veh.tipo) partes.push(veh.tipo);
  if (veh.capacidad) partes.push(`${veh.capacidad} asientos`);
  return partes.join(' · ');
}

function unidadOcupadaEnTurno(turnoId: string, vehiculoId: string) {
  if (!vehiculoId) return null;
  return ocupacionUnidades.value.get(normalizarTurnoId(turnoId))?.get(vehiculoId) || null;
}

function opcionVehiculoDisponible(turnoId: string, vehiculoId: string) {
  if (unidadPorTurno[turnoId] === vehiculoId) return true;
  return !unidadOcupadaEnTurno(turnoId, vehiculoId);
}

function etiquetaVehiculoOpcion(turnoId: string, veh: VehiculoCatalogo) {
  const base = etiquetaVehiculo(veh);
  const ocupacion = unidadOcupadaEnTurno(turnoId, veh.id);
  if (ocupacion && unidadPorTurno[turnoId] !== veh.id) {
    return `${base} — Ocupada en Ruta ${ocupacion.rutaNumero ?? '?'}`;
  }
  return base;
}

function resolverVehiculoId(unidad?: { vehiculo_id?: string | null; codigo?: string | null }) {
  if (unidad?.vehiculo_id) return String(unidad.vehiculo_id);
  const codigo = unidad?.codigo ? String(unidad.codigo) : '';
  if (!codigo) return '';
  const veh = vehiculosCatalogo.value.find((v) => String(v.codigo || '') === codigo);
  return veh?.id || '';
}

function resumenUnidades(ruta: RutaRegistro) {
  const mapa = ruta.unidad_por_turno || {};
  const entradas = Object.entries(mapa);
  if (!entradas.length) return '';
  return entradas
    .map(([turnoId, unidad]) => {
      const etiqueta = unidad.codigo || unidad.tipo || 'unidad';
      return `${etiquetaTurno(turnoId)}: ${etiqueta}`;
    })
    .join(' · ');
}

function limpiarFormulario() {
  rutaEnEdicion.value = null;
  form.ruta = null;
  form.zona = '';
  form.nombre = '';
  turnosSeleccionados.value = [];
  Object.keys(unidadPorTurno).forEach((k) => delete unidadPorTurno[k]);
  errorModal.value = null;
  errorCatalogo.value = null;
  catalogoCargando.value = false;
}

function abrirNueva() {
  limpiarFormulario();
  modalModo.value = 'nueva';
}

function abrirEditarTurnos(ruta: RutaRegistro) {
  limpiarFormulario();
  rutaEnEdicion.value = ruta;
  turnosSeleccionados.value = Array.isArray(ruta.turnos) ? [...ruta.turnos] : [];
  modalModo.value = 'turnos';
}

async function abrirAsignarUnidades(ruta: RutaRegistro) {
  if (!tieneTurnos(ruta)) return;

  errorModal.value = null;
  errorCatalogo.value = null;
  Object.keys(unidadPorTurno).forEach((k) => delete unidadPorTurno[k]);

  rutaEnEdicion.value = ruta;

  const mapa = ruta.unidad_por_turno || {};
  ruta.turnos?.forEach((turnoId) => {
    unidadPorTurno[turnoId] = resolverVehiculoId(mapa[turnoId]);
  });

  modalModo.value = 'unidades';

  catalogoCargando.value = true;
  try {
    await cargarCatalogos();
  } catch (err: unknown) {
    errorCatalogo.value = err instanceof Error
      ? err.message
      : 'No se pudieron cargar turnos y vehículos.';
  } finally {
    catalogoCargando.value = false;
  }
}

function cerrarModal(forzar = false) {
  if (guardando.value && !forzar) return;
  modalModo.value = null;
  limpiarFormulario();
}

async function obtenerHeaders() {
  const headers = await authHeaders();
  if (!headers.Authorization) {
    throw new Error('No hay sesión activa.');
  }
  return { 'Content-Type': 'application/json', ...headers };
}

async function cargarCatalogos() {
  try {
    const [, vehiculosData] = await Promise.all([cargarTurnos(), listarVehiculos()]);
    vehiculosCatalogo.value = vehiculosData;
  } catch (err: unknown) {
    vehiculosCatalogo.value = [];
    throw err instanceof Error
      ? err
      : new Error('No se pudieron cargar turnos y vehículos.');
  }
}

async function cargarRutas() {
  cargando.value = true;
  error.value = null;

  try {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}/api/rutas/eliminacion`, {
        headers: await obtenerHeaders(),
      });
    } catch {
      throw new Error(
        `No se pudo conectar con el backend (${API_BASE_URL}). Verifica que esté corriendo con "npm run dev" en la carpeta backend.`,
      );
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || `No se pudieron cargar las rutas (HTTP ${response.status}).`);
    }

    rutas.value = Array.isArray(payload?.data)
      ? payload.data.map((ruta: Record<string, unknown>) => ({
        id: String(ruta.id || ''),
        ruta: ruta.ruta != null ? Number(ruta.ruta) : null,
        zona: ruta.zona ? String(ruta.zona) : null,
        tipo_unidad: ruta.tipo_unidad ? String(ruta.tipo_unidad) : null,
        turnos: Array.isArray(ruta.turnos) ? (ruta.turnos as string[]) : [],
        unidad_por_turno: (ruta.unidad_por_turno && typeof ruta.unidad_por_turno === 'object'
          ? ruta.unidad_por_turno
          : {}) as RutaRegistro['unidad_por_turno'],
        activa: ruta.activa !== false,
        total_pasajeros: Number(ruta.total_pasajeros) || 0,
        empleados_a_reasignar: Array.isArray(ruta.empleados_a_reasignar)
          ? (ruta.empleados_a_reasignar as EmpleadoReasignar[])
          : [],
      }))
      : [];
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Error cargando rutas.';
  } finally {
    cargando.value = false;
  }
}

async function guardarNuevaRuta() {
  errorModal.value = null;

  if (!form.ruta || form.ruta <= 0) {
    errorModal.value = 'Ingresa un número de ruta válido.';
    return;
  }
  if (!turnosSeleccionados.value.length) {
    errorModal.value = 'Selecciona al menos un turno.';
    return;
  }

  guardando.value = true;
  try {
    await crearRuta({
      ruta: form.ruta,
      zona: form.zona || null,
      nombre: form.nombre || null,
      turnos: [...turnosSeleccionados.value],
      unidad_por_turno: {},
    });
    mensaje.value = `Ruta ${form.ruta} creada. Asigna unidades con el botón Unidades.`;
    cerrarModal(true);
    await cargarRutas();
  } catch (err: unknown) {
    errorModal.value = err instanceof Error ? err.message : 'No se pudo crear la ruta.';
  } finally {
    guardando.value = false;
  }
}

async function guardarTurnos() {
  const ruta = rutaEnEdicion.value;
  if (!ruta) return;

  errorModal.value = null;
  if (!turnosSeleccionados.value.length) {
    errorModal.value = 'Selecciona al menos un turno.';
    return;
  }

  guardando.value = true;
  try {
    await actualizarRuta(ruta.id, {
      turnos: [...turnosSeleccionados.value],
    });
    mensaje.value = `Turnos de la ruta ${ruta.ruta} actualizados.`;
    cerrarModal(true);
    await cargarRutas();
  } catch (err: unknown) {
    errorModal.value = err instanceof Error ? err.message : 'No se pudieron guardar los turnos.';
  } finally {
    guardando.value = false;
  }
}

async function guardarUnidades() {
  const ruta = rutaEnEdicion.value;
  if (!ruta || !turnosDeRuta.value.length) return;

  errorModal.value = null;

  const sinAsignar = turnosDeRuta.value.filter((turnoId) => !unidadPorTurno[turnoId]);
  if (sinAsignar.length) {
    errorModal.value = 'Selecciona una unidad para cada turno de la ruta.';
    return;
  }

  for (const turnoId of turnosDeRuta.value) {
    const vehId = unidadPorTurno[turnoId];
    const conflicto = unidadOcupadaEnTurno(turnoId, vehId!);
    if (conflicto) {
      const veh = vehiculosCatalogo.value.find((v) => v.id === vehId);
      const codigo = veh?.codigo || conflicto.codigo || vehId;
      errorModal.value = `"${codigo}" ya está asignada al turno ${etiquetaTurno(turnoId)} en la Ruta ${conflicto.rutaNumero ?? '?'}.`;
      return;
    }
  }

  const unidadPayload: Record<string, { vehiculo_id: string }> = {};
  turnosDeRuta.value.forEach((turnoId) => {
    const vehiculoId = unidadPorTurno[turnoId];
    if (vehiculoId) {
      unidadPayload[turnoId] = { vehiculo_id: vehiculoId };
    }
  });

  guardando.value = true;
  try {
    await actualizarRuta(ruta.id, {
      unidad_por_turno: unidadPayload,
    });
    mensaje.value = `Unidades de la ruta ${ruta.ruta} actualizadas.`;
    cerrarModal(true);
    await cargarRutas();
  } catch (err: unknown) {
    errorModal.value = err instanceof Error ? err.message : 'No se pudieron guardar las unidades.';
  } finally {
    guardando.value = false;
  }
}

function cerrarModalBloqueo() {
  modalBloqueoAbierto.value = false;
  rutaSeleccionada.value = null;
}

function irAAsignaciones() {
  cerrarModalBloqueo();
  router.push('/admin/programacion-semanal');
}

async function intentarDeshabilitar(ruta: RutaRegistro) {
  if (ruta.total_pasajeros > 0) {
    rutaSeleccionada.value = ruta;
    modalBloqueoAbierto.value = true;
    return;
  }

  const confirmar = await dialogConfirm(
    `¿Deshabilitar la Ruta ${ruta.ruta}? Dejará de aparecer en asignaciones.`,
    { title: 'Deshabilitar ruta', confirmLabel: 'Deshabilitar' }
  );
  if (!confirmar) return;

  procesandoId.value = ruta.id;
  error.value = null;
  mensaje.value = null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/rutas/${encodeURIComponent(ruta.id)}`, {
      method: 'DELETE',
      headers: await obtenerHeaders(),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (Array.isArray(payload?.empleados_a_reasignar) && payload.empleados_a_reasignar.length) {
        rutaSeleccionada.value = {
          ...ruta,
          empleados_a_reasignar: payload.empleados_a_reasignar,
          total_pasajeros: payload.empleados_a_reasignar.length,
        };
        modalBloqueoAbierto.value = true;
      }
      throw new Error(payload?.message || 'No se pudo deshabilitar la ruta.');
    }
    mensaje.value = payload?.message || 'Ruta deshabilitada correctamente.';
    await cargarRutas();
  } catch (err: unknown) {
    if (!modalBloqueoAbierto.value) {
      error.value = err instanceof Error ? err.message : 'Error deshabilitando la ruta.';
    }
  } finally {
    procesandoId.value = null;
  }
}

async function habilitarRuta(ruta: RutaRegistro) {
  const confirmar = await dialogConfirm(`¿Habilitar nuevamente la Ruta ${ruta.ruta}?`, { title: 'Habilitar ruta', confirmLabel: 'Habilitar' });
  if (!confirmar) return;

  procesandoId.value = ruta.id;
  error.value = null;
  mensaje.value = null;

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/rutas/${encodeURIComponent(ruta.id)}/restaurar`,
      { method: 'POST', headers: await obtenerHeaders() },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || 'No se pudo habilitar la ruta.');
    }
    mensaje.value = payload?.message || 'Ruta habilitada correctamente.';
    await cargarRutas();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Error habilitando la ruta.';
  } finally {
    procesandoId.value = null;
  }
}

async function exportarExcel() {
  exportando.value = true;
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Rutas');
    ws.columns = [
      { header: 'Ruta', key: 'ruta', width: 10 },
      { header: 'Zona', key: 'zona', width: 24 },
      { header: 'Turnos', key: 'turnos', width: 28 },
      { header: 'Unidades', key: 'unidades', width: 36 },
      { header: 'Estado', key: 'estado', width: 14 },
    ];
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } };
    rutasFiltradas.value.forEach((ruta) => {
      ws.addRow({
        ruta: ruta.ruta ?? '',
        zona: ruta.zona || '',
        turnos: ruta.turnos?.map(etiquetaTurno).join(', ') || '',
        unidades: resumenUnidades(ruta),
        estado: ruta.activa ? 'Activa' : 'Deshabilitada',
      });
    });
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Rutas_ILPEA_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } finally {
    exportando.value = false;
  }
}

onMounted(async () => {
  try {
    await cargarCatalogos();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'No se pudieron cargar turnos y vehículos.';
  }
  await cargarRutas();
});
</script>

<style scoped>
.cell-turnos,
.cell-unidades {
  max-width: 220px;
  white-space: normal;
  line-height: 1.35;
  font-size: 0.82rem;
}

.crud-table {
  min-width: 780px;
}

.crud-actions {
  flex-direction: column;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: 0.3rem;
}

.crud-action-btn {
  padding: 0.3rem 0.6rem;
  font-size: 0.7rem;
  white-space: nowrap;
}

.crud-action-btn-wrap {
  display: inline-flex;
}

.crud-action-btn--inactive,
.crud-action-btn--edit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background: #f1f5f9;
  color: #94a3b8;
  border-color: #e2e8f0;
}

.crud-action-btn--inactive:hover,
.crud-action-btn--edit:disabled:hover {
  background: #f1f5f9;
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
}

.btn-export-tabla {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 1.1rem;
  border: none;
  border-radius: 8px;
  background: var(--ilpea-accent);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(16, 124, 65, 0.28);
  transition: background 0.18s, box-shadow 0.18s, transform 0.12s;
}

.btn-export-tabla:hover:not(:disabled) {
  background: #0d6636;
  box-shadow: 0 4px 14px rgba(16, 124, 65, 0.38);
  transform: translateY(-1px);
}

.btn-export-tabla:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(16, 124, 65, 0.2);
}

.btn-export-tabla:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ruta-modal {
  width: min(560px, 95vw);
}

.modal-intro {
  margin: 0 0 1rem;
  line-height: 1.45;
  font-size: 0.85rem;
}

.ruta-hint {
  margin: 0.75rem 0 0;
  font-size: 0.78rem;
  line-height: 1.4;
}

.ruta-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
  margin-bottom: 1rem;
}

.ruta-form-full {
  grid-column: 1 / -1;
}

.ruta-form-grid label,
.ruta-turnos-block {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #334155;
}

.ruta-form-grid input,
.turno-unit-select {
  font-weight: 400;
  border: 1px solid var(--ilpea-border);
  border-radius: 8px;
  padding: 0.65rem 0.8rem;
  font-size: 0.9rem;
  background: var(--ilpea-white);
  color: var(--ilpea-gray-900);
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.ruta-form-grid input:focus,
.turno-unit-select:focus {
  outline: none;
  border-color: var(--ilpea-accent);
  box-shadow: 0 0 0 3px rgba(16, 124, 65, 0.12);
}

.ruta-turnos-label {
  margin-bottom: 0.35rem;
}

.ruta-turnos-block {
  margin-bottom: 1rem;
}

.turno-grupo-dia {
  margin: 0.75rem 0 0.25rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.turno-grupo-dia:first-child {
  margin-top: 0;
}

.turno-edit-row {
  padding: 0.55rem 0;
  border-top: 1px solid #f1f5f9;
}

.turno-edit-row--compact {
  padding: 0.4rem 0;
}

.turno-check {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.1rem; /* Drives the em size of checkmark */
  font-weight: 500;
  color: #1e293b;
  cursor: pointer;
}

.turno-check-labels {
  display: flex;
  align-items: center;
  flex: 1;
  font-size: 0.9rem;
}

.turno-check small {
  color: #64748b;
  font-size: 0.72rem;
  margin-left: auto;
}

.turno-nombre-unidad {
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
}

.turno-dias-unidad {
  display: block;
  color: #64748b;
  font-size: 0.72rem;
  margin-bottom: 0.35rem;
}

.turno-unit-select {
  margin-top: 0.15rem;
  width: 100%;
}

.turno-unit-select option:disabled {
  color: #94a3b8;
}

.bloqueo-modal {
  width: min(760px, 95vw);
}

.bloqueo-intro {
  margin: 0 0 1rem;
  line-height: 1.5;
}

.bloqueo-tabla {
  max-height: 320px;
  margin-bottom: 1rem;
}

@media (max-width: 640px) {
  .ruta-form-grid {
    grid-template-columns: 1fr;
  }
}

/* Custom Checkbox */
.container input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.container {
  display: flex;
  position: relative;
  cursor: pointer;
  user-select: none;
}

.checkmark {
  --clr: var(--ilpea-accent, #0B6E4F);
  position: relative;
  top: 0;
  left: 0;
  height: 1.3em;
  width: 1.3em;
  background-color: #ccc;
  border-radius: 50%;
  transition: 300ms;
  flex-shrink: 0;
}

.container input:checked ~ .checkmark {
  background-color: var(--clr);
  border-radius: .5rem;
  animation: pulse 500ms ease-in-out;
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
}

.container input:checked ~ .checkmark:after {
  display: block;
}

.container .checkmark:after {
  left: 0.45em;
  top: 0.25em;
  width: 0.25em;
  height: 0.5em;
  border: solid #E0E0E2;
  border-width: 0 0.15em 0.15em 0;
  transform: rotate(45deg);
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 #0B6E4F90;
    rotate: 20deg;
  }
  50% {
    rotate: -20deg;
  }
  75% {
    box-shadow: 0 0 0 10px #0B6E4F60;
  }
  100% {
    box-shadow: 0 0 0 13px #0B6E4F30;
    rotate: 0;
  }
}
</style>
