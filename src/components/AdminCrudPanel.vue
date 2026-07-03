<template>
  <section class="crud-page">
    <div class="crud-toolbar">
      <button type="button" class="crud-btn-new" @click="abrirNuevo">
        <AppIcon name="plus" :size="16" />
        <span>Nuevo admin</span>
      </button>

      <div class="crud-search crud-search--autocomplete">
        <AppAutocomplete
          v-model="terminoBusqueda"
          variant="toolbar"
          mode="filter"
          :options="opcionesBusqueda"
          placeholder="Buscar por nombre o email..."
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
      <span class="tabla-label">Administradores registrados ({{ adminsFiltrados.length }})</span>
      <v-tooltip text="Exportar lista de administradores a Excel" location="top">
        <template #activator="{ props }">
          <button
            v-bind="props"
            type="button"
            class="btn-export-tabla"
            :disabled="exportando || !adminsFiltrados.length"
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
      <div v-if="cargando" class="crud-empty">Cargando administradores...</div>
      <div v-else-if="!adminsFiltrados.length" class="crud-empty">
        {{ terminoBusqueda ? 'Sin resultados para la búsqueda.' : 'No hay administradores registrados.' }}
      </div>
      <div v-else class="crud-table-scroll">
        <table class="crud-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="adminItem in adminsFiltrados" :key="adminItem.uid">
              <td><span class="crud-id">{{ idVisual(adminItem) }}</span></td>
              <td><span class="crud-name">{{ adminItem.nombre }}</span></td>
              <td>{{ adminItem.email }}</td>
              <td>
                <span v-if="adminItem.activo !== false" class="crud-status-yes">
                  <AppIcon name="check" :size="12" />
                  Activo
                </span>
                <span v-else class="crud-status-no">Inactivo</span>
              </td>
              <td>
                <div class="crud-actions">
                  <button type="button" class="crud-action-btn crud-action-btn--edit" @click="editarAdmin(adminItem)">
                    <AppIcon name="pencil" :size="13" />
                    Editar
                  </button>
                  <button
                    type="button"
                    class="crud-action-btn crud-action-btn--delete"
                    :disabled="adminItem.uid === uidSesion"
                    @click="eliminarAdmin(adminItem)"
                  >
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
        <form class="crud-modal" @submit.prevent="guardarAdmin">
          <h3>{{ editandoUid ? 'Editar admin' : 'Nuevo admin' }}</h3>

          <label>
            Nombre
            <input v-model.trim="form.nombre" type="text" placeholder="Nombre completo" required />
          </label>

          <label>
            Email
            <input v-model.trim="form.email" type="email" placeholder="admin@dominio.com" required />
          </label>

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

          <label v-if="editandoUid && editandoUid !== uidSesion" class="crud-checkbox-row">
            <input v-model="form.activo" type="checkbox" />
            <span>Activo</span>
          </label>

          <p v-if="editandoUid === uidSesion" class="ui-muted">
            No puedes desactivar tu propia cuenta desde aquí.
          </p>

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

interface AdminUsuario {
  uid: string;
  email: string;
  nombre: string;
  activo?: boolean;
}

