<template>
  <ProtectedRoute requiere-rol="CAMIONERO">
    <div class="scanner-page">
      <header class="scanner-header">
        <div>
          <h2>Escáner de asistencia QR</h2>
          <p>Escanea el código del empleado para registrar abordaje.</p>
        </div>
      </header>

      <section class="scanner-card">
        <div class="scanner-filtros">
          <label>
            Fecha
            <input v-model="filtros.fecha" type="date" />
          </label>
          <div class="asignacion-info">
            <span class="asignacion-label">Turno asignado</span>
            <strong>{{ asignacion?.turno_nombre || asignacion?.turno_id || 'Sin turno' }}</strong>
          </div>
          <div class="asignacion-info">
            <span class="asignacion-label">Unidad asignada</span>
            <strong>{{ asignacion?.vehiculo_codigo || asignacion?.vehiculo_id || 'Sin unidad' }}</strong>
          </div>
        </div>

        <p v-if="error" class="ui-alert ui-alert--error">{{ error }}</p>
        <p v-if="mensaje" class="ui-alert ui-alert--success">{{ mensaje }}</p>

        <div class="camera-wrap">
          <video ref="videoRef" autoplay muted playsinline class="camera-video"></video>
          <div class="camera-actions">
            <button type="button" class="btn-registrar" :disabled="escaneando || !asignacion" @click="iniciarEscaneo">
              {{ escaneando ? 'Escaneando...' : 'Iniciar cámara' }}
            </button>
            <button type="button" class="btn-registrar btn-sec" @click="detenerEscaneo">
              Detener cámara
            </button>
          </div>
        </div>

        <div class="manual-wrap">
          <label>
            Fallback manual (token QR o ID empleado)
            <input
              v-model.trim="entradaManual"
              type="text"
              placeholder="Pega token QR o escribe EMP-123456"
            />
          </label>
          <button type="button" class="btn-registrar" :disabled="!asignacion" @click="registrarManual">
            Registrar asistencia
          </button>
        </div>
      </section>
    </div>
  </ProtectedRoute>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import ProtectedRoute from '../components/ProtectedRoute.vue';
import { useAuth } from '../composables/useAuth';

interface AsignacionUnidadTurno {
  vehiculo_id: string;
  turno_id: string;
  vehiculo_codigo?: string | null;
  turno_nombre?: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const { authHeaders } = useAuth();
const videoRef = ref<HTMLVideoElement | null>(null);
const asignacion = ref<AsignacionUnidadTurno | null>(null);
const entradaManual = ref('');
const error = ref('');
const mensaje = ref('');
const escaneando = ref(false);
let stream: MediaStream | null = null;
let frameHandle: number | null = null;

const filtros = reactive({
  fecha: new Date().toISOString().slice(0, 10),
});

async function cargarAsignacion() {
  error.value = '';
  try {
    const respuesta = await fetch(`${API_BASE_URL}/api/camionero/mi-asignacion`, { headers: await authHeaders() });
    const payload = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok || payload?.success === false) {
      throw new Error(payload?.message || 'No se pudo cargar la asignación operativa.');
    }
    asignacion.value = payload?.data || null;
    if (!asignacion.value) {
      error.value = 'No tienes una unidad y turno asignados. Contacta al administrador.';
    }
  } catch (err: any) {
    error.value = err.message || 'No se pudo cargar la asignación del camionero.';
  }
}

function extraerIdEmpleado(valor: string) {
  const texto = valor.trim();
  if (!texto) return '';

  const partes = texto.split('.');
  if (partes.length === 2) {
    try {
      const payloadRaw = (partes[0] || '').replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(payloadRaw));
      if (payload?.id_empleado) {
        return String(payload.id_empleado);
      }
    } catch {
      return '';
    }
  }

  if (/^EMP-/i.test(texto)) {
    return texto.toUpperCase();
  }
  return '';
}

