<template>
  <div class="wp-wrap" ref="wrapRef">
    <button
      type="button"
      class="wp-trigger"
      :class="{ 'wp-trigger--open': abierto }"
      @click="abrir"
    >
      <span>{{ displayLabel }}</span>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="abierto" class="wp-backdrop" @click="cerrar" />
      <div v-if="abierto" class="wp-panel" :style="panelStyle">

        <!-- Header: mes + navegación -->
        <div class="wp-header">
          <span class="wp-mes-label">{{ mesLabel }} <span class="wp-mes-caret">▾</span></span>
          <div class="wp-nav">
            <button type="button" class="wp-nav-btn" @click="navMes(-1)" title="Mes anterior">↑</button>
            <button type="button" class="wp-nav-btn" @click="navMes(1)" title="Mes siguiente">↓</button>
          </div>
        </div>

        <!-- Cabeceras de columna -->
        <div class="wp-grid wp-grid-head">
          <span class="wp-col-sem">Semana</span>
          <span v-for="d in DIAS_COL" :key="d">{{ d }}</span>
        </div>

        <!-- Filas de semana -->
        <div
          v-for="sem in semanasMes"
          :key="sem.key"
          class="wp-grid wp-row"
          :class="{
            'wp-row--sel': sem.key === modelValue,
            'wp-row--hoy': sem.key === semanaHoy,
          }"
          @click="seleccionar(sem.key)"
        >
          <span class="wp-col-sem wp-num">{{ sem.num }}</span>
          <span
            v-for="(dia, i) in sem.dias"
            :key="i"
            class="wp-dia"
            :class="{ 'wp-dia--otro': dia.otroMes }"
          >{{ dia.n }}</span>
        </div>

        <!-- Footer -->
        <div class="wp-footer">
          <button type="button" class="wp-footer-btn" @click="borrar">Borrar</button>
          <button type="button" class="wp-footer-btn wp-footer-btn--primary" @click="irEstaSemana">Esta semana</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [v: string] }>();

const DIAS_COL = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const wrapRef = ref<HTMLElement | null>(null);
const abierto = ref(false);
const panelStyle = ref<Record<string, string>>({});
const viewYear = ref(new Date().getFullYear());
const viewMonth = ref(new Date().getMonth());

// ── ISO week helpers ──────────────────────────────────────────────────────────

