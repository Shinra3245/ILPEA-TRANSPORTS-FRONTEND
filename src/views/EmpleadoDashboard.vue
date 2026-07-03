<template>
  <ProtectedRoute requiere-rol="EMPLEADO">
    <div class="empleado-app">
      <header class="app-header">
        <div class="header-content">
          <div class="brand">
            <h1>ILPEA</h1>
            <span class="subtitle">Panel del Empleado</span>
          </div>
          <button @click="handleLogout" class="btn-logout-icon" aria-label="Cerrar Sesión" title="Cerrar Sesión">
            <LogOut :size="22" />
          </button>
        </div>
        <div class="greeting">
          <p>¡Hola, <strong>{{ obtenerNombre() }}</strong>!</p>
        </div>
      </header>

      <main class="app-main">
        <ProtectedRoute requiere-permiso="rutas:ver">
          <div v-if="cargando" class="state-card loading-state">
            <div class="spinner"></div>
            <p>Buscando tu viaje de hoy...</p>
          </div>

          <div v-else-if="error" class="state-card error-state">
            <p>{{ error }}</p>
          </div>

          <div v-else-if="asignacion" class="asignacion-card">
            <div class="card-header">
              <h2>Tu viaje de hoy</h2>
              <span class="date-badge">{{ asignacion.fecha }}</span>
            </div>

            <div class="viaje-info">
              <div class="info-item">
                <div class="icon-box"><MapPin :size="24" /></div>
                <div class="info-text">
                  <span class="label">Ruta asignada</span>
                  <strong class="value">Ruta {{ asignacion.ruta }}</strong>
                </div>
              </div>

              <div class="info-item">
                <div class="icon-box"><Ticket :size="24" /></div>
                <div class="info-text">
                  <span class="label">Asiento reservado</span>
                  <strong class="value">#{{ asignacion.asiento }}</strong>
                </div>
              </div>

              <div class="info-item">
                <div class="icon-box"><Clock :size="24" /></div>
                <div class="info-text">
                  <span class="label">Turno correspondiente</span>
                  <strong class="value">
                    {{ asignacion.turno }}
                    <span v-if="asignacion.horario" class="horario-hint">({{ asignacion.horario }})</span>
                  </strong>
                </div>
              </div>
            </div>

            <div class="qr-section">
              <div class="qr-header">
                <h3><QrCode :size="20" class="qr-icon" /> Pase de abordaje</h3>
              </div>
              <p class="qr-instruction">Muestra este código al conductor al subir a la unidad de transporte.</p>
              
              <div class="qr-display" :class="{ 'is-scanned': asignacion.abordo }">
                <div v-if="qrDataUrl" class="qr-img-box">
                  <img :src="qrDataUrl" alt="Código QR de asistencia" />
                </div>
                
                <div class="status-banner" :class="asignacion.abordo ? 'status-ok' : 'status-pending'">
                  <CheckCircle2 v-if="asignacion.abordo" :size="20" />
                  <Info v-else :size="20" />
                  <span>
                    {{ asignacion.abordo 
                        ? `Asistencia registrada${asignacion.horaAbordaje ? ` (${new Date(asignacion.horaAbordaje).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })})` : ''}` 
                        : 'Pendiente de escanear' }}
                  </span>
                </div>
              </div>
              
              <p v-if="mensaje" class="mensaje-exito">{{ mensaje }}</p>
            </div>
          </div>

          <div v-else class="state-card empty-state">
            <div class="empty-icon"><MapPin :size="36" /></div>
            <h3>Sin ruta asignada</h3>
            <p>No tienes un viaje programado para el día de hoy. Si crees que esto es un error, por favor contacta a tu supervisor.</p>
          </div>
        </ProtectedRoute>
      </main>
    </div>
  </ProtectedRoute>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import ProtectedRoute from '../components/ProtectedRoute.vue';
import { MapPin, Ticket, Clock, LogOut, CheckCircle2, QrCode, Info } from 'lucide-vue-next';

interface Asignacion {
  idRuta: string;
  idEmpleado: string;
  ruta: string;
  asiento: number;
  fecha: string;
  turno: string;
  horario: string | null;
  abordo: boolean;
  horaAbordaje: string | null;
}

