<template>
  <section class="crud-page">
    <div class="crud-toolbar">
      <button type="button" class="crud-btn-new" @click="abrirNuevo">
        <AppIcon name="plus" :size="16" />
        <span>Nuevo empleado</span>
      </button>

      <div class="crud-search crud-search--autocomplete">
        <AppAutocomplete
          v-model="terminoBusqueda"
          variant="toolbar"
          mode="filter"
          :options="opcionesBusqueda"
          placeholder="Buscar por nombre, email o ID..."
        />
      </div>
    </div>

    <div v-if="mensaje || error || avisoCorreo || credencialesGeneradas" class="crud-alerts">
      <p v-if="mensaje" class="ui-alert ui-alert--success">{{ mensaje }}</p>
      <p v-if="error" class="ui-alert ui-alert--error">{{ error }}</p>
      <p v-if="avisoCorreo" :class="correoEnviado ? 'ui-alert ui-alert--success' : 'ui-alert ui-alert--warning'">
        {{ avisoCorreo }}
      </p>
      <div v-if="credencialesGeneradas" class="credenciales-box">
        <p><strong>ID Empleado:</strong> {{ credencialesGeneradas.id_empleado }}</p>
        <p><strong>Correo:</strong> {{ credencialesGeneradas.email }}</p>
        <p v-if="credencialesGeneradas.password_temporal">
          <strong>Contraseña temporal:</strong> {{ credencialesGeneradas.password_temporal }}
        </p>
        <p v-else-if="credencialesGeneradas.password_definida_manualmente" class="ui-muted">
          La contraseña es la que definiste al crear el usuario.
        </p>
        <p class="ui-muted">Guárdalas ahora. También se enviarán por correo en segundo plano.</p>
      </div>
    </div>

    <div class="tabla-header-row">
      <span class="tabla-label">Empleados registrados ({{ empleadosFiltrados.length }})</span>
      <v-tooltip text="Exportar lista de empleados a Excel" location="top">
        <template #activator="{ props }">
          <button
            v-bind="props"
            type="button"
            class="btn-export-tabla"
            :disabled="exportando || !empleadosFiltrados.length"
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
      <div v-if="cargando" class="crud-empty">Cargando empleados...</div>
      <div v-else-if="!empleadosFiltrados.length" class="crud-empty">
        {{ terminoBusqueda ? 'Sin resultados para la búsqueda.' : 'No hay empleados registrados.' }}
      </div>
      <div v-else class="crud-table-scroll">
        <table class="crud-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th v-if="esAdmin">Jefe</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="empleado in empleadosFiltrados" :key="empleado.uid">
              <td><span class="crud-id">{{ idVisual(empleado) }}</span></td>
              <td><span class="crud-name">{{ empleado.nombre }}</span></td>
              <td class="cell-email">{{ empleado.email }}</td>
              <td v-if="esAdmin" class="crud-muted">{{ nombreJefe(empleado.jefe_uid) }}</td>
              <td>
                <span v-if="empleado.activo !== false" class="crud-status-yes">
                  <AppIcon name="check" :size="12" />
                  Activo
                </span>
                <span v-else class="crud-status-no">Inactivo</span>
              </td>
              <td>
                <div class="crud-actions">
                  <button type="button" class="crud-action-btn crud-action-btn--edit" @click="editarEmpleado(empleado)">
                    <AppIcon name="pencil" :size="13" />
                    Editar
                  </button>
                  <button type="button" class="crud-action-btn crud-action-btn--delete" @click="eliminarEmpleado(empleado)">
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
        <form class="crud-modal" @submit.prevent="guardarEmpleado">
          <h3>{{ editandoUid ? 'Editar empleado' : 'Nuevo empleado' }}</h3>

          <p v-if="editandoUid" class="ui-muted">
            ID asignado: <strong>{{ form.id_empleado || 'Sin ID' }}</strong>
          </p>

          <label>
            Nombre
            <input v-model.trim="form.nombre" type="text" placeholder="Nombre completo" required />
          </label>

          <label>
            Email
            <input v-model.trim="form.email" type="email" placeholder="empleado@dominio.com" required />
          </label>

          <label v-if="esAdmin">
            Jefe responsable
            <select v-model="form.jefe_uid">
              <option value="">— Seleccionar jefe —</option>
              <option v-for="jefe in jefes" :key="jefe.uid" :value="jefe.uid">
                {{ jefe.nombre }}
              </option>
            </select>
          </label>

          <p v-if="!editandoUid && esAdmin" class="ui-muted">Selecciona el jefe responsable.</p>

          <p v-if="!editandoUid" class="ui-muted">
            El ID del empleado se generará automáticamente al crear la cuenta.
          </p>

          <label>
            Contraseña (opcional)
            <input
              v-model="form.password"
              type="password"
              :placeholder="editandoUid ? 'Dejar vacío para no cambiar' : 'Se genera automáticamente si se omite'"
            />
          </label>

          <p v-if="!editandoUid" class="ui-muted">
            Deja la contraseña vacía para generarla automáticamente y enviarla por correo.
          </p>

          <label v-if="editandoUid" class="crud-checkbox-row">
            <input v-model="form.activo" type="checkbox" />
            <span>Activo</span>
          </label>

          <p v-if="errorModal" class="ui-alert ui-alert--error">{{ errorModal }}</p>

          <div class="crud-modal-actions">
            <button class="crud-modal-btn-primary" type="submit" :disabled="guardando">
              {{ guardando ? 'Guardando...' : editandoUid ? 'Actualizar' : 'Crear' }}
            </button>
            <button class="crud-modal-btn-secondary" type="button" @click="cerrarModal">
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
import { useAuth } from '../composables/useAuth';
import { useDialog } from '../composables/useDialog';
import AppIcon from './ui/AppIcon.vue';
import AppAutocomplete, { type AutocompleteOption } from './ui/AppAutocomplete.vue';
import { coincideBusqueda } from '../utils/busqueda';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface Empleado {
  uid: string;
  id_empleado?: string;
  email: string;
  nombre: string;
  jefe_uid?: string | null;
  activo?: boolean;
}

