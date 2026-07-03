<template>
  <div class="bus-seatgrid">
    <div class="bus-header">
      <h3>{{ titulo }}</h3>
      <div class="indicators">
        <span class="ind"><i class="sq free"></i> Libre</span>
        <span class="ind"><i class="sq selected"></i> Seleccionado</span>
        <span class="ind"><i class="sq occupied"></i> Ocupado</span>
      </div>
    </div>

    <div v-if="capacidad > 0" class="bus-chassis">
      <div class="driver-seat">
        <AppIcon name="circle-user" :size="14" />
        <span>Piloto</span>
      </div>
      <div class="seats-grid">
        <div
          v-for="n in capacidad"
          :key="n"
          class="seat-wrapper"
          :class="{ 'aisle-space': n % 4 === 2 }"
        >
          <div
            class="seat"
            :class="claseAsiento(n)"
            :title="tituloAsiento(n)"
            @click="manejarClick(n)"
          >
            {{ n }}
          </div>
        </div>
      </div>
    </div>

    <div v-else class="bus-empty">
      <AppIcon name="truck" :size="18" />
      <span>Asigna una unidad al turno para ver la parrilla de asientos.</span>
    </div>

    <div v-if="capacidad > 0" class="stats-footer">
      <p>Capacidad: {{ capacidad }} | Ocupados: {{ totalOcupados }} | Libres: {{ capacidad - totalOcupados }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from './ui/AppIcon.vue';

export interface OcupanteAsiento {
  id_empleado: string;
  nombre?: string | null;
}

const props = withDefaults(defineProps<{
  capacidad: number;
  ocupados?: Record<number, OcupanteAsiento>;
  seleccionado?: number | null;
  titulo?: string;
}>(), {
  capacidad: 0,
  ocupados: () => ({}),
  seleccionado: null,
  titulo: 'Parrilla de asientos',
});

const emit = defineEmits<{
  (e: 'seleccionar', asiento: number): void;
  (e: 'seleccionar-ocupado', asiento: number, ocupante: OcupanteAsiento): void;
}>();

const totalOcupados = computed(() => Object.keys(props.ocupados || {}).length);

function ocupante(n: number): OcupanteAsiento | null {
  return props.ocupados?.[n] || null;
}

function claseAsiento(n: number) {
  if (props.seleccionado === n) return 'selected';
  if (ocupante(n)) return 'occupied';
  return 'free';
}

function tituloAsiento(n: number) {
  const ocup = ocupante(n);
  if (ocup) {
    return `Asiento ${n} — ${ocup.nombre || ocup.id_empleado}`;
  }
  return `Asiento ${n} — libre`;
}

function manejarClick(n: number) {
  const ocup = ocupante(n);
  if (ocup) {
    emit('seleccionar-ocupado', n, ocup);
    return;
  }
  emit('seleccionar', n);
}
</script>

<style scoped>
.bus-seatgrid { width: 100%; color: #1a1a1a; }
.bus-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem; }
.bus-header h3 { margin: 0; font-size: 1.1rem; color: #0f172a; font-weight: 700; }
.indicators { display: flex; gap: 1rem; font-size: 0.75rem; color: #475569; font-weight: 500; }
.ind { color: #475569; }
.sq { width: 12px; height: 12px; display: inline-block; border-radius: 3px; vertical-align: middle; margin-right: 4px; }
.free { border: 1px solid #cbd5e1; background: #fff; }
.selected { background: #2563eb; }
.occupied { background: #94a3b8; }

.bus-chassis { background: #f1f5f9; padding: 25px; border-radius: 30px 30px 10px 10px; max-width: 380px; margin: 0 auto; border: 2px solid #e2e8f0; }
.driver-seat {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  margin-bottom: 25px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  padding-right: 15px;
}

.seats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.seat-wrapper { display: flex; justify-content: center; }
.aisle-space { margin-right: 22px; }

.seat { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: 0.2s; border: 1px solid #e2e8f0; background: #fff; color: #0f172a; }
.seat.selected { background: #2563eb; color: #fff; border-color: #1e40af; transform: scale(1.05); }
.seat.occupied { background: #94a3b8; color: #fff; border-color: #64748b; cursor: pointer; }
.seat:hover:not(.occupied) { border-color: #2563eb; color: #2563eb; }
.seat.occupied:hover { opacity: 0.9; }

.bus-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 2.5rem 1rem;
  color: #64748b;
  font-size: 0.85rem;
  text-align: center;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
}

.stats-footer { margin-top: 1.5rem; text-align: center; font-size: 0.85rem; color: #475569; font-weight: 500; }

@media (max-width: 768px) {
  .bus-chassis { padding: 15px 10px; }
  .seat { width: 36px; height: 36px; font-size: 0.75rem; }
  .aisle-space { margin-right: 12px; }
}
</style>