function isoWeekYear(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

function toWeekStr(year: number, week: number): string {
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function parseWeekStr(s: string): { year: number; week: number } | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(s);
  if (!m) return null;
  return { year: parseInt(m[1] || '0', 10), week: parseInt(m[2] || '0', 10) };
}

function mondayOfIsoWeek(isoYear: number, isoWeek: number): Date {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const dow = jan4.getUTCDay() || 7;
  const mon1 = new Date(Date.UTC(isoYear, 0, 4 - dow + 1));
  mon1.setUTCDate(mon1.getUTCDate() + (isoWeek - 1) * 7);
  return mon1;
}

// ── Calendar rows for the current view month ─────────────────────────────────

interface WeekRow {
  key: string;
  num: number;
  dias: { n: number; otroMes: boolean }[];
}

const semanasMes = computed((): WeekRow[] => {
  const year = viewYear.value;
  const month = viewMonth.value;

  const firstDay = new Date(year, month, 1);
  const isoDow = firstDay.getDay() === 0 ? 7 : firstDay.getDay(); // 1=Mon…7=Sun
  const startMonday = new Date(year, month, 1 - (isoDow - 1));
  const lastDay = new Date(year, month + 1, 0);

  const rows: WeekRow[] = [];
  const cursor = new Date(startMonday);

  while (cursor <= lastDay) {
    const monday = new Date(cursor);
    const { week, year: isoYear } = isoWeekYear(monday);
    const dias: { n: number; otroMes: boolean }[] = [];

    for (let d = 0; d < 7; d++) {
      const day = new Date(cursor);
      day.setDate(cursor.getDate() + d);
      dias.push({ n: day.getDate(), otroMes: day.getMonth() !== month });
    }

    rows.push({ key: toWeekStr(isoYear, week), num: week, dias });
    cursor.setDate(cursor.getDate() + 7);
  }

  return rows;
});

const semanaHoy = computed(() => {
  const { week, year } = isoWeekYear(new Date());
  return toWeekStr(year, week);
});

// ── Display ───────────────────────────────────────────────────────────────────

const displayLabel = computed(() => {
  if (!props.modelValue) return 'Seleccionar semana';
  const p = parseWeekStr(props.modelValue);
  if (!p) return props.modelValue;
  return `Semana ${p.week}, ${p.year}`;
});

const mesLabel = computed(() =>
  `${MESES[viewMonth.value]} de ${viewYear.value}`,
);

// ── Actions ───────────────────────────────────────────────────────────────────

function navMes(delta: number) {
  let m = viewMonth.value + delta;
  let y = viewYear.value;
  if (m < 0) { m = 11; y--; }
  else if (m > 11) { m = 0; y++; }
  viewMonth.value = m;
  viewYear.value = y;
}

function seleccionar(key: string) {
  emit('update:modelValue', key);
  cerrar();
}

function borrar() {
  emit('update:modelValue', '');
  cerrar();
}

function irEstaSemana() {
  const { week, year } = isoWeekYear(new Date());
  emit('update:modelValue', toWeekStr(year, week));
  cerrar();
}

function abrir() {
  // Synchronize view to the selected week's month
  if (props.modelValue) {
    const p = parseWeekStr(props.modelValue);
    if (p) {
      const mon = mondayOfIsoWeek(p.year, p.week);
      viewYear.value = mon.getUTCFullYear();
      viewMonth.value = mon.getUTCMonth();
    }
  } else {
    const now = new Date();
    viewYear.value = now.getFullYear();
    viewMonth.value = now.getMonth();
  }

  abierto.value = true;
  nextTick(() => {
    if (!wrapRef.value) return;
    const rect = wrapRef.value.getBoundingClientRect();
    const PANEL_H = 340;
    const PANEL_W = 292;
    const top = window.innerHeight - rect.bottom >= PANEL_H + 8
      ? rect.bottom + 4
      : rect.top - PANEL_H - 4;
    let left = rect.left;
    if (left + PANEL_W > window.innerWidth - 8) left = window.innerWidth - PANEL_W - 8;
    panelStyle.value = { position: 'fixed', top: `${top}px`, left: `${left}px`, zIndex: '9999' };
  });
}

function cerrar() {
  abierto.value = false;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') cerrar();
}

watch(abierto, (v) => {
  if (v) document.addEventListener('keydown', onKeydown);
  else document.removeEventListener('keydown', onKeydown);
});

onUnmounted(() => document.removeEventListener('keydown', onKeydown));
</script>

<style scoped>
.wp-wrap {
  display: inline-block;
  width: 100%;
}

/* ── Trigger ── */
.wp-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  padding: 0.45rem 0.75rem;
  border: 1px solid var(--ilpea-border, #e2e8f0);
  border-radius: 8px;
  background: var(--ilpea-white, #fff);
  color: var(--ilpea-gray-900, #0f172a);
  font-size: 0.85rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  white-space: nowrap;
}

.wp-trigger svg {
  flex-shrink: 0;
  color: #94a3b8;
}

.wp-trigger:hover {
  border-color: #94a3b8;
}

.wp-trigger--open,
.wp-trigger:focus {
  outline: none;
  border-color: var(--ilpea-accent, #107c41);
  box-shadow: 0 0 0 3px rgba(16, 124, 65, 0.13);
}

/* ── Backdrop ── */
.wp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
}

/* ── Panel ── */
.wp-panel {
  width: 292px;
  background: #fff;
  border-radius: 14px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 12px 40px -4px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  user-select: none;
}

/* ── Header ── */
.wp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem 0.6rem;
  border-bottom: 1px solid #f1f5f9;
}

.wp-mes-label {
  font-size: 0.88rem;
  font-weight: 700;
  color: #0f172a;
  cursor: default;
}

.wp-mes-caret {
  color: #94a3b8;
  font-size: 0.75rem;
  margin-left: 2px;
}

.wp-nav {
  display: flex;
  gap: 2px;
}

.wp-nav-btn {
  background: none;
  border: none;
  cursor: pointer;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  color: #64748b;
  transition: background 0.15s, color 0.15s;
}

.wp-nav-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

/* ── Grid (cabeceras + filas) ── */
.wp-grid {
  display: grid;
  grid-template-columns: 38px repeat(7, 1fr);
  align-items: center;
}

.wp-grid-head {
  padding: 0.3rem 0.5rem;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
}

.wp-grid-head span {
  text-align: center;
  font-size: 0.68rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Week rows ── */
.wp-row {
  padding: 0 0.5rem;
  cursor: pointer;
  transition: background 0.12s;
  border-bottom: 1px solid transparent;
}

.wp-row:hover {
  background: #eff6ff;
}

.wp-row:hover .wp-dia,
.wp-row:hover .wp-num {
  color: #1e40af;
}

.wp-row--hoy:not(.wp-row--sel) {
  background: #f0fdf4;
}

.wp-row--sel {
  background: #2563eb;
}

.wp-row--sel .wp-dia,
.wp-row--sel .wp-num {
  color: #fff !important;
}

.wp-row--sel:hover {
  background: #1d4ed8;
}

/* ── Cells ── */
.wp-col-sem {
  text-align: center;
  font-size: 0.68rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.wp-num {
  color: #475569;
  font-size: 0.75rem;
  font-weight: 700;
}

.wp-dia {
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  font-weight: 500;
  color: #1e293b;
  font-variant-numeric: tabular-nums;
}

.wp-dia--otro {
  color: #cbd5e1;
}

/* ── Footer ── */
.wp-footer {
  display: flex;
  border-top: 1px solid #f1f5f9;
  margin-top: 2px;
}

.wp-footer-btn {
  flex: 1;
  background: none;
  border: none;
  padding: 0.7rem 0.5rem;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  color: #64748b;
  transition: background 0.15s, color 0.15s;
}

.wp-footer-btn:hover {
  background: #f8fafc;
  color: #0f172a;
}

.wp-footer-btn--primary {
  color: #2563eb;
  border-left: 1px solid #f1f5f9;
}

.wp-footer-btn--primary:hover {
  background: #eff6ff;
  color: #1d4ed8;
}
</style>