interface Jefe {
  uid: string;
  email: string;
  nombre: string;
}

interface CredencialesGeneradas {
  id_empleado: string;
  email: string;
  password_temporal?: string | null;
  password_definida_manualmente?: boolean;
}

interface NotificacionEmail {
  enviado?: boolean;
  motivo?: string | null;
  detalle?: string | null;
  destinatario?: string | null;
}

const { authHeaders, obtenerRol, usuario } = useAuth();
const { dialogConfirm } = useDialog();
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const uidUsuarioActual = computed(() => usuario.value?.uid || '');
const esAdmin = computed(() => obtenerRol() === 'ADMIN');
const esJefe = computed(() => obtenerRol() === 'JEFE');

const empleados = ref<Empleado[]>([]);
const jefes = ref<Jefe[]>([]);
const cargando = ref(false);
const guardando = ref(false);
const error = ref<string | null>(null);
const errorModal = ref<string | null>(null);
const mensaje = ref<string | null>(null);
const avisoCorreo = ref<string | null>(null);
const correoEnviado = ref(false);
const editandoUid = ref<string | null>(null);
const credencialesGeneradas = ref<CredencialesGeneradas | null>(null);
const modalAbierto = ref(false);
const terminoBusqueda = ref('');

const opcionesBusqueda = computed<AutocompleteOption[]>(() =>
  empleados.value.map((empleado) => ({
    value: empleado.uid,
    label: empleado.nombre,
    hint: `${idVisual(empleado)} · ${empleado.email}`,
    keywords: `${empleado.nombre} ${empleado.email} ${empleado.id_empleado || ''} ${idVisual(empleado)}`,
  })),
);


const form = reactive({
  id_empleado: '',
  nombre: '',
  email: '',
  password: '',
  activo: true,
  jefe_uid: '',
});

const empleadosFiltrados = computed(() => {
  const termino = terminoBusqueda.value;
  if (!termino.trim()) {
    return empleados.value;
  }

  return empleados.value.filter((empleado) =>
    coincideBusqueda(
      termino,
      empleado.nombre,
      empleado.email,
      empleado.id_empleado,
      idVisual(empleado),
      empleado.uid,
    ),
  );
});

