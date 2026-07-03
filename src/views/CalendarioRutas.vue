<template>
  <div class="admin-layout">
    <AdminSidebar />

    <main class="main-content">

      <!-- Encabezado -->
      <header class="content-header">
        <div>
          <h2>Calendario de Rutas</h2>
          <p class="subtitle">Visualización mensual de rutas y turnos asignados por día.</p>
        </div>
        <AppInfoButton title="Calendario de Rutas">
          <p>Vista mensual de la programación operativa materializada en el sistema.</p>
          <ul>
            <li><strong>Navegación:</strong> usa las flechas para moverte entre meses o el botón <em>Hoy</em> para volver al mes actual.</li>
            <li><strong>Día actual:</strong> marcado con círculo verde.</li>
            <li><strong>Fines de semana:</strong> resaltados con fondo gris.</li>
            <li><strong>Rutas asignadas:</strong> haz clic en un chip para ver el detalle de esa programación.</li>
            <li><strong>Canceladas:</strong> chips en rojo cuando la ruta fue suspendida ese día.</li>
          </ul>
          <p>Si un día aparece vacío, no hay programación materializada para esa fecha. Usa Programación semanal y materializa la semana correspondiente.</p>
        </AppInfoButton>
      </header>

      <p v-if="error" class="ui-alert ui-alert--error">{{ error }}</p>

      <!-- Card del calendario -->
      <v-card class="cal-card" elevation="0" rounded="lg">

        <!-- Barra de navegación del mes -->
        <div class="cal-nav">
          <v-btn
            icon
            variant="text"
            density="comfortable"
            :disabled="cargando"
            @click="mesAnterior"
            aria-label="Mes anterior"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="15 18 9 12 15 6"/></svg>
          </v-btn>

          <span class="cal-mes-label">{{ mesLabel }}</span>

          <v-btn
            icon
            variant="text"
            density="comfortable"
            :disabled="cargando"
            @click="mesSiguiente"
            aria-label="Mes siguiente"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="9 18 15 12 9 6"/></svg>
          </v-btn>

          <div class="cal-nav-spacer" />

          <button
            type="button"
            class="btn-materializar"
            :disabled="cargando || materializando"
            :title="`Materializar las semanas de ${mesLabel}`"
            @click="materializarMes"
          >
            <svg v-if="!materializando" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="spin"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            {{ materializando ? 'Materializando...' : 'Sincronizar mes' }}
          </button>

          <v-btn
            variant="outlined"
            size="small"
            color="secondary"
            class="btn-hoy"
            :disabled="cargando"
            @click="irAHoy"
          >
            Hoy
          </v-btn>
        </div>

        <transition name="fade-msg">
          <div v-if="mensajeMaterializacion" :class="['cal-sync-msg', mensajeMaterializacion.startsWith('Error') || mensajeMaterializacion.includes('Error') ? 'cal-sync-msg--error' : 'cal-sync-msg--ok']">
            {{ mensajeMaterializacion }}
          </div>
        </transition>

        <v-divider />

        <div v-if="cargando" class="cal-loading">Cargando programación del mes...</div>

        <!-- Cabecera de días de la semana -->
        <div class="cal-grid cal-grid--head">
          <div v-for="dia in diasSemana" :key="dia" class="cal-head-cell">{{ dia }}</div>
        </div>

        <!-- Cuerpo del calendario -->
        <div class="cal-grid cal-grid--body" :class="{ 'cal-grid--loading': cargando }">
          <!-- Celdas vacías antes del primer día -->
          <div
            v-for="n in desplazamientoInicio"
            :key="'pre-' + n"
            class="cal-cell cal-cell--fuera"
          />

          <!-- Días del mes -->
          <div
            v-for="dia in diasDelMes"
            :key="dia"
            :class="[
              'cal-cell',
              { 'cal-cell--hoy': esHoy(dia) },
              { 'cal-cell--finde': esFindeSemana(dia) },
            ]"
          >
            <span :class="['cal-num', { 'cal-num--hoy': esHoy(dia) }]">{{ dia }}</span>

            <div v-if="chipsVisibles(dia).length" class="cal-chips">
              <button
                v-for="(evento, idx) in chipsVisibles(dia)"
                :key="`${fechaISO(dia)}-${evento.programacion_id || idx}`"
                type="button"
                class="cal-chip"
                :class="{
                  'cal-chip--cancelada': evento.cancelada,
                  'cal-chip--deshabilitada': evento.deshabilitada,
                  'cal-chip--planificada': evento.planificada,
                }"
                :title="tituloChip(evento)"
                @click="evento.planificada ? null : abrirDetalle(fechaISO(dia), evento)"
                :style="evento.planificada ? 'cursor: default' : ''"
              >
                R{{ evento.ruta || '?' }} · {{ evento.turno }}
              </button>
              <button
                v-if="chipsRestantes(dia) > 0"
                type="button"
                class="cal-chip cal-chip--mas"
                @click="abrirDetalleDia(fechaISO(dia))"
              >
                +{{ chipsRestantes(dia) }}
              </button>
            </div>
          </div>
        </div>

        <!-- Leyenda -->
        <v-divider />
        <div class="cal-footer">
          <div class="cal-leyenda">
            <span class="cal-leyenda-dot cal-leyenda-dot--hoy" />
            <span>Hoy</span>
          </div>
          <div class="cal-leyenda">
            <span class="cal-leyenda-dot cal-leyenda-dot--finde" />
            <span>Fin de semana</span>
          </div>
          <div class="cal-leyenda">
            <span class="cal-leyenda-chip cal-leyenda-chip--ruta" />
            <span>Ruta activa</span>
          </div>
          <div class="cal-leyenda">
            <span class="cal-leyenda-chip cal-leyenda-chip--cancelada" />
            <span>Ruta cancelada</span>
          </div>
          <div class="cal-leyenda">
            <span class="cal-leyenda-chip cal-leyenda-chip--planificada" />
            <span>Sin materializar</span>
          </div>
          <div class="cal-leyenda">
            <span class="cal-leyenda-chip cal-leyenda-chip--deshabilitada" />
            <span>Ruta deshabilitada</span>
          </div>
        </div>

      </v-card>

      <Teleport to="body">
        <div v-if="modalAbierto" class="crud-modal-overlay" @click.self="cerrarDetalle">
          <div class="crud-modal cal-detalle-modal">
            <div v-if="cargandoDetalle" class="cal-detalle-loading">Cargando detalle...</div>

            <template v-else-if="detalle">
              <h3>
                Ruta {{ detalle.ruta?.numero ?? '?' }}
                <span v-if="detalle.cancelada" class="cal-detalle-badge cal-detalle-badge--cancelada">Cancelada</span>
                <span v-else class="cal-detalle-badge cal-detalle-badge--activa">Activa</span>
              </h3>

              <dl class="cal-detalle-grid">
                <div><dt>Fecha</dt><dd>{{ formatearFecha(detalle.fecha) }}</dd></div>
                <div><dt>Turno</dt><dd>{{ detalle.turno || '—' }}</dd></div>
                <div><dt>Zona</dt><dd>{{ detalle.ruta?.zona || '—' }}</dd></div>
                <div><dt>Unidad</dt><dd>{{ detalle.codigo_unidad || '—' }} ({{ detalle.tipo_unidad || '—' }})</dd></div>
                <div><dt>Ocupación</dt><dd>{{ detalle.asientos_ocupados }}/{{ detalle.capacidad_limite }} ({{ detalle.ocupacion_pct }}%)</dd></div>
                <div><dt>Abordados</dt><dd>{{ detalle.total_abordados }}</dd></div>
                <div v-if="detalle.semana_origen"><dt>Semana origen</dt><dd>{{ detalle.semana_origen }}</dd></div>
                <div v-if="detalle.motivo_cancelacion" class="cal-detalle-full">
                  <dt>Motivo cancelación</dt>
                  <dd>{{ detalle.motivo_cancelacion }}</dd>
                </div>
              </dl>

              <h4 class="cal-detalle-subtitulo">Pasajeros ({{ detalle.pasajeros.length }})</h4>
              <div v-if="!detalle.pasajeros.length" class="cal-detalle-vacio">Sin pasajeros asignados.</div>
              <div v-else class="cal-detalle-tabla-wrap">
                <table class="cal-detalle-tabla">
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Asiento</th>
                      <th>Abordó</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="pasajero in detalle.pasajeros" :key="pasajero.id_empleado">
                      <td>{{ pasajero.nombre }}</td>
                      <td>{{ pasajero.asiento ?? '—' }}</td>
                      <td>
                        <span :class="pasajero.abordo ? 'cal-detalle-ok' : 'cal-detalle-pendiente'">
                          {{ pasajero.abordo ? 'Sí' : 'No' }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Sección cancelar servicio -->
              <template v-if="!detalle.cancelada">
                <div v-if="!confirmandoCancelacion" class="cal-cancelar-trigger">
                  <button
                    v-if="detalle.pasajeros.length === 0"
                    type="button"
                    class="cal-cancelar-btn"
                    @click="iniciarCancelacion"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    Cancelar servicio de este día
                  </button>
                  <p v-else class="cal-cancelar-aviso">
                    Para cancelar este servicio, primero reasigna los {{ detalle.pasajeros.length }} pasajero(s) desde Programación Semanal o via las Recomendaciones IA.
                  </p>
                </div>

                <div v-else class="cal-cancelar-form">
                  <p class="cal-cancelar-alerta">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    Esta acción marcará el servicio del <strong>{{ formatearFecha(detalle.fecha) }}</strong> como cancelado. No se puede deshacer desde el calendario.
                  </p>
                  <label class="cal-cancelar-label">
                    Motivo (opcional)
                    <textarea
                      v-model="motivoCancelacion"
                      class="cal-cancelar-textarea"
                      rows="2"
                      placeholder="Ej: Falla mecánica, bajo aforo, día festivo..."
                      :disabled="cancelando"
                    />
                  </label>
                  <p v-if="errorCancelacion" class="ui-alert ui-alert--error">{{ errorCancelacion }}</p>
                  <div class="cal-cancelar-actions">
                    <button type="button" class="crud-btn-secondary" :disabled="cancelando" @click="cancelarConfirmacion">Volver</button>
                    <button type="button" class="cal-btn-confirmar-cancelar" :disabled="cancelando" @click="confirmarCancelacion">
                      {{ cancelando ? 'Cancelando...' : 'Confirmar cancelación' }}
                    </button>
                  </div>
                </div>
              </template>
            </template>

            <p v-else-if="errorDetalle" class="ui-alert ui-alert--error">{{ errorDetalle }}</p>

            <div v-if="listaDiaAbierta.length && !detalle && !cargandoDetalle" class="cal-detalle-lista-dia">
              <h3>Rutas del {{ formatearFecha(listaDiaFecha) }}</h3>
              <p class="cal-detalle-vacio">Selecciona una ruta para ver su detalle.</p>
              <button
                v-for="evento in listaDiaAbierta"
                :key="evento.programacion_id"
                type="button"
                class="cal-chip cal-chip--lista"
                :class="{ 'cal-chip--cancelada': evento.cancelada, 'cal-chip--deshabilitada': evento.deshabilitada, 'cal-chip--planificada': evento.planificada }"
                @click="abrirDetalle(listaDiaFecha, evento, true)"
              >
                R{{ evento.ruta || '?' }} · {{ evento.turno }}
              </button>
            </div>

            <div v-if="listaDiaAbierta.length && detalle" class="cal-detalle-lista-dia">
              <h4 class="cal-detalle-subtitulo">Más rutas del día</h4>
              <button
                v-for="evento in listaDiaAbierta"
                :key="evento.programacion_id"
                type="button"
                class="cal-chip cal-chip--lista"
                :class="{ 'cal-chip--cancelada': evento.cancelada, 'cal-chip--deshabilitada': evento.deshabilitada, 'cal-chip--planificada': evento.planificada }"
                @click="abrirDetalle(listaDiaFecha, evento, true)"
              >
                R{{ evento.ruta || '?' }} · {{ evento.turno }}
              </button>
            </div>

            <div class="crud-modal-actions">
              <button type="button" class="crud-btn-secondary" @click="cerrarDetalle">Cerrar</button>
            </div>
          </div>
        </div>
      </Teleport>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AdminSidebar from '../components/layout/AdminSidebar.vue'
import AppInfoButton from '../components/ui/AppInfoButton.vue'
import {
  useOperacionModulos,
  type CalendarioProgramacionDetalle,
  type CalendarioRutaDia,
  type CalendarioRutasPorDia,
} from '../composables/useOperacionModulos'

const MAX_CHIPS_VISIBLES = 3

const hoy = new Date()
const anioActual = ref(hoy.getFullYear())
const mesActual = ref(hoy.getMonth())

const {
  obtenerCalendarioRutas,
  obtenerDetalleProgramacionCalendario,
  materializarSemana,
  cancelarProgramacion,
} = useOperacionModulos()

const eventosPorDia = ref<CalendarioRutasPorDia>({})
const cargando = ref(false)
const error = ref<string | null>(null)

const materializando = ref(false)
const mensajeMaterializacion = ref<string | null>(null)

const modalAbierto = ref(false)
const cargandoDetalle = ref(false)
const errorDetalle = ref<string | null>(null)
const detalle = ref<CalendarioProgramacionDetalle | null>(null)
const listaDiaAbierta = ref<CalendarioRutaDia[]>([])
const listaDiaFecha = ref('')

const confirmandoCancelacion = ref(false)
const motivoCancelacion = ref('')
const cancelando = ref(false)
const errorCancelacion = ref<string | null>(null)

const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const mesLabel = computed(() =>
  new Date(anioActual.value, mesActual.value, 1)
    .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
)

const diasDelMes = computed(() =>
  new Date(anioActual.value, mesActual.value + 1, 0).getDate()
)

const desplazamientoInicio = computed(() => {
  const d = new Date(anioActual.value, mesActual.value, 1).getDay()
  return (d + 6) % 7
})

const rangoMes = computed(() => {
  const anio = anioActual.value
  const mes = mesActual.value
  const ultimoDia = new Date(anio, mes + 1, 0).getDate()
  const desde = `${anio}-${String(mes + 1).padStart(2, '0')}-01`
  const hasta = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
  return { desde, hasta }
})

function fechaISO(dia: number) {
  const anio = anioActual.value
  const mes = mesActual.value
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

function rutasDelDia(dia: number): CalendarioRutaDia[] {
  return eventosPorDia.value[fechaISO(dia)]?.rutas || []
}

function chipsVisibles(dia: number) {
  return rutasDelDia(dia).slice(0, MAX_CHIPS_VISIBLES)
}

function chipsRestantes(dia: number) {
  const total = rutasDelDia(dia).length
  return total > MAX_CHIPS_VISIBLES ? total - MAX_CHIPS_VISIBLES : 0
}

function tituloChip(evento: CalendarioRutaDia) {
  if (evento.planificada) return `Ruta ${evento.ruta} · ${evento.turno} · Sin materializar (configura en Programación Semanal)`
  if (evento.deshabilitada) return `Ruta ${evento.ruta} · ${evento.turno} · Deshabilitada`
  const estado = evento.cancelada ? 'Cancelada' : 'Activa'
  return `Ruta ${evento.ruta} · ${evento.turno} · ${estado} · ${evento.asientos_ocupados}/${evento.capacidad_limite} asientos`
}

function esHoy(dia: number) {
  return (
    dia === hoy.getDate() &&
    mesActual.value === hoy.getMonth() &&
    anioActual.value === hoy.getFullYear()
  )
}

function esFindeSemana(dia: number) {
  const d = new Date(anioActual.value, mesActual.value, dia).getDay()
  return d === 0 || d === 6
}

function mesAnterior() {
  if (mesActual.value === 0) { mesActual.value = 11; anioActual.value-- }
  else mesActual.value--
}

function mesSiguiente() {
  if (mesActual.value === 11) { mesActual.value = 0; anioActual.value++ }
  else mesActual.value++
}

function irAHoy() {
  anioActual.value = hoy.getFullYear()
  mesActual.value = hoy.getMonth()
}

function formatearFecha(fecha: string | null) {
  if (!fecha) return '—'
  const [anio, mes, dia] = fecha.split('-').map(Number)
  if (!anio || !mes || !dia) return fecha
  return new Date(anio, mes - 1, dia).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function cerrarDetalle() {
  modalAbierto.value = false
  cargandoDetalle.value = false
  errorDetalle.value = null
  detalle.value = null
  listaDiaAbierta.value = []
  listaDiaFecha.value = ''
  confirmandoCancelacion.value = false
  motivoCancelacion.value = ''
  errorCancelacion.value = null
}

// ── Cancelar servicio ──────────────────────────────────────
function iniciarCancelacion() {
  confirmandoCancelacion.value = true
  motivoCancelacion.value = ''
  errorCancelacion.value = null
}

function cancelarConfirmacion() {
  confirmandoCancelacion.value = false
  errorCancelacion.value = null
}

async function confirmarCancelacion() {
  if (!detalle.value?.ruta?.id || !detalle.value.fecha) return
  cancelando.value = true
  errorCancelacion.value = null
  try {
    await cancelarProgramacion({
      ruta_id: detalle.value.ruta.id,
      fecha: detalle.value.fecha,
      turno: detalle.value.turno_id || detalle.value.turno,
      motivo: motivoCancelacion.value.trim() || undefined,
    })
    cerrarDetalle()
    await cargarCalendario()
  } catch (err) {
    errorCancelacion.value = err instanceof Error ? err.message : 'No se pudo cancelar el servicio.'
  } finally {
    cancelando.value = false
  }
}

// ── Materializar mes ──────────────────────────────────────
function isoWeekStr(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dow = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dow)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function semanasEnMes(anio: number, mes: number): string[] {
  const semanas = new Set<string>()
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()
  for (let d = 1; d <= diasEnMes; d++) {
    semanas.add(isoWeekStr(new Date(anio, mes, d)))
  }
  return [...semanas]
}

async function materializarMes() {
  materializando.value = true
  mensajeMaterializacion.value = null
  try {
    const semanas = semanasEnMes(anioActual.value, mesActual.value)
    let totalDocs = 0
    for (const semana of semanas) {
      const resultado = await materializarSemana(semana)
      totalDocs += Number(resultado?.documentos ?? 0)
    }
    mensajeMaterializacion.value = totalDocs > 0
      ? `${totalDocs} programación(es) creadas/actualizadas en ${semanas.length} semana(s).`
      : 'No hay asignaciones semanales pendientes para este mes.'
    await cargarCalendario()
  } catch (err) {
    mensajeMaterializacion.value = `Error: ${err instanceof Error ? err.message : 'No se pudo materializar.'}`
  } finally {
    materializando.value = false
    setTimeout(() => { mensajeMaterializacion.value = null }, 6000)
  }
}

async function abrirDetalle(fecha: string, evento: CalendarioRutaDia, conservarLista = false) {
  if (!evento.programacion_id) {
    return
  }

  modalAbierto.value = true
  cargandoDetalle.value = true
  errorDetalle.value = null
  detalle.value = null
  if (!conservarLista) {
    listaDiaAbierta.value = []
  }
  listaDiaFecha.value = fecha

  try {
    detalle.value = await obtenerDetalleProgramacionCalendario(evento.programacion_id)
  } catch (err) {
    errorDetalle.value = err instanceof Error ? err.message : 'No se pudo cargar el detalle.'
  } finally {
    cargandoDetalle.value = false
  }
}

function abrirDetalleDia(fecha: string) {
  const rutas = eventosPorDia.value[fecha]?.rutas || []
  listaDiaAbierta.value = rutas.slice(MAX_CHIPS_VISIBLES)
  listaDiaFecha.value = fecha
  modalAbierto.value = true
  detalle.value = null
  errorDetalle.value = null
  cargandoDetalle.value = false
}

async function cargarCalendario() {
  cargando.value = true
  error.value = null
  try {
    const { desde, hasta } = rangoMes.value
    eventosPorDia.value = await obtenerCalendarioRutas(desde, hasta)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar el calendario de rutas.'
    eventosPorDia.value = {}
  } finally {
    cargando.value = false
  }
}

onMounted(() => {
  cargarCalendario()
})

watch([anioActual, mesActual], () => {
  cargarCalendario()
})
</script>

<style scoped>
/* ── Layout ── */
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #f8f9fa;
  font-family: 'Inter', system-ui, sans-serif;
}
.main-content {
  flex: 1;
  min-width: 0;
  padding: 3rem;
}

/* ── Encabezado ── */
.content-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.content-header h2 { margin: 0 0 0.3rem; font-size: 1.5rem; color: #1a1a1a; }
.subtitle { margin: 0; color: #6b7280; font-size: 0.9rem; }

.ui-alert {
  margin: 0 0 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.88rem;
}
.ui-alert--error {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

/* ── Card ── */
.cal-card {
  border: 1px solid #e5e7eb !important;
  overflow: hidden;
}

.cal-loading {
  padding: 0.65rem 1.25rem;
  font-size: 0.82rem;
  color: #6b7280;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

/* ── Navegación ── */
.cal-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.85rem 1.25rem;
  background: #fff;
}
.cal-mes-label {
  font-size: 1rem;
  font-weight: 700;
  color: #1a1a1a;
  text-transform: capitalize;
  min-width: 200px;
  text-align: center;
}
.cal-nav-spacer { flex: 1; }
.btn-hoy { font-size: 0.78rem !important; text-transform: none !important; letter-spacing: 0 !important; }

.btn-materializar {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.18s ease;
  margin-right: 0.4rem;
}
.btn-materializar:hover:not(:disabled) {
  border-color: var(--ilpea-accent);
  color: var(--ilpea-accent);
  background: var(--ilpea-success-bg);
}
.btn-materializar:disabled { opacity: 0.55; cursor: not-allowed; }

.cal-sync-msg {
  padding: 0.55rem 1.25rem;
  font-size: 0.82rem;
  font-weight: 500;
}
.cal-sync-msg--ok { background: var(--ilpea-success-bg); color: var(--ilpea-success); }
.cal-sync-msg--error { background: #fef2f2; color: #b91c1c; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }

.fade-msg-enter-active, .fade-msg-leave-active { transition: opacity 0.3s ease; }
.fade-msg-enter-from, .fade-msg-leave-to { opacity: 0; }

/* ── Grid cabecera ── */
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.cal-grid--head {
  background: #1a1a1a;
}
.cal-head-cell {
  padding: 0.55rem 0;
  text-align: center;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #fff;
}

/* ── Grid cuerpo ── */
.cal-grid--body {
  background: #fff;
}
.cal-grid--loading {
  opacity: 0.55;
  pointer-events: none;
}
.cal-cell {
  min-height: 110px;
  padding: 0.75rem;
  border-right: 1px solid var(--ilpea-border);
  border-bottom: 1px solid var(--ilpea-border);
  position: relative;
  transition: background 0.2s, box-shadow 0.2s;
}
.cal-cell:nth-child(7n) { border-right: none; }
.cal-cell:hover { 
  background: var(--ilpea-gray-100);
  box-shadow: inset 0 0 0 1px var(--ilpea-gray-300);
  z-index: 1;
}

.cal-cell--fuera { background: #fafafa; opacity: 0.7; }
.cal-cell--finde { background: #f9fafb; }
.cal-cell--hoy   { background: var(--ilpea-success-bg); }

/* Número del día */
.cal-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ilpea-gray-700);
}
.cal-num--hoy {
  background: var(--ilpea-accent);
  color: var(--ilpea-white);
  box-shadow: 0 2px 4px rgba(16, 124, 65, 0.3);
}

/* Chips de rutas */
.cal-chips {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.5rem;
}
.cal-chip {
  display: block;
  width: 100%;
  border-radius: 6px;
  padding: 0.35rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.25;
  background: var(--ilpea-success-bg);
  color: var(--ilpea-success);
  border: 1px solid #bbf7d0;
  border-left: 4px solid var(--ilpea-accent);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  box-shadow: 0 1px 2px rgba(16, 124, 65, 0.08);
  transition: all 0.2s ease;
}
.cal-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 6px rgba(16, 124, 65, 0.15);
  filter: brightness(0.96);
}
.cal-chip--lista {
  width: auto;
  margin-bottom: 0.4rem;
}
.cal-chip--cancelada {
  background: var(--ilpea-danger-bg);
  color: #991b1b;
  border-color: #fecaca;
  border-left: 4px solid var(--ilpea-danger);
  box-shadow: 0 1px 2px rgba(220, 38, 38, 0.08);
}
.cal-chip--cancelada:hover {
  box-shadow: 0 3px 6px rgba(220, 38, 38, 0.15);
}
.cal-chip--mas {
  background: var(--ilpea-gray-100);
  color: var(--ilpea-gray-700);
  border-color: var(--ilpea-border);
  border-left: 1px solid var(--ilpea-border);
  text-align: center;
  box-shadow: none;
  font-weight: 700;
}
.cal-chip--mas:hover {
  transform: none;
  background: var(--ilpea-gray-300);
  box-shadow: none;
}
.cal-chip--planificada {
  background: #f8fafc;
  color: #64748b;
  border: 1px dashed #94a3b8;
  border-left: 4px dashed #94a3b8;
  box-shadow: none;
  opacity: 0.85;
}
.cal-chip--planificada:hover {
  transform: none;
  box-shadow: none;
  filter: none;
}
.cal-chip--deshabilitada {
  background: #f1f5f9;
  color: #94a3b8;
  border: 1px solid #cbd5e1;
  border-left: 4px solid #94a3b8;
  box-shadow: none;
  text-decoration: line-through;
}
.cal-chip--deshabilitada:hover {
  transform: none;
  box-shadow: none;
  filter: none;
}

/* ── Footer / leyenda ── */
.cal-footer {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.75rem 1.25rem;
  background: #fafafa;
  flex-wrap: wrap;
}
.cal-leyenda {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.78rem;
  color: #6b7280;
}
.cal-leyenda-dot {
  width: 14px; height: 14px;
  border-radius: 4px;
  display: inline-block;
  flex-shrink: 0;
}
.cal-leyenda-dot--hoy   { background: var(--ilpea-accent); border-radius: 50%; box-shadow: 0 1px 2px rgba(16, 124, 65, 0.3); }
.cal-leyenda-dot--finde { background: var(--ilpea-gray-100); border: 1px solid var(--ilpea-border); }

/* Leyenda con chip mini para los tipos de ruta */
.cal-leyenda-chip {
  display: inline-block;
  width: 28px;
  height: 14px;
  border-radius: 4px;
  flex-shrink: 0;
}
.cal-leyenda-chip--ruta { background: var(--ilpea-success-bg); border: 1px solid #bbf7d0; border-left: 4px solid var(--ilpea-accent); }
.cal-leyenda-chip--cancelada { background: var(--ilpea-danger-bg); border: 1px solid #fecaca; border-left: 4px solid var(--ilpea-danger); }
.cal-leyenda-chip--planificada { background: #f8fafc; border: 1px dashed #94a3b8; border-left: 4px dashed #94a3b8; }
.cal-leyenda-chip--deshabilitada { background: #f1f5f9; border: 1px solid #cbd5e1; border-left: 4px solid #94a3b8; }

.cal-detalle-modal {
  width: min(100%, 560px);
}

.cal-detalle-loading,
.cal-detalle-vacio {
  padding: 0.5rem 0 1rem;
  color: #6b7280;
  font-size: 0.88rem;
}

.cal-detalle-badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  vertical-align: middle;
}
.cal-detalle-badge--activa {
  background: var(--ilpea-success-bg);
  color: var(--ilpea-success);
  border: 1px solid #bbf7d0;
}
.cal-detalle-badge--cancelada {
  background: var(--ilpea-danger-bg);
  color: var(--ilpea-danger);
  border: 1px solid #fecaca;
}

.cal-detalle-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem 1rem;
  margin: 0 0 1.25rem;
}
.cal-detalle-grid dt {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.cal-detalle-grid dd {
  margin: 0.15rem 0 0;
  font-size: 0.9rem;
  color: #1a1a1a;
}
.cal-detalle-full {
  grid-column: 1 / -1;
}

.cal-detalle-subtitulo {
  margin: 0 0 0.65rem;
  font-size: 0.92rem;
  font-weight: 700;
  color: #1a1a1a;
}

.cal-detalle-tabla-wrap {
  max-height: 240px;
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
.cal-detalle-tabla {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}
.cal-detalle-tabla th,
.cal-detalle-tabla td {
  padding: 0.5rem 0.65rem;
  border-bottom: 1px solid #f0f0f0;
  text-align: left;
}
.cal-detalle-tabla th {
  background: #fafafa;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
}
.cal-detalle-ok { color: #15803d; font-weight: 600; }
.cal-detalle-pendiente { color: #6b7280; }

/* ── Cancelar servicio ── */
.cal-cancelar-trigger {
  margin-top: 1.2rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}
.cal-cancelar-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.9rem;
  border-radius: 6px;
  border: 1px solid #fca5a5;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 0.82rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.18s ease;
}
.cal-cancelar-btn:hover {
  background: #fee2e2;
  border-color: var(--ilpea-danger);
}
.cal-cancelar-aviso {
  font-size: 0.82rem;
  color: #6b7280;
  margin: 0;
  padding: 0.6rem 0.8rem;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}
.cal-cancelar-form {
  margin-top: 1.2rem;
  padding: 1rem;
  border-top: 1px solid #fecaca;
  background: #fff8f8;
  border-radius: 0 0 8px 8px;
}
.cal-cancelar-alerta {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin: 0 0 0.85rem;
  font-size: 0.83rem;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  line-height: 1.45;
}
.cal-cancelar-alerta svg { flex-shrink: 0; margin-top: 1px; }
.cal-cancelar-label {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.75rem;
}
.cal-cancelar-textarea {
  display: block;
  width: 100%;
  margin-top: 0.35rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.84rem;
  font-family: inherit;
  resize: vertical;
  background: #fff;
  color: #1a1a1a;
  box-sizing: border-box;
}
.cal-cancelar-textarea:focus {
  outline: none;
  border-color: #f97316;
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.12);
}
.cal-cancelar-actions {
  display: flex;
  gap: 0.6rem;
  justify-content: flex-end;
  margin-top: 0.75rem;
}
.cal-btn-confirmar-cancelar {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: none;
  background: var(--ilpea-danger, #dc2626);
  color: #fff;
  font-size: 0.84rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.18s ease;
}
.cal-btn-confirmar-cancelar:hover:not(:disabled) { background: #b91c1c; }
.cal-btn-confirmar-cancelar:disabled { opacity: 0.55; cursor: not-allowed; }

.cal-detalle-lista-dia {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

@media (max-width: 768px) {
  .admin-layout { flex-direction: column; }
  .main-content { padding: 1.5rem 1rem; }
  .cal-cell { min-height: 58px; padding: 0.35rem 0.4rem; }
  .cal-num { width: 22px; height: 22px; font-size: 0.72rem; }
  .cal-chip { font-size: 0.6rem; }
}
</style>
