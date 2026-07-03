<template>
  <div>
    <div v-if="cargando" class="loader-wrapper">
      <span class="loader-letter">A</span>
      <span class="loader-letter">n</span>
      <span class="loader-letter">a</span>
      <span class="loader-letter">l</span>
      <span class="loader-letter">i</span>
      <span class="loader-letter">z</span>
      <span class="loader-letter">a</span>
      <span class="loader-letter">n</span>
      <span class="loader-letter">d</span>
      <span class="loader-letter">o</span>
      <div class="loader"></div>
    </div>
    <template v-else>
      <div v-if="error" class="estado estado-error">{{ error }}</div>
      <div v-else-if="!insights.length" class="ui-empty">Sin recomendaciones disponibles.</div>
    </template>
    <div v-if="!cargando && insights.length" class="insights-container">
      <div v-for="(item, index) in insights" :key="item.recomendacion_id || index" :class="['insight-card', item.prioridad]">
        <div class="icon">
          <AppIcon name="lightbulb" :size="20" />
        </div>
        <div class="content">
          <h4>{{ item.titulo }}</h4>
          <p>{{ item.descripcion }}</p>
          <div v-if="esAdmin" class="insight-actions">
            <button
              v-if="puedeEjecutarRecomendacion(item)"
              type="button"
              class="btn-accion btn-ejecutar"
              :disabled="procesandoId === item.recomendacion_id"
              @click="abrirModalPlan(item)"
            >
              {{ textoBotonAccion(item) }}
            </button>
            <button
              type="button"
              class="btn-accion btn-rechazar"
              :disabled="procesandoId === item.recomendacion_id"
              @click="rechazarRecomendacion(item)"
            >
              {{ procesandoId === item.recomendacion_id ? 'Procesando...' : 'Rechazar' }}
            </button>
          </div>
          <p v-if="mensajes[item.recomendacion_id || '']" class="insight-msg">
            {{ mensajes[item.recomendacion_id || ''] }}
          </p>
        </div>
        <div class="tag">{{ item.prioridad.toUpperCase() }}</div>
      </div>
    </div>

    <EjecutarPlanModal
      v-model:visible="modalVisible"
      :insight="insightSeleccionado"
      :rutas="rutas"
      :fecha-operacion="fechaOperacion"
      :turno-operacion="turnoOperacion"
      @plan-ejecutado="onPlanEjecutado"
    />
  </div>

</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import { useAuth } from '../composables/useAuth';
import { usePlanesIA } from '../composables/usePlanesIA';
import AppIcon from './ui/AppIcon.vue';
import EjecutarPlanModal, { type InsightPlan, type RutaPlanOption } from './EjecutarPlanModal.vue';

interface Insight extends InsightPlan {
  recomendacion_id: string;
}

const props = defineProps<{
  rutas?: RutaPlanOption[];
  fechaOperacion?: string;
  turnoOperacion?: string | null;
}>();

const emit = defineEmits<{
  'plan-ejecutado': [];
  'feedback-registrado': [];
  'cargando-change': [cargando: boolean];
}>();

const insights = ref<Insight[]>([]);
const cargando = ref(true);
const error = ref('');
const modalVisible = ref(false);
const insightSeleccionado = ref<InsightPlan | null>(null);
const procesandoId = ref<string | null>(null);
const mensajes = ref<Record<string, string>>({});
const fechaConsultada = ref('');

const { authHeaders, usuario } = useAuth();
const { registrarFeedback } = usePlanesIA();
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const esAdmin = computed(() => usuario.value?.rol === 'ADMIN');
const rutas = computed(() => props.rutas || []);

const obtenerTipoAccion = (item: Insight) => {
  const accion = String(item.tipo_accion || '').toLowerCase();
  if (accion === 'cambiar_unidad' || accion === 'cancelar_reasignar') return accion;

  const texto = `${item.titulo} ${item.descripcion}`.toLowerCase();
  return texto.includes('van') || texto.includes('unidad') || texto.includes('vehiculo') || texto.includes('vehículo')
    ? 'cambiar_unidad'
    : 'cancelar_reasignar';
};

const puedeEjecutarRecomendacion = (item: Insight) => {
  const titulo = item.titulo.toLowerCase();
  return obtenerTipoAccion(item) === 'cambiar_unidad'
    || item.prioridad === 'alta'
    || titulo.includes('cancelar')
    || titulo.includes('mover')
    || titulo.includes('reasign');
};

const textoBotonAccion = (item: Insight) =>
  obtenerTipoAccion(item) === 'cambiar_unidad'
    ? 'Cambiar vehículo'
    : 'Ejecutar plan';

const abrirModalPlan = (item: Insight) => {
  insightSeleccionado.value = item;
  modalVisible.value = true;
};

const onPlanEjecutado = () => {
  if (insightSeleccionado.value?.recomendacion_id) {
    mensajes.value[insightSeleccionado.value.recomendacion_id] = 'Plan ejecutado correctamente.';
  }
  emit('plan-ejecutado');
};

const rechazarRecomendacion = async (item: Insight) => {
  if (!item.ruta_id) {
    mensajes.value[item.recomendacion_id] = 'No se pudo identificar la ruta de la recomendación.';
    return;
  }

  procesandoId.value = item.recomendacion_id;
  mensajes.value[item.recomendacion_id] = '';

  try {
    await registrarFeedback({
      recomendacion_id: item.recomendacion_id,
      ruta_id: String(item.ruta_id),
      decision: 'RECHAZADA',
      razon: item.descripcion,
      prob_cancelacion: item.prob_cancelacion ?? null,
      ruta_alternativa_sugerida: item.ruta_alternativa_sugerida ?? null
    });
    mensajes.value[item.recomendacion_id] = 'Recomendación rechazada.';
    emit('feedback-registrado');
  } catch (err: unknown) {
    mensajes.value[item.recomendacion_id] = err instanceof Error
      ? err.message
      : 'No fue posible registrar el rechazo.';
  } finally {
    procesandoId.value = null;
  }
};