function idVisual(empleado: Empleado) {
  const idPersistido = String(empleado.id_empleado || '').trim();
  if (idPersistido) {
    return idPersistido.startsWith('#') ? idPersistido : `#${idPersistido}`;
  }
  return `#EMP-${empleado.uid.slice(-6).toUpperCase()}`;
}

function upsertEmpleadoEnTabla(empleado: Empleado) {
  empleados.value = [
    empleado,
    ...empleados.value.filter((actual) => actual.uid !== empleado.uid),
  ];
}

function limpiarFormulario() {
  editandoUid.value = null;
  form.id_empleado = '';
  form.nombre = '';
  form.email = '';
  form.password = '';
  form.activo = true;
  form.jefe_uid = esAdmin.value ? '' : uidUsuarioActual.value;
}

function abrirNuevo() {
  limpiarFormulario();
  credencialesGeneradas.value = null;
  avisoCorreo.value = null;
  correoEnviado.value = false;
  mensaje.value = null;
  error.value = null;
  errorModal.value = null;
  modalAbierto.value = true;
}

function cerrarModal() {
  modalAbierto.value = false;
  errorModal.value = null;
  limpiarFormulario();
}

function actualizarEstadoCorreo(notificacion?: NotificacionEmail | null) {
  if (!notificacion) {
    avisoCorreo.value = null;
    correoEnviado.value = false;
    return;
  }

  if (notificacion.motivo === 'ENVIO_EN_PROCESO') {
    avisoCorreo.value = null;
    correoEnviado.value = false;
    return;
  }

  correoEnviado.value = Boolean(notificacion.enviado);
  if (notificacion.enviado) {
    avisoCorreo.value = `Correo enviado a ${notificacion.destinatario || 'destinatario'}.`;
    return;
  }

  const detalle = notificacion.detalle ? ` ${notificacion.detalle}` : '';
  avisoCorreo.value = `No se pudo enviar el correo (${notificacion.motivo || 'DESCONOCIDO'}).${detalle}`;
}

async function obtenerHeaders() {
  const headers = await authHeaders();
  if (!headers.Authorization) {
    throw new Error('No hay sesión activa.');
  }
  return {
    'Content-Type': 'application/json',
    ...headers,
  };
}

async function cargarJefes() {
  if (!esAdmin.value) {
    return;
  }

  const response = await fetch(`${API_BASE_URL}/api/jefes`, {
    headers: await obtenerHeaders(),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || 'No se pudieron cargar los jefes.');
  }

  jefes.value = Array.isArray(payload?.data) ? payload.data : [];
}

