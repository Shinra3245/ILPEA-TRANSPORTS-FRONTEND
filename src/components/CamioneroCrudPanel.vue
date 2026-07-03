<template>
  <section class="crud-page">
    <div class="crud-toolbar">
      <button type="button" class="crud-btn-new" @click="abrirNuevo">
        <AppIcon name="plus" :size="16" />
        <span>Nuevo camionero</span>
      </button>
      <div class="crud-search crud-search--autocomplete">
        <AppAutocomplete
          v-model="terminoBusqueda"
          variant="toolbar"
          mode="filter"
          :options="opcionesBusqueda"
          placeholder="Buscar por nombre, correo o ID..."
        />
      </div>
    </div>

    <div v-if="mensaje || error" class="crud-alerts">
      <p v-if="mensaje" class="ui-alert ui-alert--success">{{ mensaje }}</p>
      <p v-if="error" class="ui-alert ui-alert--error">{{ error }}</p>
    </div>

    <div class="crud-table-wrap">
      <div v-if="cargando" class="crud-empty">Cargando camioneros...</div>
      <div v-else-if="!camionerosFiltrados.length" class="crud-empty">
        {{ terminoBusqueda ? 'Sin resultados para la búsqueda.' : 'No hay camioneros registrados.' }}
      </div>
      <div v-else class="crud-table-scroll">
        <table class="crud-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Unidad / Turno</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="camionero in camionerosFiltrados" :key="camionero.uid">
              <td><span class="crud-id">{{ camionero.id_camionero || `CAM-${camionero.uid.slice(-6).toUpperCase()}` }}</span></td>
              <td>{{ camionero.nombre }}</td>
              <td>{{ camionero.email }}</td>
              <td>{{ asignacionTexto(camionero) }}</td>
              <td>
                <span v-if="camionero.activo !== false" class="crud-status-yes">
                  <AppIcon name="check" :size="12" />
                  Activo
                </span>
                <span v-else class="crud-status-no">Inactivo</span>
              </td>
              <td>
                <div class="crud-actions">
                  <button type="button" class="crud-action-btn crud-action-btn--edit" @click="editar(camionero)">
                    <AppIcon name="pencil" :size="13" />
                    Editar
                  </button>
                  <button type="button" class="crud-action-btn crud-action-btn--delete" @click="eliminar(camionero)">
                    <AppIcon name="trash-2" :size="13" />
                    Eliminar
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
        <form class="crud-modal" @submit.prevent="guardar">
          <h3>{{ editandoUid ? 'Editar camionero' : 'Nuevo camionero' }}</h3>

          <p v-if="!editandoUid" class="ui-muted">
            El ID del camionero se generará automáticamente al crear la cuenta.
          </p>

          <label>
            Nombre
            <input v-model.trim="form.nombre" type="text" placeholder="Nombre completo" required />
          </label>

          <label>
            Email
            <input v-model.trim="form.email" type="email" placeholder="camionero@dominio.com" required />
          </label>

          <label>
            Turno asignado
            <AppGroupedSelect
              v-model="form.turno_id"
              :groups="turnosOpcionesCamionero"
              placeholder="Sin asignar"
            >
              <template #optiongroup="{ option }">
                <div v-if="option.code" class="turno-grupo">
                  <span class="turno-grupo__badge">{{ abreviarDiaGrupo(option.code) }}</span>
                  <span>{{ option.label }}</span>
                </div>
                <span v-else>{{ option.label }}</span>
              </template>
            </AppGroupedSelect>
          </label>

          <label>
            Unidad asignada
            <select v-model="form.vehiculo_id">
              <option value="">Sin asignar</option>
              <option v-for="vehiculo in vehiculos" :key="vehiculo.id" :value="vehiculo.id">
                {{ vehiculo.codigo || vehiculo.id }}{{ vehiculo.tipo ? ` — ${vehiculo.tipo}` : '' }}
              </option>
            </select>
          </label>

          <label v-if="editandoUid">
            Contraseña (opcional)
            <input v-model="form.password" type="password" placeholder="Dejar vacío para no cambiar" />
          </label>

          <label v-if="editandoUid" class="crud-checkbox-row">
            <input v-model="form.activo" type="checkbox" />
            <span>Activo</span>
          </label>

          <div class="crud-modal-actions">
            <button class="crud-modal-btn-primary" type="submit" :disabled="guardando">
              {{ guardando ? 'Guardando...' : editandoUid ? 'Actualizar' : 'Crear' }}
            </button>
            <button class="crud-modal-btn-secondary" type="button" @click="cerrarModal">Cancelar</button>
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
import AppGroupedSelect from './ui/AppGroupedSelect.vue';
import { coincideBusqueda } from '../utils/busqueda';
import { useAuth } from '../composables/useAuth';
import { useDialog } from '../composables/useDialog';
import { useOperacionModulos } from '../composables/useOperacionModulos';
import { useTurnosCatalogo } from '../composables/useTurnosCatalogo';