interface CredencialesGeneradas {
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

const { authHeaders, obtenerUsuario } = useAuth();
const { dialogConfirm } = useDialog();
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const admins = ref<AdminUsuario[]>([]);
const uidSesion = ref<string | null>(null);
const cargando = ref(false);
const guardando = ref(false);
const error = ref<string | null>(null);
const mensaje = ref<string | null>(null);
const avisoCorreo = ref<string | null>(null);
const correoEnviado = ref(false);
const credencialesGeneradas = ref<CredencialesGeneradas | null>(null);
const editandoUid = ref<string | null>(null);
const modalAbierto = ref(false);
const terminoBusqueda = ref('');

const opcionesBusqueda = computed<AutocompleteOption[]>(() =>
  admins.value.map((adminItem) => ({
    value: adminItem.uid,
    label: adminItem.nombre,
    hint: adminItem.email,
    keywords: `${adminItem.nombre} ${adminItem.email} ${idVisual(adminItem)}`,
  })),
);

const form = reactive({
  nombre: '',
  email: '',
  password: '',
  activo: true,
});

const adminsFiltrados = computed(() => {
  const termino = terminoBusqueda.value;
  if (!termino.trim()) {
    return admins.value;
  }

  return admins.value.filter((adminItem) =>
    coincideBusqueda(termino, adminItem.nombre, adminItem.email, idVisual(adminItem), adminItem.uid),
  );
});

function idVisual(adminItem: AdminUsuario) {
  return `#${adminItem.uid.slice(-6).toUpperCase()}`;
}

function limpiarFormulario() {
  editandoUid.value = null;
  form.nombre = '';
  form.email = '';
  form.password = '';
  form.activo = true;
}

function abrirNuevo() {
  limpiarFormulario();
  credencialesGeneradas.value = null;
  avisoCorreo.value = null;
  correoEnviado.value = false;
  mensaje.value = null;
  error.value = null;
  modalAbierto.value = true;
}

function cerrarModal() {
  modalAbierto.value = false;
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

async function cargarAdmins() {
  cargando.value = true;
  error.value = null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/admins`, {
      headers: await obtenerHeaders(),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || 'No se pudieron cargar los administradores.');
    }

    admins.value = Array.isArray(payload?.data) ? payload.data : [];
  } catch (err: any) {
    error.value = err.message || 'Error cargando administradores.';
  } finally {
    cargando.value = false;
  }
}

function editarAdmin(adminItem: AdminUsuario) {
  editandoUid.value = adminItem.uid;
  form.nombre = adminItem.nombre;
  form.email = adminItem.email;
  form.password = '';
  form.activo = adminItem.activo !== false;
  credencialesGeneradas.value = null;
  avisoCorreo.value = null;
  correoEnviado.value = false;
  mensaje.value = null;
  error.value = null;
  modalAbierto.value = true;
}

async function guardarAdmin() {
  guardando.value = true;
  error.value = null;
  mensaje.value = null;
  avisoCorreo.value = null;
  correoEnviado.value = false;
  credencialesGeneradas.value = null;

  try {
    const esEdicion = Boolean(editandoUid.value);
    const body: Record<string, unknown> = {
      nombre: form.nombre,
      email: form.email,
      activo: form.activo,
    };

    if (form.password.trim()) {
      body.password = form.password;
    }

    const response = await fetch(
      esEdicion ? `${API_BASE_URL}/api/admins/${editandoUid.value}` : `${API_BASE_URL}/api/admins`,
      {
        method: esEdicion ? 'PUT' : 'POST',
        headers: await obtenerHeaders(),
        body: JSON.stringify(body),
      }
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || 'No se pudo guardar el administrador.');
    }

    mensaje.value = payload?.message || (esEdicion ? 'Administrador actualizado.' : 'Administrador creado.');
    cerrarModal();
    await cargarAdmins();

    if (!esEdicion) {
      const credenciales = payload?.credenciales_generadas;
      credencialesGeneradas.value = {
        email: credenciales?.email || payload?.usuario?.email || form.email,
        password_temporal: credenciales?.password_temporal ?? null,
        password_definida_manualmente: Boolean(credenciales?.password_definida_manualmente),
      };
      actualizarEstadoCorreo(payload?.notificacion_email as NotificacionEmail | undefined);
    }
  } catch (err: any) {
    error.value = err.message || 'Error guardando administrador.';
  } finally {
    guardando.value = false;
  }
}

async function eliminarAdmin(adminItem: AdminUsuario) {
  if (adminItem.uid === uidSesion.value) {
    error.value = 'No puedes eliminar tu propia cuenta de administrador.';
    return;
  }

  const confirmar = await dialogConfirm(
    `¿Eliminar definitivamente a ${adminItem.nombre}? Se borrará su cuenta y no podrá recuperarse.`,
    { title: 'Eliminar administrador', confirmLabel: 'Eliminar' }
  );
  if (!confirmar) return;

  error.value = null;
  mensaje.value = null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/admins/${adminItem.uid}`, {
      method: 'DELETE',
      headers: await obtenerHeaders(),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || 'No se pudo eliminar el administrador.');
    }

    mensaje.value = payload?.message || 'Administrador eliminado definitivamente.';
    admins.value = admins.value.filter((item) => item.uid !== adminItem.uid);
    await cargarAdmins();
  } catch (err: any) {
    error.value = err.message || 'Error eliminando administrador.';
  }
}

const exportando = ref(false);

async function exportarExcel() {
  exportando.value = true;
  try {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Administradores');

    ws.columns = [
      { header: 'ID', key: 'id', width: 14 },
      { header: 'Nombre', key: 'nombre', width: 28 },
      { header: 'Email', key: 'email', width: 34 },
      { header: 'Estado', key: 'estado', width: 12 },
    ];

    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } };

    adminsFiltrados.value.forEach((adminItem) => {
      ws.addRow({
        id: idVisual(adminItem),
        nombre: adminItem.nombre,
        email: adminItem.email,
        estado: adminItem.activo !== false ? 'Activo' : 'Inactivo',
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Admins_ILPEA_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } finally {
    exportando.value = false;
  }
}

onMounted(async () => {
  uidSesion.value = obtenerUsuario()?.uid || null;
  await cargarAdmins();
});
</script>

<style scoped>
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

.credenciales-box {
  padding: 0.85rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--ilpea-border);
  background: var(--ilpea-gray-100);
  font-size: 0.9rem;
}
</style>
