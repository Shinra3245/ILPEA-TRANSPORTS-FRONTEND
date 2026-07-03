<template>
  <div class="tp-wrap" ref="wrapRef">
    <button
      type="button"
      class="tp-trigger"
      :class="{ 'tp-trigger--open': abierto }"
      @click="abrir"
    >
      {{ valorMostrado }}
    </button>

    <Teleport to="body">
      <div v-if="abierto" class="tp-backdrop" @click="cancelar" />
      <div v-if="abierto" class="tp-panel" :style="panelStyle">
        <div class="tp-cols">
          <!-- Horas -->
          <div class="tp-col">
            <button type="button" class="tp-nav" @mousedown.prevent @click="mover('h', -1)">
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 7L6 2L11 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
            <div class="tp-drum" @wheel.prevent="onWheel($event, 'h')">
              <div
                v-for="off in [-2, -1, 0, 1, 2]"
                :key="off"
                class="tp-cell"
                :class="{
                  'tp-cell--sel': off === 0,
                  'tp-cell--near': Math.abs(off) === 1,
                  'tp-cell--far': Math.abs(off) === 2,
                }"
                @click="off !== 0 ? mover('h', off) : undefined"
              >{{ fmtH(off) }}</div>
            </div>
            <button type="button" class="tp-nav" @mousedown.prevent @click="mover('h', 1)">
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1L6 6L11 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>

          <div class="tp-colon">:</div>

          <!-- Minutos -->
          <div class="tp-col">
            <button type="button" class="tp-nav" @mousedown.prevent @click="mover('m', -1)">
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 7L6 2L11 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
            <div class="tp-drum" @wheel.prevent="onWheel($event, 'm')">
              <div
                v-for="off in [-2, -1, 0, 1, 2]"
                :key="off"
                class="tp-cell"
                :class="{
                  'tp-cell--sel': off === 0,
                  'tp-cell--near': Math.abs(off) === 1,
                  'tp-cell--far': Math.abs(off) === 2,
                }"
                @click="off !== 0 ? mover('m', off) : undefined"
              >{{ fmtM(off) }}</div>
            </div>
            <button type="button" class="tp-nav" @mousedown.prevent @click="mover('m', 1)">
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1L6 6L11 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>

          <!-- AM/PM — solo 2 valores: celdas ±2 vacías, ±1 muestra la opción contraria -->
          <div class="tp-col tp-col--period">
            <button type="button" class="tp-nav" @mousedown.prevent @click="togglePeriodo">
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 7L6 2L11 7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
            <div class="tp-drum" @wheel.prevent="onWheel($event, 'p')">
              <div
                v-for="off in [-2, -1, 0, 1, 2]"
                :key="off"
                class="tp-cell tp-cell--txt"
                :class="{
                  'tp-cell--sel': off === 0,
                  'tp-cell--near': Math.abs(off) === 1,
                  'tp-cell--void': Math.abs(off) === 2,
                }"
                @click="Math.abs(off) === 1 ? togglePeriodo() : undefined"
              >{{ Math.abs(off) < 2 ? fmtP(off) : '' }}</div>
            </div>
            <button type="button" class="tp-nav" @mousedown.prevent @click="togglePeriodo">
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none"><path d="M1 1L6 6L11 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>

        <div class="tp-footer">
          <button type="button" class="tp-btn-ok" @click="confirmar">✓</button>
          <button type="button" class="tp-btn-cancel" @click="cancelar">✗</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [v: string] }>();

// 12h clock: index 0 = 12, index 1 = 1, ... index 11 = 11
const HORAS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
// 5-minute intervals
const MINS = Array.from({ length: 12 }, (_, i) => i * 5);
const PERIODO = ['AM', 'PM'];

const wrapRef = ref<HTMLElement | null>(null);
const abierto = ref(false);
const panelStyle = ref<Record<string, string>>({});

const idxH = ref(8);  // default 8 AM (HORAS[8] = 8)
const idxM = ref(0);  // default :00
const idxP = ref(0);  // default AM

function parse24h(val: string) {
  if (!val || !/^\d{2}:\d{2}$/.test(val)) return;
  const h24 = parseInt(val.slice(0, 2), 10);
  const m = parseInt(val.slice(3, 5), 10);

  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  const hi = HORAS.indexOf(h12);
  if (hi !== -1) idxH.value = hi;

  const nearM = Math.round(m / 5) * 5 % 60;
  const mi = MINS.indexOf(nearM);
  if (mi !== -1) idxM.value = mi;

  idxP.value = h24 >= 12 ? 1 : 0;
}

