<template>
  <div :class="esAdmin || esJefe ? 'admin-layout' : ''">
    <AdminSidebar v-if="esAdmin" />
    <JefeSidebar v-else-if="esJefe" />

    <main class="page" :class="{ 'with-sidebar': esAdmin || esJefe }">
      <header class="page-header">
        <div>
          <h2>Control de abordajes</h2>
          <p>Consulta el manifiesto del día y registra el pase de lista por empleado.</p>
        </div>
        <AppInfoButton title="Control de Abordajes">
          <p>Módulo para gestionar la <strong>asistencia diaria</strong> de empleados a sus rutas de transporte.</p>
          <ul>
            <li><strong>Filtros:</strong> selecciona fecha, turno y ruta para cargar el manifiesto del día.</li>
            <li><strong>Manifiesto:</strong> lista de empleados asignados a esa ruta/turno con su asiento.</li>
            <li><strong>Pase de lista:</strong> marca cada empleado como abordó, falta o tardanza.</li>
            <li><strong>Estado:</strong> el sistema registra la hora de confirmación de cada abordaje.</li>
          </ul>
          <p>Los datos de abordaje alimentan las métricas diarias de ocupación real.</p>
        </AppInfoButton>
      </header>

      <section class="card filtros">
        <label>
          Fecha
          <input v-model="filtros.fecha" type="date" class="input" />
        </label>

        <label class="filtro-dropdown">
          Turno
          <AppGroupedSelect
            v-model="filtros.turno"
            :groups="turnosOpcionesFiltro"
            placeholder="Sin turno específico"
          >
            <template #optiongroup="{ option }">
              <div v-if="option.code" class="dia-grupo">
                <span class="dia-grupo__badge">{{ abreviarDiaGrupo(option.code) }}</span>
                <span>{{ option.label }}</span>
              </div>
              <span v-else>{{ option.label }}</span>
            </template>
          </AppGroupedSelect>
        </label>

        <label>
          Ruta
          <select v-model="filtros.rutaId" class="input">
            <option value="">Selecciona ruta</option>
            <option v-for="ruta in rutas" :key="ruta.id" :value="ruta.id">
              Ruta {{ ruta.ruta }} — {{ ruta.zona || ruta.nombre || 'Sin nombre' }}
            </option>
          </select>
        </label>

        <button class="btn" :disabled="cargando" @click="cargarManifiesto">
          {{ cargando ? 'Cargando...' : 'Consultar' }}
        </button>
      </section>

      <p v-if="error" class="status error">{{ error }}</p>
      <p v-if="mensaje" class="status ok">{{ mensaje }}</p>

      <section v-if="manifiesto" class="card">
        <div class="resumen">
          <p><strong>Programación:</strong> {{ manifiesto.programacion_id }}</p>
          <p><strong>Capacidad:</strong> {{ manifiesto.capacidad_limite || 'N/D' }}</p>
          <p><strong>Asignados:</strong> {{ manifiesto.total_asignados }}</p>
          <p><strong>Abordados:</strong> {{ manifiesto.total_abordados }}</p>
        </div>

        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Asiento</th>
                <th>Parada</th>
                <th>Abordó</th>
                <th>Hora</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in manifiesto.manifiesto" :key="item.id_empleado">
                <td>{{ item.id_empleado }} — {{ item.nombre }}</td>
                <td>{{ item.asiento ?? '—' }}</td>
                <td>{{ item.parada_id || '—' }}</td>
                <td>
                  <input
                    type="checkbox"
                    :checked="item.abordo"
                    @change="onToggleAbordaje(item, ($event.target as HTMLInputElement).checked)"
                  />
                </td>
                <td>{{ formatearHora(item.hora_abordaje) }}</td>
                <td>
                  <button class="btn btn-mini" :disabled="guardandoId === item.id_empleado" @click="guardarAbordaje(item)">
                    {{ guardandoId === item.id_empleado ? 'Guardando...' : 'Guardar' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else class="card">
        <p class="muted">No hay manifiesto para los filtros seleccionados.</p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import AdminSidebar from '../components/layout/AdminSidebar.vue';
import JefeSidebar from '../components/layout/JefeSidebar.vue';
import AppInfoButton from '../components/ui/AppInfoButton.vue';
import AppGroupedSelect from '../components/ui/AppGroupedSelect.vue';
import { useAuth } from '../composables/useAuth';
import { useTurnosCatalogo } from '../composables/useTurnosCatalogo';
import { useOperacionModulos, type AbordajeItem } from '../composables/useOperacionModulos';

interface RutaOption {
  id: string;
  ruta: number;
  nombre?: string;
  zona?: string;
}

const { obtenerRol, authHeaders } = useAuth();
const esAdmin = obtenerRol() === 'ADMIN';
const esJefe = obtenerRol() === 'JEFE';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const { obtenerManifiestoAbordajes, registrarAbordaje } = useOperacionModulos();
const {
  turnosOpcionesConVacio,
  cargarTurnos,
  abreviarDiaGrupo,
} = useTurnosCatalogo();

const turnosOpcionesFiltro = computed(() => turnosOpcionesConVacio('Sin turno específico'));

const rutas = ref<RutaOption[]>([]);
const cargando = ref(false);
const guardandoId = ref<string | null>(null);
const error = ref('');
const mensaje = ref('');
const manifiesto = ref<any | null>(null);
const cambiosPendientes = ref<Record<string, boolean>>({});

const filtros = ref({
  fecha: new Date().toISOString().slice(0, 10),
  turno: '',
  rutaId: '',
});

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
    nombre: ruta.nombre ? String(ruta.nombre) : undefined,
    zona: ruta.zona ? String(ruta.zona) : undefined,
  }));
}