interface AsignacionUnidadTurno {
  vehiculo_id: string;
  turno_id: string;
  vehiculo_codigo?: string | null;
  turno_nombre?: string | null;
}

interface Camionero {
  uid: string;
  id_camionero?: string;
  email: string;
  nombre: string;
  activo?: boolean;
  asignacion_unidad_turno?: AsignacionUnidadTurno | null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const { authHeaders } = useAuth();
const { dialogConfirm } = useDialog();
const { listarVehiculos } = useOperacionModulos();
const {
  turnosOpcionesConVacio,
  cargarTurnos,
  abreviarDiaGrupo,
} = useTurnosCatalogo();

const turnosOpcionesCamionero = computed(() => turnosOpcionesConVacio('Sin asignar'));

const camioneros = ref<Camionero[]>([]);
const vehiculos = ref<Awaited<ReturnType<typeof listarVehiculos>>>([]);
const terminoBusqueda = ref('');
const cargando = ref(false);
const guardando = ref(false);
const modalAbierto = ref(false);
const editandoUid = ref<string | null>(null);
const error = ref<string | null>(null);
const mensaje = ref<string | null>(null);

const form = reactive({
  nombre: '',
  email: '',
  password: '',
  vehiculo_id: '',
  turno_id: '',
  activo: true,
});

const opcionesBusqueda = computed<AutocompleteOption[]>(() =>
  camioneros.value.map((camionero) => ({
    value: camionero.uid,
    label: camionero.nombre,
    hint: `${camionero.id_camionero || 'CAM-SIN-ID'} · ${camionero.email}`,
    keywords: `${camionero.nombre} ${camionero.email} ${camionero.id_camionero || ''}`,
  })),
);

const camionerosFiltrados = computed(() => {
  if (!terminoBusqueda.value.trim()) {
    return camioneros.value;
  }
  return camioneros.value.filter((camionero) =>
    coincideBusqueda(terminoBusqueda.value, camionero.nombre, camionero.email, camionero.id_camionero),
  );
});

const asignacionTexto = (camionero: Camionero) => {
  const asignacion = camionero.asignacion_unidad_turno;
  if (!asignacion?.vehiculo_id || !asignacion?.turno_id) {
    return 'Sin asignar';
  }
  const unidad = asignacion.vehiculo_codigo || asignacion.vehiculo_id;
  const turno = asignacion.turno_nombre || asignacion.turno_id;
  return `${unidad} — ${turno}`;
};

async function obtenerHeaders() {
  const headers = await authHeaders();
  return {
    'Content-Type': 'application/json',
    ...headers,
  };
}

async function cargarCatalogos() {
  const [, vehiculosData] = await Promise.all([cargarTurnos(), listarVehiculos()]);
  vehiculos.value = vehiculosData;
}

async function cargarCamioneros() {
  cargando.value = true;
  error.value = null;
  try {
    const respuesta = await fetch(`${API_BASE_URL}/api/camioneros`, { headers: await authHeaders() });
    const payload = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok || payload?.success === false) {
      throw new Error(payload?.message || 'No se pudieron cargar los camioneros.');
    }
    camioneros.value = Array.isArray(payload?.data) ? payload.data : [];
  } catch (err: any) {
    error.value = err.message || 'No se pudieron cargar los camioneros.';
  } finally {
    cargando.value = false;
  }
}