async function registrarAsistenciaPorId(idEmpleado: string) {
  if (!asignacion.value) {
    throw new Error('No tienes una unidad y turno asignados.');
  }
  const respuesta = await fetch(`${API_BASE_URL}/api/abordajes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
    },
    body: JSON.stringify({
      fecha: filtros.fecha,
      turno: asignacion.value.turno_id,
      id_empleado: idEmpleado,
      abordo: true,
    }),
  });
  const payload = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || payload?.success === false) {
    throw new Error(payload?.message || 'No se pudo registrar el abordaje.');
  }
  mensaje.value = `Asistencia registrada para ${idEmpleado}.`;
}

function detenerEscaneo() {
  escaneando.value = false;
  if (frameHandle) {
    cancelAnimationFrame(frameHandle);
    frameHandle = null;
  }
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
}

async function procesarFrame(detector: any) {
  if (!videoRef.value || !escaneando.value) return;
  try {
    const codigos = await detector.detect(videoRef.value);
    if (codigos.length) {
      const raw = codigos[0].rawValue || '';
      const idEmpleado = extraerIdEmpleado(raw);
      if (idEmpleado) {
        await registrarAsistenciaPorId(idEmpleado);
        entradaManual.value = raw;
      }
    }
  } catch {
    // Ignorar errores de lectura por frame.
  } finally {
    if (escaneando.value) {
      frameHandle = requestAnimationFrame(() => {
        void procesarFrame(detector);
      });
    }
  }
}

async function iniciarEscaneo() {
  error.value = '';
  mensaje.value = '';
  if (!('BarcodeDetector' in window)) {
    error.value = 'Tu navegador no soporta escaneo nativo. Usa el fallback manual.';
    return;
  }
  if (!asignacion.value) {
    error.value = 'No tienes una unidad y turno asignados.';
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if (!videoRef.value) {
      throw new Error('No se encontró el elemento de video.');
    }
    videoRef.value.srcObject = stream;
    escaneando.value = true;
    const DetectorCtor = (window as any).BarcodeDetector;
    const detector = new DetectorCtor({ formats: ['qr_code'] });
    frameHandle = requestAnimationFrame(() => {
      void procesarFrame(detector);
    });
  } catch (err: any) {
    error.value = err.message || 'No se pudo iniciar la cámara.';
    detenerEscaneo();
  }
}

async function registrarManual() {
  error.value = '';
  mensaje.value = '';
  try {
    const idEmpleado = extraerIdEmpleado(entradaManual.value);
    if (!idEmpleado) {
      throw new Error('Ingresa un token QR válido o un ID de empleado tipo EMP-123456.');
    }
    await registrarAsistenciaPorId(idEmpleado);
  } catch (err: any) {
    error.value = err.message || 'No se pudo registrar asistencia.';
  }
}

onMounted(async () => {
  await cargarAsignacion();
});

onBeforeUnmount(() => {
  detenerEscaneo();
});
</script>

<style scoped>
.scanner-page { min-height: 100vh; background: #f8fafc; padding: 1.4rem; }
.scanner-header h2 { margin: 0; }
.scanner-header p { margin: 0.35rem 0 0; color: #475569; }
.scanner-card { margin-top: 1rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; }
.scanner-filtros { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.8rem; align-items: end; margin-bottom: 1rem; }
label { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem; color: #334155; }
input, select { border: 1px solid #cbd5e1; border-radius: 8px; padding: 0.55rem 0.65rem; }
.asignacion-info { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem; color: #334155; }
.asignacion-label { color: #64748b; }
.camera-wrap { border: 1px dashed #94a3b8; border-radius: 10px; padding: 0.8rem; background: #f8fafc; }
.camera-video { width: 100%; max-height: 320px; border-radius: 8px; background: #020617; object-fit: cover; }
.camera-actions { margin-top: 0.7rem; display: flex; gap: 0.6rem; }
.manual-wrap { margin-top: 1rem; display: grid; gap: 0.6rem; }
.btn-registrar { border: none; border-radius: 8px; padding: 0.55rem 0.8rem; background: #0f172a; color: #fff; cursor: pointer; }
.btn-registrar:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-sec { background: #64748b; }
</style>
