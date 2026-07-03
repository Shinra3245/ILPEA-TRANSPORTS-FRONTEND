<template>
  <section class="crud-page">
    <div class="crud-toolbar">
      <button type="button" class="crud-btn-new" @click="abrirNuevo">
        <AppIcon name="plus" :size="16" />
        <span>Nueva unidad</span>
      </button>

      <div class="crud-search crud-search--autocomplete">
        <AppAutocomplete
          v-model="terminoBusqueda"
          variant="toolbar"
          mode="filter"
          :options="opcionesBusqueda"
          placeholder="Buscar por código, tipo o placas..."
        />
      </div>
    </div>

    <div v-if="mensaje || error" class="crud-alerts">
      <p v-if="mensaje" class="ui-alert ui-alert--success">{{ mensaje }}</p>
      <p v-if="error" class="ui-alert ui-alert--error">{{ error }}</p>
    </div>

    <div class="tabla-header-row">
      <span class="tabla-label">Unidades del catálogo ({{ unidadesFiltradas.length }})</span>
    </div>

    <div class="crud-table-wrap">
      <div v-if="cargando" class="crud-empty">Cargando unidades...</div>
      <div v-else-if="!unidadesFiltradas.length" class="crud-empty">
        {{ terminoBusqueda ? 'Sin resultados para la búsqueda.' : 'No hay unidades en el catálogo. Crea una con «Nueva unidad».' }}
      </div>
      <div v-else class="crud-table-scroll">
        <table class="crud-table unidades-tabla">
          <thead>
            <tr>
              <th>Ruta</th>
              <th>Tipo de unidad</th>
              <th>Asientos</th>
              <th>Código</th>
              <th>Placas</th>
              <th>Rutas en uso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="unidad in unidadesFiltradas" :key="unidad.id">
              <td>{{ unidad.ruta_numero ?? '—' }}</td>
              <td><span class="crud-name">{{ etiquetaTipo(unidad.tipo) }}</span></td>
              <td>{{ unidad.capacidad ?? '—' }}</td>
              <td><span class="crud-id">{{ unidad.codigo || unidad.id }}</span></td>
              <td class="crud-muted">{{ unidad.placas || '—' }}</td>
              <td>{{ conteoRutasPorUnidad(unidad.id) }}</td>
              <td>
                <div class="crud-actions">
                  <button type="button" class="crud-action-btn crud-action-btn--edit" @click="editarUnidad(unidad)">
                    <AppIcon name="pencil" :size="13" />
                    Editar
                  </button>
                  <button type="button" class="crud-action-btn crud-action-btn--delete" @click="deshabilitarUnidad(unidad)">
                    <AppIcon name="trash-2" :size="13" />
                    Deshabilitar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="modalAbierto" class="crud-modal-overlay" @click.self="cerrarModal">
        <form class="crud-modal unidad-modal" @submit.prevent="guardarUnidad">
          <h3>{{ editandoId ? 'Editar unidad' : 'Nueva unidad' }}</h3>

          <p v-if="!editandoId" class="ui-muted">
            El identificador de la unidad se genera automáticamente a partir del código.
          </p>

          <label v-if="editandoId">
            Identificador
            <input :value="editandoId" type="text" disabled readonly />
          </label>

          <label>
            Código
            <input v-model.trim="form.codigo" type="text" placeholder="Ej. E0234" required />
          </label>

          <label>
            Tipo de unidad
            <select v-model="form.tipo" required>
              <option value="AUTOBUS">CAMION (AUTOBUS)</option>
              <option value="VAN">VAN</option>
              <option value="SPRINTER">SPRINTER</option>
            </select>
          </label>

          <label>
            Asientos
            <input v-model.number="form.capacidad" type="number" min="1" max="60" required />
          </label>

          <label>
            Ruta asociada (opcional)
            <input v-model.number="form.ruta_numero" type="number" min="1" max="99" placeholder="Ej. 3" />
          </label>

          <label>
            Placas (opcional)
            <input v-model.trim="form.placas" type="text" placeholder="Ej. ABC-123-D" />
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
import { coincideBusqueda } from '../utils/busqueda';
import { useAuth } from '../composables/useAuth';
import { useDialog } from '../composables/useDialog';
import {
  useOperacionModulos,
  type VehiculoCatalogo,
} from '../composables/useOperacionModulos';