function to24h(): string {
  const h12 = HORAS[idxH.value]!;
  const m = MINS[idxM.value]!;
  const isPM = idxP.value === 1;
  let h24: number;
  if (h12 === 12) {
    h24 = isPM ? 12 : 0;
  } else {
    h24 = isPM ? h12 + 12 : h12;
  }
  return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const valorMostrado = computed(() => {
  const v = props.modelValue;
  if (!v || !/^\d{2}:\d{2}$/.test(v)) return '-- : -- --';
  const h24 = parseInt(v.slice(0, 2), 10);
  const m = v.slice(3, 5);
  const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
  const periodo = h24 >= 12 ? 'PM' : 'AM';
  return `${h12} : ${m} ${periodo}`;
});

function fmtH(off: number): number {
  return HORAS[((idxH.value + off) % 12 + 12) % 12]!;
}

function fmtM(off: number): string {
  return String(MINS[((idxM.value + off) % 12 + 12) % 12]!).padStart(2, '0');
}

function fmtP(off: number): string {
  return PERIODO[((idxP.value + off) % 2 + 2) % 2]!;
}

function mover(col: 'h' | 'm' | 'p', delta: number) {
  if (col === 'h') idxH.value = ((idxH.value + delta) % 12 + 12) % 12;
  else if (col === 'm') idxM.value = ((idxM.value + delta) % 12 + 12) % 12;
  else togglePeriodo();
}

function togglePeriodo() {
  idxP.value = idxP.value === 0 ? 1 : 0;
}

function onWheel(e: WheelEvent, col: 'h' | 'm' | 'p') {
  mover(col, e.deltaY > 0 ? 1 : -1);
}

function abrir() {
  parse24h(props.modelValue);
  abierto.value = true;
  nextTick(() => {
    if (!wrapRef.value) return;
    const rect = wrapRef.value.getBoundingClientRect();
    const PANEL_H = 290;
    const PANEL_W = 248;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= PANEL_H + 8
      ? rect.bottom + 4
      : rect.top - PANEL_H - 4;
    let left = rect.left;
    if (left + PANEL_W > window.innerWidth - 8) {
      left = window.innerWidth - PANEL_W - 8;
    }
    panelStyle.value = {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: '9999',
    };
  });
}

function confirmar() {
  emit('update:modelValue', to24h());
  abierto.value = false;
}

function cancelar() {
  abierto.value = false;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') cancelar();
}

watch(abierto, (v) => {
  if (v) document.addEventListener('keydown', onKeydown);
  else document.removeEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown);
});
</script>

<style scoped>
.tp-wrap {
  display: block;
  width: 100%;
}

.tp-trigger {
  width: 100%;
  padding: 0.55rem 0.85rem;
  border: 1px solid var(--ilpea-border, #e2e8f0);
  border-radius: 8px;
  background: var(--ilpea-white, #fff);
  color: var(--ilpea-gray-900, #0f172a);
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  letter-spacing: 0.01em;
}

.tp-trigger:hover {
  border-color: #94a3b8;
}

.tp-trigger--open,
.tp-trigger:focus {
  outline: none;
  border-color: var(--ilpea-accent, #107c41);
  box-shadow: 0 0 0 3px rgba(16, 124, 65, 0.13);
}

/* Backdrop (closes panel on outside click) */
.tp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

/* Floating panel */
.tp-panel {
  width: 248px;
  background: #fff;
  border-radius: 14px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 10px 40px -4px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  user-select: none;
}

/* Column container */
.tp-cols {
  display: flex;
  align-items: center;
  padding: 8px 0 4px;
}

.tp-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tp-col--period {
  flex: 0 0 72px;
}

/* The ":" separator */
.tp-colon {
  flex: 0 0 auto;
  font-size: 1.4rem;
  font-weight: 800;
  color: #475569;
  padding: 0 2px;
  align-self: center;
  margin-bottom: 6px;
}

/* Navigation arrows */
.tp-nav {
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  padding: 7px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  transition: color 0.15s, background 0.15s;
  border-radius: 6px;
}

.tp-nav:hover {
  color: #1e293b;
  background: #f1f5f9;
}

/* The drum strip */
.tp-drum {
  width: 100%;
  position: relative;
}

/* Individual cell */
.tp-cell {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: #94a3b8;
  cursor: pointer;
  transition: color 0.1s, background 0.1s;
  border-radius: 0;
}

.tp-cell--txt {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.tp-cell--far {
  color: #94a3b8;
}

.tp-cell--near {
  color: #1e293b;
  font-weight: 700;
}

.tp-cell--near:hover {
  color: #2563eb;
  background: #eff6ff;
}

.tp-cell--void {
  cursor: default;
  pointer-events: none;
}

.tp-cell--sel {
  background: #2563eb;
  color: #fff !important;
  cursor: default;
  position: relative;
}

/* Selection highlight lines */
.tp-cell--sel::before,
.tp-cell--sel::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.3);
}
.tp-cell--sel::before { top: 0; }
.tp-cell--sel::after  { bottom: 0; }

/* Footer: confirm / cancel */
.tp-footer {
  display: flex;
  border-top: 1px solid #f1f5f9;
  margin-top: 4px;
}

.tp-btn-ok,
.tp-btn-cancel {
  flex: 1;
  background: none;
  border: none;
  padding: 0.8rem;
  cursor: pointer;
  font-size: 1.05rem;
  font-weight: 700;
  transition: background 0.15s, color 0.15s;
}

.tp-btn-ok {
  color: #2563eb;
  border-right: 1px solid #f1f5f9;
}

.tp-btn-cancel {
  color: #ef4444;
}

.tp-btn-ok:hover {
  background: #eff6ff;
}

.tp-btn-cancel:hover {
  background: #fef2f2;
}
</style>