async function cargarEmpleados() {
  cargando.value = true;
  error.value = null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/empleados`, {
      headers: await obtenerHeaders(),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || 'No se pudieron cargar los empleados.');
    }

    empleados.value = Array.isArray(payload?.data) ? payload.data : [];
  } catch (err: any) {
    error.value = err.message || 'Error cargando empleados.';
  } finally {
    cargando.value = false;
  }
}

function nombreJefe(uid?: string | null) {
  if (!uid) {
    return 'Sin asignar';
  }

  if (uid === uidUsuarioActual.value) {
    return esJefe.value ? 'Tú' : 'Asignado a ti';
  }

  return jefes.value.find((jefe) => jefe.uid === uid)?.nombre || uid;
}

function editarEmpleado(empleado: Empleado) {
  editandoUid.value = empleado.uid;
  credencialesGeneradas.value = null;
  form.id_empleado = empleado.id_empleado || '';
  form.nombre = empleado.nombre;
  form.email = empleado.email;
  form.password = '';
  form.activo = empleado.activo !== false;
  form.jefe_uid = empleado.jefe_uid || (esAdmin.value ? '' : uidUsuarioActual.value);
  avisoCorreo.value = null;
  correoEnviado.value = false;
  mensaje.value = null;
  error.value = null;
  errorModal.value = null;
  modalAbierto.value = true;
}

async function guardarEmpleado() {
  guardando.value = true;
  error.value = null;
  errorModal.value = null;
  mensaje.value = null;
  avisoCorreo.value = null;
  correoEnviado.value = false;
  credencialesGeneradas.value = null;

  try {
    if (!esAdmin.value && !uidUsuarioActual.value) {
      throw new Error('No se pudo identificar al jefe autenticado. Recarga la sesión e intenta nuevamente.');
    }

    if (esAdmin.value && !form.jefe_uid) {
      throw new Error('Selecciona un jefe responsable.');
    }

    const esEdicion = Boolean(editandoUid.value);
    const body: Record<string, unknown> = {
      nombre: form.nombre,
      email: form.email,
      activo: form.activo,
      jefe_uid: esAdmin.value ? form.jefe_uid : uidUsuarioActual.value,
    };

    if (form.password.trim()) {
      body.password = form.password;
    }

    const response = await fetch(
      esEdicion ? `${API_BASE_URL}/api/empleados/${editandoUid.value}` : `${API_BASE_URL}/api/empleados`,
      {
        method: esEdicion ? 'PUT' : 'POST',
        headers: await obtenerHeaders(),
        body: JSON.stringify(body),
      }
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || 'No se pudo guardar el empleado.');
    }

    mensaje.value = payload?.message || (esEdicion ? 'Empleado actualizado.' : 'Empleado creado.');

    if (!esEdicion) {
      const credenciales = payload?.credenciales_generadas;
      credencialesGeneradas.value = {
        id_empleado: credenciales?.id_empleado || payload?.usuario?.id_empleado || '',
        email: credenciales?.email || payload?.usuario?.email || form.email,
        password_temporal: credenciales?.password_temporal ?? null,
        password_definida_manualmente: Boolean(credenciales?.password_definida_manualmente),
      };
      actualizarEstadoCorreo(payload?.notificacion_email as NotificacionEmail | undefined);
    }

    if (payload?.usuario?.uid) {
      upsertEmpleadoEnTabla(payload.usuario as Empleado);
    }

    cerrarModal();
    await cargarEmpleados();
  } catch (err: any) {
    errorModal.value = err.message || 'Error guardando empleado.';
  } finally {
    guardando.value = false;
  }
}

async function eliminarEmpleado(empleado: Empleado) {
  const confirmar = await dialogConfirm(
    `¿Eliminar definitivamente a ${empleado.nombre}? Se borrará su cuenta y se liberarán sus asignaciones.`,
    { title: 'Eliminar empleado', confirmLabel: 'Eliminar' }
  );
  if (!confirmar) return;

  error.value = null;
  mensaje.value = null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/empleados/${empleado.uid}`, {
      method: 'DELETE',
      headers: await obtenerHeaders(),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || 'No se pudo eliminar el empleado.');
    }

    mensaje.value = payload?.message || 'Empleado eliminado definitivamente.';
    empleados.value = empleados.value.filter((item) => item.uid !== empleado.uid);
    await cargarEmpleados();
  } catch (err: any) {
    error.value = err.message || 'Error eliminando empleado.';
  }
}

const exportando = ref(false);

async function exportarExcel() {
  exportando.value = true;
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Empleados');
    ws.columns = [
      { header: 'ID', key: 'id', width: 16 },
      { header: 'Nombre', key: 'nombre', width: 28 },
      { header: 'Email', key: 'email', width: 34 },
      { header: 'Jefe', key: 'jefe', width: 24 },
      { header: 'Estado', key: 'estado', width: 12 },
    ];
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } };
    empleadosFiltrados.value.forEach((e) => {
      ws.addRow({
        id: idVisual(e),
        nombre: e.nombre,
        email: e.email,
        jefe: nombreJefe(e.jefe_uid),
        estado: e.activo !== false ? 'Activo' : 'Inactivo',
      });
    });
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Empleados_ILPEA_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } finally {
    exportando.value = false;
  }
}

onMounted(async () => {
  if (esAdmin.value) {
    await cargarJefes();
  }
  limpiarFormulario();
  await cargarEmpleados();
});
</script>

<style scoped>
.credenciales-box {
  padding: 0.85rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--ilpea-border);
  background: var(--ilpea-gray-100);
  font-size: 0.9rem;
}

.cell-email {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crud-table {
  min-width: 720px;
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
.btn-export-tabla:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
