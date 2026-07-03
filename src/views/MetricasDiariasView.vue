<template>
  <div :class="esAdmin || esJefe ? 'admin-layout' : ''">
    <AdminSidebar v-if="esAdmin" />
    <JefeSidebar v-else-if="esJefe" />

    <main class="page" :class="{ 'with-sidebar': esAdmin || esJefe }">
      <header class="page-header">
        <div>
          <h2>Métricas diarias</h2>
          <p>Consulta y materializa agregados de ocupación por día y por rango.</p>
        </div>
        <AppInfoButton title="Métricas Diarias">
          <p>Vista para consultar y generar reportes de <strong>ocupación</strong> del servicio de transporte.</p>
          <ul>
            <li><strong>Cargar día:</strong> muestra las métricas de ocupación por ruta para una fecha específica.</li>
            <li><strong>Generar rollup:</strong> materializa y consolida los datos del día en la base de reportes históricos.</li>
            <li><strong>Rango de fechas:</strong> consulta la ocupación promedio en un periodo personalizado.</li>
            <li><strong>Indicadores:</strong> ocupación real vs. capacidad, rutas por debajo del umbral (40%) y tendencias.</li>
          </ul>
          <p>Se recomienda generar el rollup al final de cada jornada para mantener los reportes actualizados.</p>
        </AppInfoButton>
      </header>

      <section class="card filtros">
        <label>
          Fecha
          <input v-model="fecha" type="date" class="input" />
        </label>
        <button class="btn" :disabled="cargando" @click="cargarDia">
          {{ cargando ? 'Cargando...' : 'Cargar día' }}
        </button>
        <button class="btn btn-primary" :disabled="cargandoRollup" @click="rollupDia">
          {{ cargandoRollup ? 'Generando...' : 'Generar rollup' }}
        </button>
      </section>

      <section class="card filtros">
        <label>
          Desde
          <input v-model="desde" type="date" class="input" />
        </label>
        <label>
          Hasta
          <input v-model="hasta" type="date" class="input" />
        </label>
        <button class="btn" :disabled="cargandoRango" @click="cargarRango">
          {{ cargandoRango ? 'Cargando...' : 'Cargar rango' }}
        </button>
      </section>

      <p v-if="error" class="status error">{{ error }}</p>
      <p v-if="mensaje" class="status ok">{{ mensaje }}</p>

      <section v-if="metricas" class="card">
        <h3>Resumen {{ metricas.fecha }}</h3>
        <div class="kpis">
          <div class="kpi"><span>Rutas programadas</span><strong>{{ metricas.totales.rutas_programadas }}</strong></div>
          <div class="kpi"><span>Rutas activas</span><strong>{{ metricas.totales.rutas_activas }}</strong></div>
          <div class="kpi"><span>Rutas canceladas</span><strong>{{ metricas.totales.rutas_canceladas }}</strong></div>
          <div class="kpi"><span>Asignados</span><strong>{{ metricas.totales.asignados }}</strong></div>
          <div class="kpi"><span>Abordados</span><strong>{{ metricas.totales.abordados }}</strong></div>
        </div>

        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Ruta</th>
                <th>Turno</th>
                <th>Estado</th>
                <th>Capacidad</th>
                <th>Asignados</th>
                <th>Abordados</th>
                <th>Ocupación</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in rutasMetricas" :key="item.id">
                <td>{{ item.numero ?? item.id }}</td>
                <td>{{ item.turno_id || '—' }}</td>
                <td>{{ item.estado }}</td>
                <td>{{ item.capacidad }}</td>
                <td>{{ item.asignados }}</td>
                <td>{{ item.abordados }}</td>
                <td>{{ item.ocupacion_pct.toFixed(1) }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="card">
        <h3>Histórico en rango ({{ rango.length }})</h3>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Programadas</th>
                <th>Activas</th>
                <th>Canceladas</th>
                <th>Asignados</th>
                <th>Abordados</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in rango" :key="item.fecha">
                <td>{{ item.fecha }}</td>
                <td>{{ item.totales.rutas_programadas }}</td>
                <td>{{ item.totales.rutas_activas }}</td>
                <td>{{ item.totales.rutas_canceladas }}</td>
                <td>{{ item.totales.asignados }}</td>
                <td>{{ item.totales.abordados }}</td>
              </tr>
              <tr v-if="!rango.length">
                <td colspan="6" class="muted center">Sin datos para el rango seleccionado.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AdminSidebar from '../components/layout/AdminSidebar.vue';
import JefeSidebar from '../components/layout/JefeSidebar.vue';
import AppInfoButton from '../components/ui/AppInfoButton.vue';
import { useAuth } from '../composables/useAuth';
import { useOperacionModulos, type MetricasDiariasDoc } from '../composables/useOperacionModulos';

const { obtenerRol } = useAuth();
const esAdmin = obtenerRol() === 'ADMIN';
const esJefe = obtenerRol() === 'JEFE';
const { obtenerMetricasDiarias, obtenerMetricasRango, ejecutarRollupMetricas } = useOperacionModulos();

const fecha = ref(new Date().toISOString().slice(0, 10));
const desde = ref(new Date().toISOString().slice(0, 10));
const hasta = ref(new Date().toISOString().slice(0, 10));
const cargando = ref(false);
const cargandoRango = ref(false);
const cargandoRollup = ref(false);
const error = ref('');
const mensaje = ref('');
const metricas = ref<MetricasDiariasDoc | null>(null);
const rango = ref<MetricasDiariasDoc[]>([]);

const rutasMetricas = computed(() => {
  if (!metricas.value) return [];
  return Object.entries(metricas.value.rutas || {}).map(([id, item]) => ({
    id,
    ...item,
  }));
});

async function cargarDia() {
  cargando.value = true;
  error.value = '';
  mensaje.value = '';
  try {
    metricas.value = await obtenerMetricasDiarias(fecha.value);
    if (!metricas.value) {
      mensaje.value = 'No existe métrica materializada para esa fecha.';
    }
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'No se pudieron cargar métricas diarias.';
  } finally {
    cargando.value = false;
  }
}

async function rollupDia() {
  cargandoRollup.value = true;
  error.value = '';
  mensaje.value = '';
  try {
    metricas.value = await ejecutarRollupMetricas(fecha.value);
    mensaje.value = `Rollup generado para ${fecha.value}.`;
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'No se pudo generar el rollup.';
  } finally {
    cargandoRollup.value = false;
  }
}

async function cargarRango() {
  cargandoRango.value = true;
  error.value = '';
  mensaje.value = '';
  try {
    rango.value = await obtenerMetricasRango(desde.value, hasta.value);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar el rango de métricas.';
  } finally {
    cargandoRango.value = false;
  }
}
</script>

<style scoped>
.admin-layout { display: flex; min-height: 100vh; background: #f8fafc; width: 100%; }
.page { flex: 1; min-width: 0; padding: 2rem; width: 100%; }
.page.with-sidebar { padding: 2.5rem 2rem; }
.page-header { margin-bottom: 1rem; }
.page-header h2 { margin: 0; }
.page-header p { margin: 0.35rem 0 0; color: #64748b; }
.card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; margin-bottom: 1rem; }
.filtros { display: flex; gap: 0.8rem; flex-wrap: wrap; align-items: end; }
label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem; color: #334155; }
.input { border: 1px solid var(--ilpea-border); border-radius: 8px; padding: 0.65rem 0.8rem; font-size: 0.9rem; background: var(--ilpea-white); color: var(--ilpea-gray-900); font-family: inherit; transition: border-color 0.2s, box-shadow 0.2s; min-width: 170px; }
.input:focus { outline: none; border-color: var(--ilpea-accent); box-shadow: 0 0 0 3px rgba(16, 124, 65, 0.12); }
.btn { border: 1px solid #cbd5e1; background: #fff; color: #0f172a; border-radius: 8px; padding: 0.5rem 0.8rem; cursor: pointer; }
.btn-primary { background: #0f172a; color: #fff; border-color: #0f172a; }
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.status { margin: 0 0 0.75rem; font-size: 0.85rem; }
.ok { color: #166534; }
.error { color: #b91c1c; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 0.7rem; margin-bottom: 0.9rem; }
.kpi { border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.7rem; background: #f8fafc; }
.kpi span { display: block; color: #64748b; font-size: 0.75rem; }
.kpi strong { font-size: 1.05rem; color: #0f172a; }
.table-wrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; min-width: 760px; }
.table th, .table td { border-top: 1px solid #e2e8f0; padding: 0.65rem; text-align: left; font-size: 0.85rem; }
.table thead th { border-top: none; background: #f8fafc; font-size: 0.75rem; text-transform: uppercase; color: #64748b; }
.muted { color: #64748b; }
.center { text-align: center; }

@media (max-width: 768px) {
  .admin-layout { flex-direction: column; }
}
</style>