async function cargarManifiesto() {
  if (!filtros.value.rutaId) {
    error.value = 'Selecciona una ruta para consultar abordajes.';
    return;
  }

  cargando.value = true;
  error.value = '';
  mensaje.value = '';

  try {
    const data = await obtenerManifiestoAbordajes({
      fecha: filtros.value.fecha,
      id_ruta: filtros.value.rutaId,
      turno: filtros.value.turno || null,
    });

    manifiesto.value = data;
    cambiosPendientes.value = {};
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'No se pudieron consultar abordajes.';
    manifiesto.value = null;
  } finally {
    cargando.value = false;
  }
}

function onToggleAbordaje(item: AbordajeItem, checked: boolean) {
  cambiosPendientes.value[item.id_empleado] = checked;
}

async function guardarAbordaje(item: AbordajeItem) {
  const abordo = cambiosPendientes.value[item.id_empleado] ?? item.abordo;
  guardandoId.value = item.id_empleado;
  error.value = '';
  mensaje.value = '';

  try {
    await registrarAbordaje({
      fecha: filtros.value.fecha,
      id_ruta: filtros.value.rutaId,
      turno: filtros.value.turno || null,
      id_empleado: item.id_empleado,
      abordo,
    });

    mensaje.value = `Abordaje actualizado para ${item.id_empleado}.`;
    await cargarManifiesto();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'No se pudo registrar abordaje.';
  } finally {
    guardandoId.value = null;
  }
}

function formatearHora(valor: string | null | undefined) {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

onMounted(async () => {
  try {
    await Promise.all([cargarRutas(), cargarTurnos()]);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'No se pudieron cargar rutas.';
  }
});
</script>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; background: #f8fafc; width: 100%; }
.page { flex: 1; min-width: 0; padding: 2rem; width: 100%; }
.page.with-sidebar { padding: 2.5rem 2rem; }
.page-header { margin-bottom: 1rem; }
.page-header h2 { margin: 0; }
.page-header p { margin: 0.35rem 0 0; color: #64748b; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; margin-bottom: 1rem; }
.filtros { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.8rem; align-items: end; }
.filtro-dropdown { display: flex; flex-direction: column; gap: 0.35rem; }
.dia-grupo { display: flex; align-items: center; gap: 0.5rem; }
.dia-grupo__badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 1.6rem; height: 1.6rem; border-radius: 6px;
  background: #e2e8f0; color: #334155; font-size: 0.72rem; font-weight: 700;
}
label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem; color: #334155; }
.input { border: 1px solid var(--ilpea-border); border-radius: 8px; padding: 0.65rem 0.8rem; font-size: 0.9rem; background: var(--ilpea-white); color: var(--ilpea-gray-900); font-family: inherit; transition: border-color 0.2s, box-shadow 0.2s; }
.input:focus { outline: none; border-color: var(--ilpea-accent); box-shadow: 0 0 0 3px rgba(16, 124, 65, 0.12); }
.btn { border: 1px solid #cbd5e1; background: #fff; color: #0f172a; border-radius: 8px; padding: 0.5rem 0.8rem; cursor: pointer; }
.btn-mini { font-size: 0.75rem; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.status { margin: 0 0 0.75rem; font-size: 0.85rem; }
.ok { color: #166534; }
.error { color: #b91c1c; }
.resumen { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 0.8rem; }
.resumen p { margin: 0; font-size: 0.85rem; }
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; min-width: 760px; }
.table th, .table td { border-top: 1px solid #e2e8f0; padding: 0.65rem; text-align: left; font-size: 0.85rem; }
.table thead th { border-top: none; background: #f8fafc; font-size: 0.75rem; text-transform: uppercase; color: #64748b; }
.muted { color: #64748b; }

@media (max-width: 768px) {
  .admin-layout { flex-direction: column; }
}
</style>