const cargarInsights = async () => {
  cargando.value = true;
  error.value = '';
  mensajes.value = {};

  try {
    const headers = await authHeaders();
    const params = new URLSearchParams();
    if (props.fechaOperacion) {
      params.set('fecha', props.fechaOperacion);
    }
    if (props.turnoOperacion) {
      params.set('turno', props.turnoOperacion);
    }

    const query = params.toString();
    const url = query
      ? `${API_BASE_URL}/api/insights-automaticos?${query}`
      : `${API_BASE_URL}/api/insights-automaticos`;
    const res = await fetch(url, { headers });
    const data = await res.json();

    fechaConsultada.value = props.fechaOperacion || new Date().toISOString().slice(0, 10);

    if (!res.ok || !data.success) {
      error.value = data.message || 'No se pudieron cargar recomendaciones.';
      insights.value = [];
      return;
    }

    insights.value = Array.isArray(data.insights) ? data.insights : [];
  } catch {
    error.value = 'Error de conexión.';
    insights.value = [];
  } finally {
    cargando.value = false;
  }
};

defineExpose({ cargarInsights });

watch(cargando, (valor) => {
  emit('cargando-change', valor);
}, { immediate: true });

watch(
  () => [props.fechaOperacion, props.turnoOperacion],
  () => {
    cargarInsights();
  }
);

onMounted(() => {
  cargarInsights();
});
</script>

<style scoped>
/* ── Loader animado ── */
.loader-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 180px;
  height: 180px;
  margin: 1.5rem auto;
  font-family: 'Inter', sans-serif;
  font-size: 1.1em;
  font-weight: 300;
  color: #1a1a1a;
  border-radius: 50%;
  background-color: transparent;
  user-select: none;
}

.loader {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  background-color: transparent;
  animation: loader-rotate 2s linear infinite;
  z-index: 0;
}

@keyframes loader-rotate {
  0% {
    transform: rotate(90deg);
    box-shadow:
      0 10px 20px 0 #fff inset,
      0 20px 30px 0 #ad5fff inset,
      0 60px 60px 0 #471eec inset;
  }
  50% {
    transform: rotate(270deg);
    box-shadow:
      0 10px 20px 0 #fff inset,
      0 20px 10px 0 #d60a47 inset,
      0 40px 60px 0 #311e80 inset;
  }
  100% {
    transform: rotate(450deg);
    box-shadow:
      0 10px 20px 0 #fff inset,
      0 20px 30px 0 #ad5fff inset,
      0 60px 60px 0 #471eec inset;
  }
}

.loader-letter {
  display: inline-block;
  opacity: 0.5;
  transform: translateY(0);
  animation: loader-letter-anim 2s infinite;
  z-index: 1;
  color: #1a1a1a;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.loader-letter:nth-child(1)  { animation-delay: 0s; }
.loader-letter:nth-child(2)  { animation-delay: 0.1s; }
.loader-letter:nth-child(3)  { animation-delay: 0.2s; }
.loader-letter:nth-child(4)  { animation-delay: 0.3s; }
.loader-letter:nth-child(5)  { animation-delay: 0.4s; }
.loader-letter:nth-child(6)  { animation-delay: 0.5s; }
.loader-letter:nth-child(7)  { animation-delay: 0.6s; }
.loader-letter:nth-child(8)  { animation-delay: 0.7s; }
.loader-letter:nth-child(9)  { animation-delay: 0.8s; }
.loader-letter:nth-child(10) { animation-delay: 0.9s; }

@keyframes loader-letter-anim {
  0%, 100% { opacity: 0.4; transform: translateY(0); }
  20%       { opacity: 1;   transform: scale(1.15); }
  40%       { opacity: 0.7; transform: translateY(0); }
}

.insights-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 0;
}

.estado-error {
  background: #fee2e2;
  color: #991b1b;
}

.insight-card {
  display: flex;
  align-items: flex-start;
  padding: 1rem;
  background: white;
  border-left: 5px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.icon {
  display: flex;
  align-items: center;
  margin-right: 0.75rem;
  color: #64748b;
  margin-top: 0.15rem;
}

.alta { border-left-color: #ef4444; background: #fef2f2; }
.media { border-left-color: #f59e0b; background: #fffbeb; }
.baja { border-left-color: #3b82f6; background: #eff6ff; }

.content {
  flex: 1;
  min-width: 0;
}

.content h4 { margin: 0; font-size: 1rem; color: #1e293b; }
.content p { margin: 0.2rem 0 0 0; font-size: 0.85rem; color: #64748b; }

.insight-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.btn-accion {
  border: none;
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-ejecutar {
  background: #111827;
  color: #fff;
}

.btn-ejecutar:hover:not(:disabled) {
  background: #374151;
}

.btn-rechazar {
  background: #fff;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.btn-rechazar:hover:not(:disabled) {
  background: #fef2f2;
}

.btn-accion:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.insight-msg {
  margin-top: 0.5rem !important;
  font-size: 0.8rem !important;
  color: #166534 !important;
}

.tag {
  margin-left: 0.75rem;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid currentColor;
  flex-shrink: 0;
}
</style>