function abrirNuevo() {
  editandoUid.value = null;
  form.nombre = '';
  form.email = '';
  form.password = '';
  form.vehiculo_id = '';
  form.turno_id = '';
  form.activo = true;
  modalAbierto.value = true;
  mensaje.value = null;
  error.value = null;
}

function editar(camionero: Camionero) {
  editandoUid.value = camionero.uid;
  form.nombre = camionero.nombre;
  form.email = camionero.email;
  form.password = '';
  form.vehiculo_id = camionero.asignacion_unidad_turno?.vehiculo_id || '';
  form.turno_id = camionero.asignacion_unidad_turno?.turno_id || '';
  form.activo = camionero.activo !== false;
  modalAbierto.value = true;
  mensaje.value = null;
  error.value = null;
}

function cerrarModal() {
  modalAbierto.value = false;
}

async function asignarUnidadTurno(camioneroUid: string) {
  const vehiculoId = form.vehiculo_id.trim();
  const turnoId = form.turno_id.trim();

  if ((vehiculoId && !turnoId) || (!vehiculoId && turnoId)) {
    throw new Error('Debes seleccionar unidad y turno juntos, o dejar ambos sin asignar.');
  }

  const respuesta = await fetch(
    `${API_BASE_URL}/api/camioneros/${encodeURIComponent(camioneroUid)}/asignar-unidad-turno`,
    {
      method: 'POST',
      headers: await obtenerHeaders(),
      body: JSON.stringify({
        vehiculo_id: vehiculoId || null,
        turno_id: turnoId || null,
      }),
    },
  );
  const payload = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || payload?.success === false) {
    throw new Error(payload?.message || 'No se pudo asignar la unidad y turno.');
  }
}

async function guardar() {
  guardando.value = true;
  error.value = null;
  mensaje.value = null;
  try {
    const body = {
      nombre: form.nombre,
      email: form.email,
      password: form.password || undefined,
      activo: form.activo,
      vehiculo_id: form.vehiculo_id || null,
      turno_id: form.turno_id || null,
    };

    const esEdicion = Boolean(editandoUid.value);
    const url = esEdicion ? `${API_BASE_URL}/api/camioneros/${editandoUid.value}` : `${API_BASE_URL}/api/camioneros`;
    const respuesta = await fetch(url, {
      method: esEdicion ? 'PUT' : 'POST',
      headers: await obtenerHeaders(),
      body: JSON.stringify(body),
    });
    const payload = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok || payload?.success === false) {
      throw new Error(payload?.message || 'No se pudo guardar el camionero.');
    }

    const camioneroUid = esEdicion
      ? String(editandoUid.value)
      : String(payload?.usuario?.uid || '');

    if (!esEdicion && camioneroUid && (form.vehiculo_id || form.turno_id)) {
      await asignarUnidadTurno(camioneroUid);
    }

    mensaje.value = payload?.message || 'Camionero guardado correctamente.';
    modalAbierto.value = false;
    await cargarCamioneros();
  } catch (err: any) {
    error.value = err.message || 'No se pudo guardar el camionero.';
  } finally {
    guardando.value = false;
  }
}

async function eliminar(camionero: Camionero) {
  const confirmar = await dialogConfirm(`¿Eliminar definitivamente a ${camionero.nombre}?`, { title: 'Eliminar camionero', confirmLabel: 'Eliminar' });
  if (!confirmar) return;
  error.value = null;
  mensaje.value = null;
  try {
    const respuesta = await fetch(`${API_BASE_URL}/api/camioneros/${camionero.uid}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    const payload = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok || payload?.success === false) {
      throw new Error(payload?.message || 'No se pudo eliminar el camionero.');
    }
    mensaje.value = payload?.message || 'Camionero eliminado correctamente.';
    await cargarCamioneros();
  } catch (err: any) {
    error.value = err.message || 'No se pudo eliminar el camionero.';
  }
}

onMounted(async () => {
  await Promise.all([cargarCatalogos(), cargarCamioneros()]);
});
</script>

<style scoped>
.turno-grupo { display: flex; align-items: center; gap: 0.5rem; }
.turno-grupo__badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 1.6rem; height: 1.6rem; border-radius: 6px;
  background: #e2e8f0; color: #334155; font-size: 0.72rem; font-weight: 700;
}
</style>