interface RutaResumen {
  id: string;
  activa?: boolean;
  unidad_por_turno?: Record<string, { vehiculo_id?: string | null }>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const { authHeaders } = useAuth();
const { dialogConfirm } = useDialog();
const {
  listarVehiculos,
  crearUnidad,
  actualizarUnidad,
  eliminarUnidad,
} = useOperacionModulos();

const unidades = ref<VehiculoCatalogo[]>([]);
const rutas = ref<RutaResumen[]>([]);
const cargando = ref(false);
const guardando = ref(false);
const error = ref<string | null>(null);
const mensaje = ref<string | null>(null);
const errorModal = ref<string | null>(null);
const terminoBusqueda = ref('');
const modalAbierto = ref(false);
const editandoId = ref<string | null>(null);

const form = reactive({
  codigo: '',
  tipo: 'VAN',
  capacidad: 12,
  ruta_numero: null as number | null,
  placas: '',
});

const opcionesBusqueda = computed<AutocompleteOption[]>(() =>
  unidades.value.map((unidad) => ({
    value: unidad.id,
    label: `${unidad.codigo || unidad.id} — ${etiquetaTipo(unidad.tipo)}`,
    hint: unidad.ruta_numero ? `Ruta ${unidad.ruta_numero}` : undefined,
    keywords: `${unidad.id} ${unidad.codigo} ${unidad.tipo} ${unidad.placas} ${unidad.ruta_numero}`,
  })),
);

const unidadesFiltradas = computed(() => {
  const termino = terminoBusqueda.value;
  const lista = [...unidades.value].sort((a, b) => {
    const rutaA = Number(a.ruta_numero) || 999;
    const rutaB = Number(b.ruta_numero) || 999;
    if (rutaA !== rutaB) return rutaA - rutaB;
    return String(a.codigo || a.id).localeCompare(String(b.codigo || b.id), 'es');
  });

  if (!termino.trim()) return lista;

  return lista.filter((unidad) =>
    coincideBusqueda(
      termino,
      unidad.id,
      unidad.codigo,
      unidad.tipo,
      unidad.placas,
      unidad.ruta_numero,
      etiquetaTipo(unidad.tipo),
    ),
  );
});

const conteoRutasMapa = computed(() => {
  const mapa = new Map<string, number>();

  rutas.value.forEach((ruta) => {
    if (ruta.activa === false) return;
    const unidadesRuta = ruta.unidad_por_turno || {};
    const idsUsados = new Set<string>();

    Object.values(unidadesRuta).forEach((unidad) => {
      const id = unidad.vehiculo_id ? String(unidad.vehiculo_id) : '';
      if (id) idsUsados.add(id);
    });

    idsUsados.forEach((id) => {
      mapa.set(id, (mapa.get(id) || 0) + 1);
    });
  });

  return mapa;
});

function conteoRutasPorUnidad(vehiculoId: string) {
  return conteoRutasMapa.value.get(vehiculoId) || 0;
}

function etiquetaTipo(tipo?: string | null) {
  if (tipo === 'AUTOBUS') return 'CAMION';
  if (tipo === 'VAN') return 'VAN';
  if (tipo === 'SPRINTER') return 'SPRINTER';
  return tipo || '—';
}

function limpiarAlertas() {
  error.value = null;
  mensaje.value = null;
}

function generarCodigoUnidad() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const nums = Math.floor(1000 + Math.random() * 9000); // 1000 - 9999
  return `${letter}${nums}`;
}

function resetForm() {
  form.codigo = generarCodigoUnidad();
  form.tipo = 'VAN';
  form.capacidad = 12;
  form.ruta_numero = null;
  form.placas = '';
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
      activa: item.activa !== false,
      unidad_por_turno: item.unidad_por_turno && typeof item.unidad_por_turno === 'object'
        ? item.unidad_por_turno as RutaResumen['unidad_por_turno']
        : {},
    }));
  } catch {
    // Conteo opcional.
  }
}

async function cargarUnidades() {
  cargando.value = true;
  limpiarAlertas();
  try {
    unidades.value = await listarVehiculos();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar el catálogo de unidades.';
  } finally {
    cargando.value = false;
  }
}

async function recargar() {
  await Promise.all([cargarUnidades(), cargarRutas()]);
}

function abrirNuevo() {
  editandoId.value = null;
  resetForm();
  errorModal.value = null;
  modalAbierto.value = true;
}

function editarUnidad(unidad: VehiculoCatalogo) {
  editandoId.value = unidad.id;
  form.codigo = unidad.codigo || '';
  form.tipo = unidad.tipo || 'VAN';
  form.capacidad = unidad.capacidad ?? 12;
  form.ruta_numero = unidad.ruta_numero ?? null;
  form.placas = unidad.placas || '';
  errorModal.value = null;
  modalAbierto.value = true;
}

function cerrarModal() {
  if (guardando.value) return;
  modalAbierto.value = false;
  editandoId.value = null;
  errorModal.value = null;
}

async function guardarUnidad() {
  guardando.value = true;
  errorModal.value = null;
  try {
    if (editandoId.value) {
      await actualizarUnidad(editandoId.value, {
        codigo: form.codigo,
        tipo: form.tipo,
        capacidad: form.capacidad,
        ruta_numero: form.ruta_numero,
        placas: form.placas || null,
      });
      mensaje.value = 'Unidad actualizada correctamente.';
    } else {
      await crearUnidad({
        codigo: form.codigo,
        tipo: form.tipo,
        capacidad: form.capacidad,
        ruta_numero: form.ruta_numero,
        placas: form.placas || null,
      });
      mensaje.value = 'Unidad creada correctamente.';
    }

    cerrarModal();
    await recargar();
  } catch (err) {
    errorModal.value = err instanceof Error ? err.message : 'No se pudo guardar la unidad.';
  } finally {
    guardando.value = false;
  }
}

async function deshabilitarUnidad(unidad: VehiculoCatalogo) {
  const rutasUsando = conteoRutasPorUnidad(unidad.id);
  if (rutasUsando > 0) {
    error.value = `No se puede deshabilitar: ${rutasUsando} ruta(s) activa(s) usan "${unidad.codigo || unidad.id}".`;
    return;
  }

  if (!await dialogConfirm(`¿Deshabilitar la unidad "${unidad.codigo || unidad.id}"?`, { title: 'Deshabilitar unidad', confirmLabel: 'Deshabilitar' })) {
    return;
  }

  limpiarAlertas();
  try {
    await eliminarUnidad(unidad.id);
    mensaje.value = 'Unidad deshabilitada correctamente.';
    await recargar();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo deshabilitar la unidad.';
  }
}

onMounted(() => {
  recargar();
});
</script>

<style scoped>
.unidades-tabla th:nth-child(1),
.unidades-tabla td:nth-child(1),
.unidades-tabla th:nth-child(3),
.unidades-tabla td:nth-child(3) {
  text-align: center;
}

.unidad-modal {
  width: min(480px, 95vw);
}
</style>