type MiRutaApi = {
  id_ruta?: unknown;
  id_empleado?: unknown;
  ruta?: unknown;
  asiento_asignado?: unknown;
  nombre?: unknown;
  zona?: unknown;
  nombre_ruta?: unknown;
  horario?: unknown;
  abordo?: unknown;
  hora_abordaje?: unknown;
} & Record<string, unknown>;

const router = useRouter();
const { logout, obtenerNombre, authHeaders } = useAuth();
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const asignacion = ref<Asignacion | null>(null);
const cargando = ref(true);
const error = ref<string | null>(null);
const mensaje = ref<string | null>(null);
const qrDataUrl = ref('');

const numeroSeguro = (valor: unknown, fallback = 0): number => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : fallback;
};

const textoSeguro = (valor: unknown, fallback = 'N/D'): string => {
  const texto = String(valor ?? '').trim();
  return texto || fallback;
};

const construirQrImageUrl = (valor: string) => {
  const urlAlEndpoint = `${API_BASE_URL}/api/asistencia/escanear-qr-publico?token=${valor}`;
  const contenido = encodeURIComponent(urlAlEndpoint);
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${contenido}`;
};

const cargarQrAsistencia = async (fecha: string, turno: string) => {
  const headers = await authHeaders();
  const params = new URLSearchParams({ fecha });
  if (turno && turno !== 'Sin turno') {
    params.set('turno', turno);
  }

  const respuesta = await fetch(`${API_BASE_URL}/api/empleado/qr-asistencia?${params.toString()}`, { headers });
  const payload = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || payload?.success === false) {
    throw new Error(payload?.message || 'No se pudo generar el código QR de asistencia.');
  }

  const token = String(payload?.data?.token || '').trim();
  qrDataUrl.value = token ? construirQrImageUrl(token) : '';
};

const obtenerRutas = async () => {
  try {
    cargando.value = true;
    error.value = null;
    mensaje.value = null;

    const headers = await authHeaders();
    const fechaHoy = new Date().toISOString().slice(0, 10);
    const params = new URLSearchParams({ fecha: fechaHoy });

    const respuesta = await fetch(`${API_BASE_URL}/api/empleado/mi-ruta?${params.toString()}`, { headers });

    if (!respuesta.ok) throw new Error('Error obteniendo tu ruta asignada');

    const datos = await respuesta.json();
    const data: MiRutaApi | null = datos?.data || null;
    const asiento = numeroSeguro(data?.asiento_asignado, 0);

    if (!data || !data.id_ruta || asiento <= 0) {
      asignacion.value = null;
      qrDataUrl.value = '';
      return;
    }

    asignacion.value = {
      idRuta: textoSeguro(data.id_ruta, ''),
      idEmpleado: textoSeguro(data.id_empleado, ''),
      ruta: textoSeguro(
        data.nombre_ruta,
        textoSeguro(
          data.zona,
          textoSeguro(data.nombre, `Ruta ${numeroSeguro(data.ruta, 0)}`)
        )
      ),
      asiento,
      fecha: textoSeguro(datos?.fecha, fechaHoy),
      turno: textoSeguro(datos?.turno, 'Sin turno'),
      horario: data.horario ? textoSeguro(data.horario, '') : null,
      abordo: data?.abordo === true,
      horaAbordaje: data?.hora_abordaje ? textoSeguro(data.hora_abordaje, '') : null,
    };
    await cargarQrAsistencia(asignacion.value.fecha, asignacion.value.turno);
  } catch (err: any) {
    error.value = err.message || 'Error cargando rutas';
    asignacion.value = null;
    qrDataUrl.value = '';
    console.error('Error:', err);
  } finally {
    cargando.value = false;
  }
};

const handleLogout = () => {
  logout();
  router.push('/');
};

onMounted(() => {
  obtenerRutas();
});
</script>

<style scoped>
/* GENERAL LAYOUT */
.empleado-app {
  min-height: 100vh;
  background-color: var(--ilpea-gray-100);
  font-family: inherit;
  display: flex;
  flex-direction: column;
}

/* APP HEADER */
.app-header {
  background: var(--ilpea-accent);
  color: var(--ilpea-white);
  padding: 1.5rem 1.25rem 2.5rem;
  box-shadow: 0 4px 12px rgba(16, 124, 65, 0.2);
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.brand h1 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.brand .subtitle {
  font-size: 0.85rem;
  opacity: 0.85;
  font-weight: 500;
}

.btn-logout-icon {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  padding: 0.5rem;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-logout-icon:hover {
  background: rgba(255, 255, 255, 0.25);
}

.greeting p {
  margin: 0;
  font-size: 1.2rem;
  opacity: 0.95;
}
.greeting strong {
  font-weight: 700;
}

/* MAIN CONTENT */
.app-main {
  flex: 1;
  padding: 0 1.25rem 2rem;
  margin-top: -1.5rem;
  max-width: 600px;
  width: 100%;
  align-self: center;
}

/* CARDS COMMON */
.state-card, .asignacion-card {
  background: var(--ilpea-white);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

/* STATE CARDS */
.state-card {
  padding: 2.5rem 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-state p, .empty-state p {
  margin: 0;
  color: var(--ilpea-gray-500);
  font-size: 0.95rem;
  line-height: 1.5;
}

.empty-icon {
  color: var(--ilpea-gray-300);
  margin-bottom: 0.5rem;
}

.empty-state h3 {
  margin: 0;
  color: var(--ilpea-gray-900);
  font-size: 1.25rem;
}

.error-state {
  border-left: 4px solid var(--ilpea-danger);
  color: var(--ilpea-danger);
  font-weight: 600;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--ilpea-gray-100);
  border-top-color: var(--ilpea-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ASIGNACION CARD */
.card-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--ilpea-gray-100);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 1.15rem;
  color: var(--ilpea-gray-900);
  font-weight: 700;
}

.date-badge {
  background: var(--ilpea-gray-100);
  color: var(--ilpea-gray-700);
  padding: 0.35rem 0.65rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.viaje-info {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.icon-box {
  width: 44px;
  height: 44px;
  background: var(--ilpea-success-bg);
  color: var(--ilpea-accent);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.info-text {
  display: flex;
  flex-direction: column;
}

.info-text .label {
  font-size: 0.75rem;
  color: var(--ilpea-gray-500);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.info-text .value {
  font-size: 1.05rem;
  color: var(--ilpea-gray-900);
  margin-top: 0.15rem;
}

.horario-hint {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--ilpea-gray-500);
  margin-left: 0.25rem;
}

/* QR SECTION */
.qr-section {
  background: var(--ilpea-gray-100);
  padding: 1.5rem;
  border-top: 1px solid var(--ilpea-border);
  text-align: center;
}

.qr-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--ilpea-gray-900);
  font-size: 1.1rem;
}

.qr-icon {
  color: var(--ilpea-accent);
}

.qr-instruction {
  font-size: 0.85rem;
  color: var(--ilpea-gray-500);
  margin: 0.5rem 0 1.25rem;
}

.qr-display {
  background: var(--ilpea-white);
  padding: 1.25rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  transition: all 0.3s ease;
}

.qr-display.is-scanned {
  border: 2px solid var(--ilpea-accent);
  box-shadow: 0 4px 12px rgba(16, 124, 65, 0.15);
}

.qr-img-box img {
  width: 100%;
  max-width: 220px;
  height: auto;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.status-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
}

.status-pending {
  background: var(--ilpea-warning-bg);
  color: var(--ilpea-warning);
}

.status-ok {
  background: var(--ilpea-success-bg);
  color: var(--ilpea-success);
}

.mensaje-exito {
  margin: 1rem 0 0;
  font-size: 0.85rem;
  color: var(--ilpea-success);
  font-weight: 600;
}

/* DESKTOP TWEAKS */
@media (min-width: 640px) {
  .app-header {
    padding-bottom: 3.5rem;
  }
  .app-main {
    margin-top: -2.5rem;
  }
  .viaje-info {
    flex-direction: row;
    justify-content: space-between;
  }
  .info-item {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
    flex: 1;
  }
  .info-text {
    align-items: center;
  }
}
</style>
