<template>
  <div class="admin-layout">
    <AdminSidebar />

    <main class="main-content">
      <header class="content-header">
        <div class="header-flex">
          <h2>Dashboard</h2>
          <AppInfoButton title="Guía del sistema ILPEA Transporte">
            <p>Una ruta se considera <strong>viable</strong> cuando su ocupación supera el <strong>40%</strong> de la capacidad de la unidad asignada. Las rutas por debajo de este umbral aparecen como <em>Baja Ocupación</em>.</p>
            <ul>
              <li><strong>Óptimo</strong> — ocupación ≥ 40%</li>
              <li><strong>Baja ocupación</strong> — ocupación &lt; 40% (requiere revisión)</li>
              <li><strong>Sin programación</strong> — sin unidad asignada para la fecha</li>
              <li><strong>Cancelada</strong> — operación suspendida para ese turno/día</li>
            </ul>
            <ul>
              <li><strong>Dashboard</strong> — KPIs y gráficas del estado operativo diario</li>
              <li><strong>Gestión de rutas</strong> — seguimiento Samsara y administración de unidades</li>
              <li><strong>Programación semanal</strong> — asignación de empleados a rutas por turno</li>
              <li><strong>Usuarios</strong> — gestión de jefes, empleados y camioneros</li>
            </ul>
          </AppInfoButton>
        </div>
      </header>

      <!-- KPIs -->
      <div class="kpis-grid">
        <button type="button" class="kpi-card" :class="{ 'kpi-card--active': kpiActivo === 'rutas' }" @click="toggleKpi('rutas')">
          <div class="kpi-icon kpi-icon--blue"><AppIcon name="map-pin" :size="20" /></div>
          <div class="kpi-body">
            <span class="kpi-value">{{ rutas.length }}</span>
            <span class="kpi-label">Rutas totales</span>
          </div>
          <AppIcon name="chevron-down" :size="13" class="kpi-chevron" :class="{ 'kpi-chevron--open': kpiActivo === 'rutas' }" />
        </button>

        <button type="button" class="kpi-card" :class="{ 'kpi-card--active': kpiActivo === 'ocupacion' }" @click="toggleKpi('ocupacion')">
          <div class="kpi-icon kpi-icon--green"><AppIcon name="trending-up" :size="20" /></div>
          <div class="kpi-body">
            <span class="kpi-value">{{ kpiOcupacionPromedio }}%</span>
            <span class="kpi-label">Ocupación promedio</span>
          </div>
          <AppIcon name="chevron-down" :size="13" class="kpi-chevron" :class="{ 'kpi-chevron--open': kpiActivo === 'ocupacion' }" />
        </button>

        <button type="button" class="kpi-card" :class="{ 'kpi-card--active': kpiActivo === 'aforo' }" @click="toggleKpi('aforo')">
          <div class="kpi-icon kpi-icon--red"><AppIcon name="alert-triangle" :size="20" /></div>
          <div class="kpi-body">
            <span class="kpi-value">{{ kpiBajaOcupacion }}</span>
            <span class="kpi-label">Rutas bajo aforo (40%)</span>
          </div>
          <AppIcon name="chevron-down" :size="13" class="kpi-chevron" :class="{ 'kpi-chevron--open': kpiActivo === 'aforo' }" />
        </button>

        <button type="button" class="kpi-card" :class="{ 'kpi-card--active': kpiActivo === 'pasajeros' }" @click="toggleKpi('pasajeros')">
          <div class="kpi-icon kpi-icon--gray"><AppIcon name="circle-user" :size="20" /></div>
          <div class="kpi-body">
            <span class="kpi-value">{{ kpiPasajerosTotal }}</span>
            <span class="kpi-label">Pasajeros asignados</span>
          </div>
          <AppIcon name="chevron-down" :size="13" class="kpi-chevron" :class="{ 'kpi-chevron--open': kpiActivo === 'pasajeros' }" />
        </button>

        <button type="button" class="kpi-card" :class="{ 'kpi-card--active': kpiActivo === 'abordajes' }" @click="toggleKpi('abordajes')">
          <div class="kpi-icon kpi-icon--teal"><AppIcon name="clipboard-check" :size="20" /></div>
          <div class="kpi-body">
            <span class="kpi-value">{{ kpiAbordadosPanel ?? '—' }}</span>
            <span class="kpi-label">Abordajes del día</span>
          </div>
          <AppIcon name="chevron-down" :size="13" class="kpi-chevron" :class="{ 'kpi-chevron--open': kpiActivo === 'abordajes' }" />
        </button>

        <button type="button" class="kpi-card" :class="{ 'kpi-card--active': kpiActivo === 'metricas' }" @click="toggleKpi('metricas')">
          <div class="kpi-icon kpi-icon--purple"><AppIcon name="bar-chart-2" :size="20" /></div>
          <div class="kpi-body">
            <span class="kpi-value">{{ metDatos ? metDatos.fecha : 'Ver' }}</span>
            <span class="kpi-label">Métricas diarias</span>
          </div>
          <AppIcon name="chevron-down" :size="13" class="kpi-chevron" :class="{ 'kpi-chevron--open': kpiActivo === 'metricas' }" />
        </button>
      </div>

      <!-- Panel expandible de KPI -->
      <Transition name="kpi-expand">
        <div v-if="kpiActivo" class="kpi-expand-panel">

          <!-- ── Rutas totales ── -->
          <template v-if="kpiActivo === 'rutas'">
            <h3 class="kpi-panel-title"><AppIcon name="map-pin" :size="16" /> Detalle de rutas</h3>
            <div class="kpi-panel-table-wrap">
              <table class="kpi-panel-table">
                <thead><tr><th>Ruta</th><th>Zona</th><th>Unidad</th><th>Ocupación</th><th>Estado</th></tr></thead>
                <tbody>
                  <tr v-for="r in rutas" :key="r.id">
                    <td><strong>{{ r.ruta }}</strong></td>
                    <td>{{ r.zona ?? '—' }}</td>
                    <td>{{ r['tipo de unidad'] ?? r.tipo_unidad ?? '—' }}</td>
                    <td>
                      <div class="kpi-bar-row">
                        <div class="kpi-bar-track"><div class="kpi-bar-fill" :style="{ width: Math.min(r.porcentaje_ocupacion_max ?? 0, 100) + '%', background: (r.porcentaje_ocupacion_max ?? 0) < 40 ? '#ef4444' : (r.porcentaje_ocupacion_max ?? 0) < 80 ? '#f59e0b' : '#22c55e' }"></div></div>
                        <span>{{ r.porcentaje_ocupacion_max?.toFixed(0) ?? '—' }}%</span>
                      </div>
                    </td>
                    <td><span class="kpi-badge" :class="r.cancelada ? 'kpi-badge--red' : 'kpi-badge--green'">{{ r.cancelada ? 'Cancelada' : (r.estado ?? 'Activa') }}</span></td>
                  </tr>
                  <tr v-if="!rutas.length"><td colspan="5" class="kpi-empty">Sin rutas cargadas.</td></tr>
                </tbody>
              </table>
            </div>
          </template>

          <!-- ── Ocupación promedio ── -->
          <template v-else-if="kpiActivo === 'ocupacion'">
            <h3 class="kpi-panel-title"><AppIcon name="trending-up" :size="16" /> Ocupación por ruta</h3>
            <div class="kpi-bars-list">
              <div v-for="r in rutasSortedOcupacion" :key="r.id" class="kpi-bars-row">
                <span class="kpi-bars-label">Ruta {{ r.ruta }}</span>
                <div class="kpi-bar-track kpi-bar-track--wide">
                  <div class="kpi-bar-fill" :style="{ width: Math.min(r.porcentaje_ocupacion_max ?? 0, 100) + '%', background: (r.porcentaje_ocupacion_max ?? 0) < 40 ? '#ef4444' : (r.porcentaje_ocupacion_max ?? 0) < 80 ? '#f59e0b' : '#22c55e' }"></div>
                </div>
                <span class="kpi-bars-pct">{{ r.porcentaje_ocupacion_max?.toFixed(1) ?? '—' }}%</span>
              </div>
              <div v-if="!rutas.length" class="kpi-empty">Sin datos de ocupación.</div>
            </div>
          </template>

          <!-- ── Rutas bajo aforo ── -->
          <template v-else-if="kpiActivo === 'aforo'">
            <h3 class="kpi-panel-title"><AppIcon name="alert-triangle" :size="16" /> Rutas con ocupación menor al 40%</h3>
            <div class="kpi-panel-table-wrap">
              <table class="kpi-panel-table">
                <thead><tr><th>Ruta</th><th>Zona</th><th>Asignados</th><th>Capacidad</th><th>Ocupación</th></tr></thead>
                <tbody>
                  <tr v-for="r in rutasBajoAforo" :key="r.id">
                    <td><strong>{{ r.ruta }}</strong></td>
                    <td>{{ r.zona ?? '—' }}</td>
                    <td>{{ r.asientos_ocupados ?? '—' }}</td>
                    <td>{{ r.capacidad_real }}</td>
                    <td><span class="kpi-badge kpi-badge--red">{{ r.porcentaje_ocupacion_max?.toFixed(1) }}%</span></td>
                  </tr>
                  <tr v-if="!rutasBajoAforo.length"><td colspan="5" class="kpi-empty">No hay rutas con baja ocupación.</td></tr>
                </tbody>
              </table>
            </div>
          </template>

          <!-- ── Pasajeros asignados ── -->
          <template v-else-if="kpiActivo === 'pasajeros'">
            <h3 class="kpi-panel-title"><AppIcon name="circle-user" :size="16" /> Pasajeros por ruta</h3>
            <div class="kpi-bars-list">
              <div v-for="r in rutasSortedPasajeros" :key="r.id" class="kpi-bars-row">
                <span class="kpi-bars-label">Ruta {{ r.ruta }}</span>
                <div class="kpi-bar-track kpi-bar-track--wide">
                  <div class="kpi-bar-fill kpi-bar-fill--blue" :style="{ width: Math.min(((r.asientos_ocupados ?? 0) / Math.max(r.capacidad_real, 1)) * 100, 100) + '%' }"></div>
                </div>
                <span class="kpi-bars-pct">{{ r.asientos_ocupados ?? 0 }} / {{ r.capacidad_real }}</span>
              </div>
              <div v-if="!rutas.length" class="kpi-empty">Sin datos de pasajeros.</div>
            </div>
          </template>

          <!-- ── Abordajes del día ── -->
          <template v-else-if="kpiActivo === 'abordajes'">
            <h3 class="kpi-panel-title"><AppIcon name="clipboard-check" :size="16" /> Control de abordajes</h3>
            <div class="kpi-form-row">
              <label class="kpi-form-label">Fecha
                <input v-model="aboFecha" type="date" class="kpi-input" />
              </label>
              <label class="kpi-form-label kpi-dropdown-wrapper">Turno
                <AppGroupedSelect
                  v-model="aboTurno"
                  :groups="turnosOpcionesAgrupadas"
                  placeholder="Sin turno específico"
                >
                  <template #optiongroup="{ option }">
                    <div class="dia-grupo">
                      <span class="dia-grupo__badge">{{ abreviarDiaGrupo(option.code) }}</span>
                      <span>{{ option.label }}</span>
                    </div>
                  </template>
                </AppGroupedSelect>
              </label>
              <label class="kpi-form-label">Ruta
                <select v-model="aboRutaId" class="kpi-input">
                  <option value="">Selecciona ruta</option>
                  <option v-for="r in rutas" :key="r.id" :value="r.id">Ruta {{ r.ruta }} — {{ r.zona ?? r.id }}</option>
                </select>
              </label>
              <button class="kpi-btn" :disabled="aboCargando" @click="consultarAbordajes">
                {{ aboCargando ? 'Cargando...' : 'Consultar' }}
              </button>
            </div>
            <p v-if="aboError" class="ui-alert ui-alert--error">{{ aboError }}</p>

            <div v-if="aboManifiesto" class="kpi-panel-content">
              <div class="kpi-mini-kpis">
                <div class="kpi-mini"><span>Capacidad</span><strong>{{ aboManifiesto.capacidad_limite ?? '—' }}</strong></div>
                <div class="kpi-mini"><span>Asignados</span><strong>{{ aboManifiesto.total_asignados }}</strong></div>
                <div class="kpi-mini kpi-mini--green"><span>Abordados</span><strong>{{ aboManifiesto.total_abordados }}</strong></div>
                <div class="kpi-mini"><span>% Real</span><strong>{{ aboManifiesto.total_asignados ? Math.round((aboManifiesto.total_abordados / aboManifiesto.total_asignados) * 100) : 0 }}%</strong></div>
              </div>

              <!-- Gráfica simple abordados vs no abordados -->
              <div class="kpi-bars-list" style="margin: 1rem 0;">
                <div class="kpi-bars-row">
                  <span class="kpi-bars-label">Abordados</span>
                  <div class="kpi-bar-track kpi-bar-track--wide"><div class="kpi-bar-fill kpi-bar-fill--green" :style="{ width: aboManifiesto.total_asignados ? (aboManifiesto.total_abordados / aboManifiesto.total_asignados * 100) + '%' : '0%' }"></div></div>
                  <span class="kpi-bars-pct">{{ aboManifiesto.total_abordados }}</span>
                </div>
                <div class="kpi-bars-row">
                  <span class="kpi-bars-label">No abordados</span>
                  <div class="kpi-bar-track kpi-bar-track--wide"><div class="kpi-bar-fill kpi-bar-fill--red" :style="{ width: aboManifiesto.total_asignados ? ((aboManifiesto.total_asignados - aboManifiesto.total_abordados) / aboManifiesto.total_asignados * 100) + '%' : '0%' }"></div></div>
                  <span class="kpi-bars-pct">{{ aboManifiesto.total_asignados - aboManifiesto.total_abordados }}</span>
                </div>
              </div>

              <div class="kpi-panel-table-wrap">
                <table class="kpi-panel-table">
                  <thead><tr><th>Empleado</th><th>Asiento</th><th>Parada</th><th>Abordó</th><th>Hora</th></tr></thead>
                  <tbody>
                    <tr v-for="item in aboManifiesto.manifiesto" :key="item.id_empleado">
                      <td>{{ item.nombre }}</td>
                      <td>{{ item.asiento ?? '—' }}</td>
                      <td>{{ item.parada_id ?? '—' }}</td>
                      <td><span class="kpi-badge" :class="item.abordo ? 'kpi-badge--green' : 'kpi-badge--gray'">{{ item.abordo ? 'Sí' : 'No' }}</span></td>
                      <td>{{ formatearHoraAbo(item.hora_abordaje) }}</td>
                    </tr>
                    <tr v-if="!aboManifiesto.manifiesto?.length"><td colspan="5" class="kpi-empty">Sin registros.</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>

          <!-- ── Métricas diarias ── -->
          <template v-else-if="kpiActivo === 'metricas'">
            <h3 class="kpi-panel-title"><AppIcon name="bar-chart-2" :size="16" /> Métricas diarias</h3>
            <div class="kpi-form-row">
              <label class="kpi-form-label">Fecha
                <input v-model="metFecha" type="date" class="kpi-input" />
              </label>
              <button class="kpi-btn" :disabled="metCargando" @click="consultarMetricas">
                {{ metCargando ? 'Cargando...' : 'Cargar métricas' }}
              </button>
            </div>
            <p v-if="metError" class="ui-alert ui-alert--error">{{ metError }}</p>

            <div v-if="metDatos" class="kpi-panel-content">
              <div class="kpi-mini-kpis">
                <div class="kpi-mini"><span>Programadas</span><strong>{{ metDatos.totales.rutas_programadas }}</strong></div>
                <div class="kpi-mini kpi-mini--green"><span>Activas</span><strong>{{ metDatos.totales.rutas_activas }}</strong></div>
                <div class="kpi-mini kpi-mini--red"><span>Canceladas</span><strong>{{ metDatos.totales.rutas_canceladas }}</strong></div>
                <div class="kpi-mini"><span>Asignados</span><strong>{{ metDatos.totales.asignados }}</strong></div>
                <div class="kpi-mini kpi-mini--green"><span>Abordados</span><strong>{{ metDatos.totales.abordados }}</strong></div>
              </div>

              <!-- Gráfica ocupación por ruta -->
              <div class="kpi-bars-list" style="margin: 1rem 0;">
                <div v-for="r in metRutasArr" :key="r.id" class="kpi-bars-row">
                  <span class="kpi-bars-label">Ruta {{ r.numero ?? r.id }}</span>
                  <div class="kpi-bar-track kpi-bar-track--wide">
                    <div class="kpi-bar-fill" :style="{ width: Math.min(r.ocupacion_pct, 100) + '%', background: r.ocupacion_pct < 40 ? '#ef4444' : r.ocupacion_pct < 80 ? '#f59e0b' : '#22c55e' }"></div>
                  </div>
                  <span class="kpi-bars-pct">{{ r.ocupacion_pct.toFixed(1) }}%</span>
                </div>
                <div v-if="!metRutasArr.length" class="kpi-empty">Sin datos de rutas.</div>
              </div>

              <div class="kpi-panel-table-wrap">
                <table class="kpi-panel-table">
                  <thead><tr><th>Ruta</th><th>Turno</th><th>Estado</th><th>Capacidad</th><th>Asignados</th><th>Abordados</th><th>Ocupación</th></tr></thead>
                  <tbody>
                    <tr v-for="r in metRutasArr" :key="r.id">
                      <td><strong>{{ r.numero ?? r.id }}</strong></td>
                      <td>{{ r.turno_id ?? '—' }}</td>
                      <td><span class="kpi-badge" :class="r.estado === 'activa' ? 'kpi-badge--green' : 'kpi-badge--red'">{{ r.estado }}</span></td>
                      <td>{{ r.capacidad }}</td>
                      <td>{{ r.asignados }}</td>
                      <td>{{ r.abordados }}</td>
                      <td>{{ r.ocupacion_pct.toFixed(1) }}%</td>
                    </tr>
                    <tr v-if="!metRutasArr.length"><td colspan="7" class="kpi-empty">Sin datos.</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>

        </div>
      </Transition>

      <div v-if="error" class="status-box error-msg">
        <p class="ui-alert ui-alert--error">
          <AppIcon name="alert-triangle" :size="18" />
          <span>{{ error }}</span>
        </p>
        <button @click="recargarRutasSegunFiltro" class="btn-retry">Reintentar</button>
      </div>
      <div v-else class="dashboard-visuals">
        <div class="charts-filter">
          <label for="chart-select">Visualización:</label>
          <select id="chart-select" v-model="selectedChart" class="minimal-select">
            <option value="todos">Todos los indicadores</option>
            <option value="ocupacion">Ocupación por Ruta</option>
            <option value="capacidad">Distribución de Capacidad</option>
            <option value="alertas">Estado de Alertas</option>
          </select>
        </div>

        <v-expansion-panels class="filtros-panel" variant="accordion">
          <v-expansion-panel>
            <v-expansion-panel-title class="filtros-panel-title">
              <div class="filtros-panel-title-inner">
                <AppIcon name="search" :size="15" />
                Filtros de rutas
                <span class="filtros-badge">{{ rutasFiltradas.length }} / {{ rutas.length }}</span>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="filters-grid">
                <div class="filter-item filter-item--island">
                  <span class="filter-radio-label">Periodo</span>
                  <div class="period-island">
                    <button type="button" :class="['period-btn', { active: filtroPeriodo === 'todos' }]" @click="filtroPeriodo = 'todos'">Todos</button>
                    <button type="button" :class="['period-btn', { active: filtroPeriodo === 'dia' }]"   @click="filtroPeriodo = 'dia'">Día</button>
                    <button type="button" :class="['period-btn', { active: filtroPeriodo === 'semana' }]" @click="filtroPeriodo = 'semana'">Semana</button>
                    <div class="period-indicator" :style="periodoIndicatorStyle"></div>
                  </div>
                </div>

                <div class="filter-item" v-if="filtroPeriodo === 'dia'">
                  <label for="filtro-dia">Día</label>
                  <input id="filtro-dia" v-model="filtroDia" type="date" class="minimal-select" />
                </div>

                <div class="filter-item" v-if="filtroPeriodo === 'semana'">
                  <label>Semana</label>
                  <AppWeekPicker v-model="filtroSemana" />
                </div>

                <div class="filter-item">
                  <label for="filtro-ruta">Ruta</label>
                  <AppAutocomplete
                    input-id="filtro-ruta"
                    v-model="filtroRutaTexto"
                    mode="filter"
                    variant="field"
                    :options="opcionesRutasBusqueda"
                    placeholder="Buscar ruta por número o zona..."
                  />
                </div>

                <div class="filter-item filter-item--radio">
                  <span class="filter-radio-label">Ocupación</span>
                  <div class="radio-dropdown" :class="{ 'radio-dropdown--open': ocupDropdownOpen }" @click.stop>
                    <!-- Trigger: muestra solo la opción activa -->
                    <button ref="ocupTriggerRef" type="button" class="radio-dropdown__trigger" @click="toggleOcupDropdown">
                      <span :class="['radio-circle', `radio-circle--${filtroOcupacion === 'todas' ? 'neutral' : filtroOcupacion}`, 'radio-circle--filled']"></span>
                      <span class="radio-text">{{ ocupOpcionLabel }}</span>
                      <svg class="radio-dropdown__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <!-- Panel flotante con todas las opciones -->
                    <Teleport to="body">
                    <div v-if="ocupDropdownOpen" class="radio-dropdown__panel" :style="ocupPanelStyle">
                      <label v-for="opt in ocupOpciones" :key="opt.value" class="radio-option" @click="seleccionarOcupacion(opt.value)">
                        <span :class="['radio-circle', `radio-circle--${opt.color}`, { 'radio-circle--filled': filtroOcupacion === opt.value }]"></span>
                        <span class="radio-text">{{ opt.label }}</span>
                      </label>
                    </div>
                    </Teleport>
                  </div>
                </div>
              </div>
              <div class="filters-actions">
                <button class="btn-manage" @click="limpiarFiltros">Limpiar filtros</button>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <div class="charts-grid">
          <div v-show="selectedChart === 'todos' || selectedChart === 'ocupacion'" class="chart-item" id="chart-ocupacion">
            <ChartOcupacion :rutas="rutasOperativas" />
          </div>
          <div v-show="selectedChart === 'todos' || selectedChart === 'capacidad'" class="chart-item" id="chart-capacidad">
            <ChartCapacidad :rutas="rutasOperativas" />
          </div>
          <div v-show="selectedChart === 'todos' || selectedChart === 'alertas'" class="chart-item chart-item-small" id="chart-alertas">
            <ChartAlertas :rutas="rutasOperativas" />
          </div>
        </div>

        <section class="ia-block">
          <div class="section-header-inline">
            <h3 class="section-title">Recomendaciones</h3>
            <div class="btn-ia-wrapper">
              <button
                type="button"
                class="btn-ia-cargar"
                :class="{ 'is-loading': cargandoInsights }"
                @click="activarInsights"
                :disabled="cargandoInsights"
              >
                <svg class="btn-ia-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
                  ></path>
                </svg>
                <span class="btn-ia-txt">
                  <span
                    v-for="(letra, idx) in btnIaLetras"
                    :key="idx"
                    class="btn-ia-letter"
                    :style="{ animationDelay: (idx * 0.06) + 's' }"
                  >{{ letra === ' ' ? ' ' : letra }}</span>
                </span>
              </button>
            </div>
          </div>
          <div v-if="mostrarInsights" class="ia-block-content">
            <RecomendacionesIA
              ref="recomendacionesRef"
              :rutas="rutasPlanOptions"
              :fecha-operacion="fechaOperacion"
              @cargando-change="onInsightsCargandoChange"
              @plan-ejecutado="onPlanActualizado"
              @feedback-registrado="onPlanActualizado"
            />
          </div>
          <p v-else class="ui-empty ia-block-empty">Pulse «Cargar» para ver recomendaciones.</p>
        </section>

        <div id="tabla-rutas-reporte" class="pdf-wrapper">
          <div class="tabla-header-row">
            <h3 class="section-title">Detalle Operativo de Rutas</h3>
            <v-tooltip text="Exportar tabla de programación a Excel" location="left">
              <template #activator="{ props }">
                <button
                  v-bind="props"
                  type="button"
                  @click="exportarTablaExcel"
                  :disabled="cargando || exportandoExcel || !!error"
                  class="btn-exportar excel-btn btn-with-icon"
                >
                  <AppIcon v-if="exportandoExcel" name="loader-2" :size="16" spin />
                  <AppIcon v-else name="file-spreadsheet" :size="16" />
                  <span>{{ exportandoExcel ? 'Exportando...' : 'Exportar programación' }}</span>
                </button>
              </template>
            </v-tooltip>
          </div>
          <div class="table-card">
            <table class="minimal-table">
              <thead>
                <tr>
                  <th>Ruta</th>
                  <th>Unidad</th>
                  <th>Capacidad</th>
                  <th>Ocupación %</th>
                  <th>Estado</th>
                  <th class="no-print">Acción</th> 
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="ruta in rutasFiltradas"
                  :key="ruta.id || ruta.ruta"
                  :class="{
                    'row-alert': rutaTieneDatosOperativos(ruta) && !rutaEstaCancelada(ruta) && ruta.porcentaje_ocupacion_max < 40,
                    'row-cancelled': rutaEstaCancelada(ruta)
                  }"
                >
                  <td><strong>Ruta {{ ruta.ruta }}</strong></td>
                  <td>{{ tipoUnidadRuta(ruta) }}</td>
                  <td>{{ capacidadOperativa(ruta) }} asientos</td>
                  <td>
                    <div class="occupancy-cell">
                      <div class="bar-bg">
                        <div class="bar-fill" 
                             :style="{ width: Math.min(obtenerOcupacionSegura(ruta), 100) + '%' }"
                             :class="obtenerOcupacionSegura(ruta) < 40 ? 'low' : 'ok'">
                        </div>
                      </div>
                      <span>{{ formatearOcupacion(ruta) }}%</span>
                    </div>
                  </td>
                  <td>
                    <span :class="['tag', rutaEstaCancelada(ruta) ? 'tag-cancelled' : (!rutaTieneDatosOperativos(ruta) ? 'tag-pending' : (ruta.porcentaje_ocupacion_max < 40 ? 'tag-alert' : 'tag-ok'))]">
                      {{ rutaEstaCancelada(ruta) ? 'CANCELADA' : (!rutaTieneDatosOperativos(ruta) ? 'SIN PROGRAMACIÓN' : (ruta.porcentaje_ocupacion_max < 40 ? 'BAJA OCUPACIÓN' : 'ÓPTIMO')) }}
                    </span>
                  </td>
                  <td class="no-print">
                    <div v-if="!rutaEstaCancelada(ruta)" class="crud-actions ruta-acciones">
                      <button
                        type="button"
                        class="crud-action-btn crud-action-btn--edit"
                        :disabled="procesandoRutaId === ruta.id"
                        @click="abrirModalUnidad(ruta)"
                      >
                        <AppIcon name="truck" :size="13" />
                        Asignar unidad
                      </button>
                      <button
                        type="button"
                        class="crud-action-btn crud-action-btn--delete"
                        :disabled="procesandoRutaId === ruta.id"
                        @click="intentarDeshabilitarRuta(ruta)"
                      >
                        <AppIcon name="trash-2" :size="13" />
                        Deshabilitar
                      </button>
                    </div>
                    <span v-else class="ui-muted">—</span>
                  </td>
                </tr>
                <tr v-if="!rutasFiltradas.length">
                  <td colspan="6" class="empty-row">No hay rutas que coincidan con los filtros seleccionados.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>

    <Teleport to="body">
      <div v-if="modalUnidadVisible && rutaUnidadSeleccionada" class="crud-modal-overlay" @click.self="cerrarModalUnidad">
        <form class="crud-modal unidad-modal" @submit.prevent="guardarUnidad">
          <h3>Asignar unidad operativa</h3>
          <p class="ui-muted unidad-intro">
            Ruta <strong>{{ rutaUnidadSeleccionada.ruta }}</strong> —
            {{ rutaUnidadSeleccionada.zona || 'Sin zona' }}
          </p>

          <label>
            Fecha
            <input v-model="formUnidad.fecha" type="date" required />
          </label>

          <p class="ui-muted unidad-hint">
            Para unidades permanentes por turno, configúralas en Gestión de rutas → Administración → Gestionar turnos.
          </p>

          <label>
            Tipo de unidad
            <select v-model="formUnidad.tipoPreset" required @change="aplicarPresetCapacidad">
              <option value="Van">Van</option>
              <option value="Sprinter">Sprinter</option>
              <option value="Autobús">Autobús</option>
              <option value="Camión">Camión</option>
              <option value="Otro">Otro</option>
            </select>
          </label>

          <label v-if="formUnidad.tipoPreset === 'Otro'">
            Nombre de unidad
            <input v-model.trim="formUnidad.tipoUnidad" type="text" required placeholder="Tipo personalizado" />
          </label>

          <label>
            Capacidad
            <input
              v-model.number="formUnidad.capacidadLimite"
              type="number"
              :min="pasajerosActualesUnidad || 1"
              required
            />
          </label>

          <label>
            Código de unidad
            <input v-model.trim="formUnidad.codigoUnidad" type="text" placeholder="Ej. E0234" />
          </label>

          <label>
            Motivo
            <textarea v-model.trim="formUnidad.motivo" rows="3" placeholder="Motivo de la asignación manual" />
          </label>

          <p v-if="errorModalUnidad" class="ui-alert ui-alert--error">{{ errorModalUnidad }}</p>

          <div class="crud-modal-actions">
            <button type="submit" class="crud-btn-new" :disabled="guardandoUnidad">
              {{ guardandoUnidad ? 'Guardando...' : 'Guardar unidad' }}
            </button>
            <button type="button" class="crud-btn-secondary" :disabled="guardandoUnidad" @click="cerrarModalUnidad">
              Cancelar
            </button>
          </div>
        </form>
      </div>

      <div v-if="modalBloqueoVisible && rutaBloqueoSeleccionada" class="crud-modal-overlay" @click.self="cerrarModalBloqueo">
        <div class="crud-modal bloqueo-modal">
          <h3>No se puede deshabilitar esta ruta</h3>
          <p class="ui-muted bloqueo-intro">
            La ruta <strong>Ruta {{ rutaBloqueoSeleccionada.ruta }}</strong> tiene pasajeros asignados.
            Reasígnalos antes de deshabilitarla.
          </p>

          <div class="crud-table-scroll bloqueo-tabla">
            <table class="crud-table">
              <thead>
                <tr>
                  <th>ID empleado</th>
                  <th>Nombre</th>
                  <th>Fecha</th>
                  <th>Turno</th>
                  <th>Asiento</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="empleado in rutaBloqueoSeleccionada.empleados_a_reasignar"
                  :key="`${empleado.id_empleado}-${empleado.fecha}-${empleado.turno || ''}`"
                >
                  <td><span class="crud-id">{{ empleado.id_empleado }}</span></td>
                  <td>{{ empleado.nombre }}</td>
                  <td>{{ empleado.fecha }}</td>
                  <td>{{ empleado.turno || '—' }}</td>
                  <td>{{ empleado.asiento ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="crud-modal-actions">
            <button type="button" class="crud-btn-secondary" @click="cerrarModalBloqueo">Cerrar</button>
            <button type="button" class="crud-btn-new" @click="irAAsignaciones">Ir a asignaciones</button>
          </div>
        </div>
      </div>
    </Teleport>

    <CopilotoChat scope="ADMIN" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { saveAs } from 'file-saver';

import AdminSidebar from '../components/layout/AdminSidebar.vue';
import AppIcon from '../components/ui/AppIcon.vue';
import RecomendacionesIA from '../components/RecomendacionesIA.vue';
import ChartOcupacion from '../components/ChartOcupacion.vue';
import ChartCapacidad from '../components/ChartCapacidad.vue';
import ChartAlertas from '../components/ChartAlertas.vue';
import CopilotoChat from '../components/CopilotoChat.vue';
import AppAutocomplete, { type AutocompleteOption } from '../components/ui/AppAutocomplete.vue';
import AppInfoButton from '../components/ui/AppInfoButton.vue';
import AppWeekPicker from '../components/ui/AppWeekPicker.vue';
import AppGroupedSelect from '../components/ui/AppGroupedSelect.vue';
import { coincideBusqueda } from '../utils/busqueda';
import {
  capacidadPorTipoUnidad,
  useProgramacionUnidad,
} from '../composables/useProgramacionUnidad';
import { useTurnosCatalogo, abreviarDiaGrupo } from '../composables/useTurnosCatalogo';
import { useOperacionModulos, type MetricasDiariasDoc } from '../composables/useOperacionModulos';
import { useDialog } from '../composables/useDialog';

// --- INTERFACES ---
interface Ruta {
  id: string;
  ruta: number;
  zona?: string;
  "tipo de unidad": string;
  tipo_unidad?: string | null;
  codigo_unidad?: string | null;
  capacidad_real: number;
  capacidad_limite?: number;
  asientos_ocupados?: number;
  asientos_disponibles?: number;
  pasajeros_ids?: string[];
  max_pasajeros_dia: number;
  porcentaje_ocupacion_max: number;
  alerta_ocupacion: string;
  sugerencia_right_sizing: string;
  fecha_operacion: string | null;
  semana_operacion: number | null;
  programada?: boolean;
  programacion_id?: string;
  turno_programado?: string | null;
  estado?: string;
  estado_programacion?: string;
  cancelada?: boolean;
  motivo_cancelacion?: string | null;
  fuente_datos?: string;
  ocupacion_pct?: number;
}

interface EmpleadoReasignar {
  id_empleado: string;
  nombre: string;
  email?: string | null;
  fecha: string;
  turno?: string | null;
  asiento?: number | null;
}

interface RutaBloqueo extends Ruta {
  empleados_a_reasignar: EmpleadoReasignar[];
}
interface UsuarioAsignado {
  num_control: string;
  nombre: string;
  puesto: string;
  dpto: string;
  turno: string;
  empresa: string;
  horario_entrada: string;
  horario_salida: string;
  dias_trabajo: string;
  domicilio: string;
  colonia: string;
  referencia: string;
  ruta_asignada: string; // Columna M en la imagen
  parada_asignada: string;
  estatus: string;
}

type RutaApi = Partial<Ruta> & Record<string, unknown>;

const router = useRouter();
const { cambiarUnidadProgramacion } = useProgramacionUnidad();
const { turnosCatalogo, turnosAgrupados, turnosOpcionesAgrupadas, cargarTurnos } = useTurnosCatalogo();

// --- ESTADOS REACtivos ---
const rutas = ref<Ruta[]>([]);
const cargando = ref(true);
const error = ref<string | null>(null);
const { authHeaders } = useAuth();
const { dialogAlert, dialogConfirm } = useDialog();
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const selectedChart = ref<string>('todos');
const mostrarInsights = ref(false);
const cargandoInsights = ref(false);
const recomendacionesRef = ref<{ cargarInsights: () => Promise<void> } | null>(null);
const btnIaLabel = computed(() => (
  cargandoInsights.value ? 'Cargando...' : (mostrarInsights.value ? 'Regenerar' : 'Cargar')
));
const btnIaLetras = computed(() => btnIaLabel.value.split(''));
const filtroPeriodo = ref<'todos' | 'dia' | 'semana'>('dia');
const periodoIndicatorStyle = computed(() => {
  const idx = { todos: 0, dia: 1, semana: 2 }[filtroPeriodo.value] ?? 0;
  return { transform: `translateX(${idx * 70}px)` };
});
const filtroDia = ref(new Date().toISOString().slice(0, 10));
const filtroSemana = ref<string>('');
const filtroOcupacion = ref<'todas' | 'baja' | 'media' | 'alta'>('todas');
const ocupDropdownOpen = ref(false);
const ocupTriggerRef = ref<HTMLButtonElement | null>(null);
const ocupPanelStyle = ref<Record<string, string>>({});

const ocupOpciones = [
  { value: 'todas', label: 'Todas',          color: 'neutral' },
  { value: 'alta',  label: 'Alta (≥80%)',    color: 'alta' },
  { value: 'media', label: 'Media (40–79%)', color: 'media' },
  { value: 'baja',  label: 'Baja (<40%)',    color: 'baja' },
] as const;

const ocupOpcionLabel = computed(() =>
  ocupOpciones.find((o) => o.value === filtroOcupacion.value)?.label ?? 'Todas'
);

function toggleOcupDropdown() {
  ocupDropdownOpen.value = !ocupDropdownOpen.value;
  if (ocupDropdownOpen.value && ocupTriggerRef.value) {
    const r = ocupTriggerRef.value.getBoundingClientRect();
    ocupPanelStyle.value = {
      top: `${r.bottom + 4}px`,
      left: `${r.left}px`,
      width: `${r.width}px`,
    };
  }
}

function seleccionarOcupacion(valor: 'todas' | 'baja' | 'media' | 'alta') {
  filtroOcupacion.value = valor;
  ocupDropdownOpen.value = false;
}

const filtroRutaTexto = ref('');
const procesandoRutaId = ref<string | null>(null);
const modalUnidadVisible = ref(false);
const modalBloqueoVisible = ref(false);
const rutaUnidadSeleccionada = ref<Ruta | null>(null);
const rutaBloqueoSeleccionada = ref<RutaBloqueo | null>(null);
const guardandoUnidad = ref(false);
const errorModalUnidad = ref<string | null>(null);
const formUnidad = ref({
  fecha: '',
  tipoPreset: 'Van',
  tipoUnidad: 'Van',
  capacidadLimite: 12,
  codigoUnidad: '',
  motivo: 'Asignación manual de unidad operativa.',
});

const opcionesRutasBusqueda = computed<AutocompleteOption[]>(() =>
  rutas.value.map((ruta) => ({
    value: String(ruta.ruta),
    label: `Ruta ${ruta.ruta}${ruta.zona ? ` — ${ruta.zona}` : ''}`,
    hint: ruta['tipo de unidad'],
    keywords: `ruta ${ruta.ruta} ${ruta.zona || ''} ${ruta.id}`,
  })),
);

const rutasPlanOptions = computed(() =>
  rutas.value.map((ruta) => ({
    id: ruta.id,
    ruta: ruta.ruta,
    label: ruta.zona ? `Ruta ${ruta.ruta} - ${ruta.zona}` : `Ruta ${ruta.ruta}`,
    tipo_unidad: tipoUnidadRuta(ruta),
    capacidad_limite: capacidadOperativa(ruta),
    capacidad_real: ruta.capacidad_real,
    asientos_ocupados: ruta.asientos_ocupados || 0,
    codigo_unidad: ruta.codigo_unidad || null
  }))
);

const fechaOperacion = computed(() => {
  if (filtroPeriodo.value === 'dia') return filtroDia.value;
  if (filtroPeriodo.value === 'semana') return new Date().toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
});

const anioOperacion = computed(() => new Date(filtroDia.value).getFullYear())

// ── KPI expand ──
const kpiActivo = ref<string | null>(null);
function toggleKpi(id: string) {
  kpiActivo.value = kpiActivo.value === id ? null : id;
}

// ── Panel Abordajes ──
const { obtenerManifiestoAbordajes, obtenerMetricasDiarias } = useOperacionModulos();
const aboFecha = ref(new Date().toISOString().slice(0, 10));
const aboTurno = ref('');
const aboRutaId = ref('');
const aboManifiesto = ref<any | null>(null);
const aboCargando = ref(false);
const aboError = ref('');

const kpiAbordadosPanel = computed(() => aboManifiesto.value?.total_abordados ?? null);

async function consultarAbordajes() {
  if (!aboRutaId.value) { aboError.value = 'Selecciona una ruta.'; return; }
  aboCargando.value = true;
  aboError.value = '';
  try {
    aboManifiesto.value = await obtenerManifiestoAbordajes({
      fecha: aboFecha.value,
      id_ruta: aboRutaId.value,
      turno: aboTurno.value || null,
    });
    if (!aboManifiesto.value) aboError.value = 'Sin manifiesto para los filtros seleccionados.';
  } catch (e: unknown) {
    aboError.value = e instanceof Error ? e.message : 'Error al cargar abordajes.';
    aboManifiesto.value = null;
  } finally {
    aboCargando.value = false;
  }
}

function formatearHoraAbo(valor: string | null | undefined): string {
  if (!valor) return '—';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

// ── Panel Métricas ──
const metFecha = ref(new Date().toISOString().slice(0, 10));
const metDatos = ref<MetricasDiariasDoc | null>(null);
const metCargando = ref(false);
const metError = ref('');

const metRutasArr = computed(() => {
  if (!metDatos.value) return [];
  return Object.entries(metDatos.value.rutas || {}).map(([id, item]) => ({ id, ...item }));
});

async function consultarMetricas() {
  metCargando.value = true;
  metError.value = '';
  try {
    const data = await obtenerMetricasDiarias(metFecha.value);
    metDatos.value = data;
    if (!data) metError.value = 'Sin métricas materializadas para esa fecha.';
  } catch (e: unknown) {
    metError.value = e instanceof Error ? e.message : 'Error al cargar métricas.';
    metDatos.value = null;
  } finally {
    metCargando.value = false;
  }
}

// ── KPIs ──
const kpiOcupacionPromedio = computed(() => {
  const con = rutas.value.filter((r) => r.porcentaje_ocupacion_max != null)
  if (!con.length) return 0
  const sum = con.reduce((acc, r) => acc + (r.porcentaje_ocupacion_max ?? 0), 0)
  return Math.round(sum / con.length)
})

const kpiBajaOcupacion = computed(() =>
  rutas.value.filter((r) => r.porcentaje_ocupacion_max != null && r.porcentaje_ocupacion_max < 40).length
)

const kpiPasajerosTotal = computed(() =>
  rutas.value.reduce((acc, r) => acc + (r.asientos_ocupados ?? 0), 0)
);

const rutasBajoAforo = computed(() =>
  rutas.value.filter((r) => r.porcentaje_ocupacion_max != null && r.porcentaje_ocupacion_max < 40)
    .sort((a, b) => (a.porcentaje_ocupacion_max ?? 0) - (b.porcentaje_ocupacion_max ?? 0))
);

const rutasSortedOcupacion = computed(() =>
  [...rutas.value].sort((a, b) => (b.porcentaje_ocupacion_max ?? 0) - (a.porcentaje_ocupacion_max ?? 0))
);

const rutasSortedPasajeros = computed(() =>
  [...rutas.value].sort((a, b) => (b.asientos_ocupados ?? 0) - (a.asientos_ocupados ?? 0))
);

const cantidadPasajerosRuta = (ruta: Ruta | null) => {
  if (!ruta) return 0;
  if (Array.isArray(ruta.pasajeros_ids)) return ruta.pasajeros_ids.length;
  return numeroSeguro(ruta.asientos_ocupados, 0);
};

const pasajerosActualesUnidad = computed(() => cantidadPasajerosRuta(rutaUnidadSeleccionada.value));

// Estados de carga específicos para las exportaciones
const exportandoExcel = ref(false);
const exportandoAsignaciones = ref(false); // Estado para el segundo botón

// --- UTILIDADES ---
const numeroSeguro = (valor: unknown, fallback = 0): number => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : fallback;
};

const obtenerNumeroSemana = (fecha: Date): number => {
  const fechaUTC = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const diaSemana = fechaUTC.getUTCDay() || 7;
  fechaUTC.setUTCDate(fechaUTC.getUTCDate() + 4 - diaSemana);
  const inicioAno = new Date(Date.UTC(fechaUTC.getUTCFullYear(), 0, 1));
  return Math.ceil((((fechaUTC.getTime() - inicioAno.getTime()) / 86400000) + 1) / 7);
};

const semanaActualStr = (): string => {
  const hoy = new Date();
  const num = obtenerNumeroSemana(hoy);
  return `${hoy.getFullYear()}-W${String(num).padStart(2, '0')}`;
};

const semanaNumero = (weekStr: string): number => {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekStr);
  return m ? parseInt(m[2] || '0', 10) : obtenerNumeroSemana(new Date());
};

const normalizarFechaISO = (valor: unknown): string | null => {
  if (!valor) return null;
  const fecha = new Date(String(valor));
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString().slice(0, 10);
};

filtroSemana.value = semanaActualStr();

const normalizarRuta = (ruta: RutaApi): Ruta => {
  const capacidadLimite = numeroSeguro(ruta.capacidad_limite, 0);
  const asientosOcupados = numeroSeguro(ruta.asientos_ocupados, 0);
  const capacidadOperativaRuta = capacidadLimite > 0 ? capacidadLimite : numeroSeguro(ruta.capacidad_real, 0);
  const estadoProgramacion = String(ruta.estado_programacion ?? ruta.estado ?? 'activa').toLowerCase();
  const tipoUnidad = String(ruta.tipo_unidad ?? ruta['tipo de unidad'] ?? 'N/D');

  const ocupacionBackend = numeroSeguro(ruta.ocupacion_pct, -1);
  const ocupacionCalculada = ocupacionBackend >= 0
    ? ocupacionBackend
    : capacidadLimite > 0
      ? (asientosOcupados / capacidadLimite) * 100
      : numeroSeguro(ruta.porcentaje_ocupacion_max, 0);

  const maxPasajerosOperativo = capacidadLimite > 0 || asientosOcupados > 0
    ? asientosOcupados
    : numeroSeguro(ruta.max_pasajeros_dia, 0);

  return {
  id: String(ruta.id ?? ''),
  ruta: numeroSeguro(ruta.ruta, 0),
  zona: ruta.zona ? String(ruta.zona) : undefined,
  'tipo de unidad': tipoUnidad,
  tipo_unidad: tipoUnidad,
  codigo_unidad: ruta.codigo_unidad ? String(ruta.codigo_unidad) : null,
  capacidad_real: capacidadOperativaRuta,
  capacidad_limite: capacidadLimite > 0 ? capacidadLimite : undefined,
  asientos_ocupados: capacidadLimite > 0 ? asientosOcupados : undefined,
  asientos_disponibles: numeroSeguro(ruta.asientos_disponibles, Math.max(capacidadOperativaRuta - asientosOcupados, 0)),
  pasajeros_ids: Array.isArray(ruta.pasajeros_ids) ? ruta.pasajeros_ids.map((id) => String(id)) : [],
  max_pasajeros_dia: maxPasajerosOperativo,
  porcentaje_ocupacion_max: ocupacionCalculada,
  ocupacion_pct: ocupacionCalculada,
  fuente_datos: ruta.fuente_datos ? String(ruta.fuente_datos) : undefined,
  alerta_ocupacion: String(ruta.alerta_ocupacion ?? 'N/D'),
  sugerencia_right_sizing: String(ruta.sugerencia_right_sizing ?? 'Sin sugerencia'),
  fecha_operacion: normalizarFechaISO(ruta.fecha_operacion ?? ruta.fecha ?? ruta.dia),
  semana_operacion: numeroSeguro(ruta.semana_operacion ?? ruta.semana ?? ruta.week, 0) || null,
  programada: typeof ruta.programada === 'boolean' ? ruta.programada : undefined,
  programacion_id: ruta.programacion_id ? String(ruta.programacion_id) : undefined,
  turno_programado: ruta.turno_programado ? String(ruta.turno_programado) : null,
  estado: estadoProgramacion,
  estado_programacion: estadoProgramacion,
  cancelada: ruta.cancelada === true || estadoProgramacion === 'cancelada',
  motivo_cancelacion: ruta.motivo_cancelacion ? String(ruta.motivo_cancelacion) : null
  };
};

const obtenerOcupacionSegura = (ruta: Ruta): number => numeroSeguro(ruta.porcentaje_ocupacion_max, 0);
const formatearOcupacion = (ruta: Ruta): string => obtenerOcupacionSegura(ruta).toFixed(1);
const capacidadOperativa = (ruta: Ruta): number => numeroSeguro(ruta.capacidad_limite, ruta.capacidad_real || 0);
const tipoUnidadRuta = (ruta: Ruta): string => String(ruta.tipo_unidad || ruta['tipo de unidad'] || 'N/D');
const rutaEstaCancelada = (ruta: Ruta): boolean => ruta.cancelada === true || ruta.estado_programacion === 'cancelada' || ruta.estado === 'cancelada';

const rutaTieneDatosOperativos = (ruta: Ruta): boolean =>
  ruta.programada === true || numeroSeguro(ruta.asientos_ocupados, 0) > 0;

const obtenerEstadoOperativo = (ruta: Ruta): string => {
  if (rutaEstaCancelada(ruta)) return 'CANCELADA';
  if (!rutaTieneDatosOperativos(ruta)) return 'SIN PROGRAMACIÓN';
  return obtenerOcupacionSegura(ruta) < 40 ? 'CRÍTICO (< 40%)' : 'ÓPTIMO';
};

const obtenerRecomendacionOperativa = (ruta: Ruta): string => {
  if (rutaEstaCancelada(ruta)) return 'RUTA CANCELADA';
  if (!rutaTieneDatosOperativos(ruta)) return 'SIN DATOS DEL DÍA';

  const ocupacion = obtenerOcupacionSegura(ruta);
  if (ocupacion >= 40) return 'MANTENER';

  const sugerencia = String(ruta.sugerencia_right_sizing || '').toUpperCase();
  if (sugerencia.includes('CAMBIAR')) return 'CAMBIAR UNIDAD';
  if (sugerencia.includes('CANCELAR') || String(ruta.alerta_ocupacion || '').includes('CANCELAR')) {
    return 'EVALUAR CANCELACIÓN';
  }

  return 'REVISAR AFORO';
};

const rutasOperativas = computed(() => {
  if (filtroPeriodo.value === 'todos') {
    return rutasFiltradas.value;
  }

  return rutasFiltradas.value.filter((ruta) => rutaTieneDatosOperativos(ruta));
});

const rutasFiltradas = computed(() => {
  return rutas.value.filter((ruta) => {
    const terminoRuta = filtroRutaTexto.value;
    if (terminoRuta.trim() && !coincideBusqueda(terminoRuta, 'ruta', ruta.ruta, ruta.zona, ruta.id, ruta['tipo de unidad'])) {
      return false;
    }

    const ocupacion = obtenerOcupacionSegura(ruta);

    const cumpleOcupacion =
      filtroOcupacion.value === 'todas' ||
      (filtroOcupacion.value === 'baja' && ocupacion < 40) ||
      (filtroOcupacion.value === 'media' && ocupacion >= 40 && ocupacion < 80) ||
      (filtroOcupacion.value === 'alta' && ocupacion >= 80);

    if (!cumpleOcupacion) return false;

    if (filtroPeriodo.value === 'dia') {
      return true;
    }

    if (filtroPeriodo.value === 'semana') {
      return true;
    }

    return true;
  });
});

const limpiarFiltros = () => {
  filtroPeriodo.value = 'dia';
  filtroOcupacion.value = 'todas';
  filtroRutaTexto.value = '';
  filtroDia.value = new Date().toISOString().slice(0, 10);
  filtroSemana.value = semanaActualStr();
};

// --- MÉTODOS API (Frente 2) ---
const obtenerRutas = async () => {
  cargando.value = true;
  error.value = null;

  try {
    const headers = await authHeaders();
    const respuesta = await fetch(`${API_BASE_URL}/api/rutas`, { headers });
    if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
    const json = await respuesta.json();
    const data = Array.isArray(json?.data) ? json.data : [];
    rutas.value = data
      .map((ruta: RutaApi) => normalizarRuta(ruta))
      .sort((a: Ruta, b: Ruta) => a.ruta - b.ruta);
  } catch (err: any) {
    error.value = err.message || 'Error al cargar rutas.';
  } finally {
    cargando.value = false;
  }
};

const obtenerRutasProgramadasPorDia = async (fecha: string) => {
  cargando.value = true;
  error.value = null;

  try {
    const headers = await authHeaders();
    const params = new URLSearchParams({ fecha });
    const respuesta = await fetch(`${API_BASE_URL}/api/rutas/programadas?${params.toString()}`, { headers });
    if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
    const json = await respuesta.json();
    const data = Array.isArray(json?.data) ? json.data : [];
    rutas.value = data
      .map((ruta: RutaApi) => normalizarRuta(ruta))
      .sort((a: Ruta, b: Ruta) => a.ruta - b.ruta);
  } catch (err: any) {
    error.value = err.message || 'Error al cargar rutas programadas por día.';
  } finally {
    cargando.value = false;
  }
};

const obtenerRutasProgramadasPorSemana = async (semana: number) => {
  cargando.value = true;
  error.value = null;

  try {
    const headers = await authHeaders();
    const params = new URLSearchParams({
      semana: String(semana),
      anio: String(anioOperacion.value)
    });
    const respuesta = await fetch(`${API_BASE_URL}/api/rutas/programadas/rango?${params.toString()}`, { headers });
    if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
    const json = await respuesta.json();
    const data = Array.isArray(json?.data) ? json.data : [];
    rutas.value = data
      .map((ruta: RutaApi) => normalizarRuta(ruta))
      .sort((a: Ruta, b: Ruta) => a.ruta - b.ruta);
  } catch (err: any) {
    error.value = err.message || 'Error al cargar rutas programadas por semana.';
  } finally {
    cargando.value = false;
  }
};

const recargarRutasSegunFiltro = async () => {
  if (filtroPeriodo.value === 'dia') {
    await obtenerRutasProgramadasPorDia(filtroDia.value);
    return;
  }

  if (filtroPeriodo.value === 'semana') {
    await obtenerRutasProgramadasPorSemana(semanaNumero(filtroSemana.value));
    return;
  }

  await obtenerRutas();
};

watch(
  () => [filtroPeriodo.value, filtroDia.value, filtroSemana.value],
  async ([periodoActual], [periodoAnterior]) => {
    if (periodoActual === 'dia' && !filtroDia.value) {
      filtroDia.value = new Date().toISOString().slice(0, 10);
      return;
    }
    if (periodoActual === 'dia') {
      await obtenerRutasProgramadasPorDia(filtroDia.value);
      return;
    }

    if (periodoActual === 'semana') {
      await obtenerRutasProgramadasPorSemana(semanaNumero(filtroSemana.value));
      return;
    }

    if (periodoAnterior === 'dia' || periodoAnterior === 'semana') {
      await obtenerRutas();
    }
  }
);

const onPlanActualizado = async () => {
  await recargarRutasSegunFiltro();
};

const abrirModalUnidad = (ruta: Ruta) => {
  rutaUnidadSeleccionada.value = ruta;
  const tipoInicial = tipoUnidadRuta(ruta);
  const preset = ['Van', 'Sprinter', 'Autobús', 'Camión'].includes(tipoInicial) ? tipoInicial : 'Otro';

  formUnidad.value = {
    fecha: fechaOperacion.value,
    tipoPreset: preset,
    tipoUnidad: tipoInicial,
    capacidadLimite: ruta.capacidad_limite || capacidadPorTipoUnidad(tipoInicial) || capacidadOperativa(ruta),
    codigoUnidad: ruta.codigo_unidad || '',
    motivo: ruta.porcentaje_ocupacion_max < 40
      ? 'Ajuste operativo por bajo aforo.'
      : 'Asignación manual de unidad operativa.',
  };

  if (formUnidad.value.capacidadLimite < pasajerosActualesUnidad.value) {
    formUnidad.value.capacidadLimite = Math.max(pasajerosActualesUnidad.value, formUnidad.value.capacidadLimite);
  }

  errorModalUnidad.value = null;
  modalUnidadVisible.value = true;
};

const cerrarModalUnidad = () => {
  if (guardandoUnidad.value) return;
  modalUnidadVisible.value = false;
  rutaUnidadSeleccionada.value = null;
  errorModalUnidad.value = null;
};

const resolverTipoUnidadFormulario = () =>
  formUnidad.value.tipoPreset === 'Otro'
    ? formUnidad.value.tipoUnidad
    : formUnidad.value.tipoPreset;

const aplicarPresetCapacidad = () => {
  const tipo = resolverTipoUnidadFormulario();
  formUnidad.value.tipoUnidad = tipo;
  const minima = Math.max(pasajerosActualesUnidad.value, capacidadPorTipoUnidad(tipo));
  formUnidad.value.capacidadLimite = minima;
};

const guardarUnidad = async () => {
  const ruta = rutaUnidadSeleccionada.value;
  if (!ruta) return;

  const tipoUnidad = resolverTipoUnidadFormulario();
  const capacidad = Number(formUnidad.value.capacidadLimite);

  if (!tipoUnidad || !Number.isInteger(capacidad) || capacidad <= 0) {
    errorModalUnidad.value = 'Completa tipo de unidad y capacidad válida.';
    return;
  }

  if (capacidad < pasajerosActualesUnidad.value) {
    errorModalUnidad.value = 'La capacidad no puede ser menor a los pasajeros actuales.';
    return;
  }

  guardandoUnidad.value = true;
  procesandoRutaId.value = ruta.id;
  errorModalUnidad.value = null;

  try {
    await cambiarUnidadProgramacion({
      id_ruta: ruta.id,
      fecha: formUnidad.value.fecha,
      tipo_unidad: tipoUnidad,
      capacidad_limite: capacidad,
      codigo_unidad: formUnidad.value.codigoUnidad || null,
      motivo: formUnidad.value.motivo || 'Asignación manual de unidad operativa.',
    });

    cerrarModalUnidad();
    await recargarRutasSegunFiltro();
  } catch (err: unknown) {
    errorModalUnidad.value = err instanceof Error ? err.message : 'No se pudo asignar la unidad.';
  } finally {
    guardandoUnidad.value = false;
    procesandoRutaId.value = null;
  }
};

const intentarDeshabilitarRuta = async (ruta: Ruta) => {
  const confirmar = await dialogConfirm(
    `¿Deshabilitar la Ruta ${ruta.ruta}? Dejará de aparecer en asignaciones, pero podrás habilitarla después.`,
    { title: 'Deshabilitar ruta', confirmLabel: 'Deshabilitar', cancelLabel: 'Cancelar' }
  );
  if (!confirmar) return;

  procesandoRutaId.value = ruta.id;

  try {
    const headers = await authHeaders();
    const respuesta = await fetch(`${API_BASE_URL}/api/rutas/${encodeURIComponent(ruta.id)}`, {
      method: 'DELETE',
      headers,
    });

    const payload = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      if (Array.isArray(payload?.empleados_a_reasignar) && payload.empleados_a_reasignar.length) {
        rutaBloqueoSeleccionada.value = {
          ...ruta,
          empleados_a_reasignar: payload.empleados_a_reasignar,
        };
        modalBloqueoVisible.value = true;
      }
      throw new Error(payload?.message || 'No se pudo deshabilitar la ruta.');
    }

    await recargarRutasSegunFiltro();
  } catch (err: unknown) {
    if (!modalBloqueoVisible.value) {
      await dialogAlert(err instanceof Error ? err.message : 'Error deshabilitando la ruta.', { title: 'Error' });
    }
  } finally {
    procesandoRutaId.value = null;
  }
};

const cerrarModalBloqueo = () => {
  modalBloqueoVisible.value = false;
  rutaBloqueoSeleccionada.value = null;
};

const irAAsignaciones = () => {
  cerrarModalBloqueo();
  router.push('/admin/asignaciones');
};

const activarInsights = () => {
  if (cargandoInsights.value) return;

  if (mostrarInsights.value) {
    // Ya están cargados — regenerar
    recomendacionesRef.value?.cargarInsights();
  } else {
    cargandoInsights.value = true;
    mostrarInsights.value = true;
  }
};

const onInsightsCargandoChange = (cargando: boolean) => {
  cargandoInsights.value = cargando;
};

// --- EXPORTACIONES (ExcelJS) ---

// Función 1: Exportar Programación Operativa (Rutas)
const exportarTablaExcel = async () => {
  exportandoExcel.value = true;
  try {
    const rutasExportar = rutasOperativas.value;
    if (!rutasExportar.length) {
      await dialogAlert('No hay rutas con programación operativa para exportar en el periodo seleccionado.', { title: 'Sin datos' });
      exportandoExcel.value = false;
      return;
    }

    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Programación de Rutas');

    // Definir anchos y llaves de columnas SIN la propiedad "header"
    // para evitar que ExcelJS sobrescriba la Fila 1 automáticamente
    worksheet.columns = [
      { key: 'ruta', width: 15 },
      { key: 'tipo_unidad', width: 18 },
      { key: 'cap_real', width: 12 },
      { key: 'ocupacion', width: 15 },
      { key: 'estado', width: 20 },
      { key: 'recomendacion', width: 25 }
    ];

    // Estilos Corporativos (Encabezado Negro en Fila 1)
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'ILPEA - PROGRAMACIÓN DE RUTAS'; 
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;

    // Encabezados Reales en la Fila 2 (Verde)
    const headerRow = worksheet.getRow(2);
    headerRow.values = ['RUTA', 'TIPO UNIDAD', 'CAP. REAL', '% OCUPACIÓN', 'ESTADO', 'RECOMENDACIÓN SISTEMA'];
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF107C41' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });
    headerRow.height = 25;

    // Datos
    rutasExportar.forEach(ruta => {
      const ocupacion = obtenerOcupacionSegura(ruta);
      const estado = obtenerEstadoOperativo(ruta);
      const recomendacion = obtenerRecomendacionOperativa(ruta);

      const row = worksheet.addRow({
        ruta: `Ruta ${ruta.ruta}`,
        tipo_unidad: tipoUnidadRuta(ruta),
        cap_real: capacidadOperativa(ruta),
        ocupacion: `${ocupacion.toFixed(1)}%`,
        estado: estado,
        recomendacion: recomendacion
      });

      // Estilo base para las filas de datos (alineación centrada)
      row.eachCell((cell) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { bottom: {style:'thin', color: {argb: 'FFEEEEEE'}} };
      });

      // Resaltado ROJO si está en estado crítico
      if (rutaEstaCancelada(ruta)) {
        row.eachCell((cell) => {
          cell.font = { color: { argb: 'FF475569' }, bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        });
      } else if (rutaTieneDatosOperativos(ruta) && ocupacion < 40) {
        row.eachCell((cell) => {
          cell.font = { color: { argb: 'FFFF0000' }, bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Programacion_Rutas_ILPEA_${fechaOperacion.value}.xlsx`);
  } catch (error) {
    console.error(error);
    await dialogAlert('Error al exportar rutas.', { title: 'Error' });
  } finally {
    exportandoExcel.value = false;
  }
};

// --- NUEVA FUNCIÓN: Catálogo de Asignaciones (Basado en imagen image_e0da00.png) ---
const exportarAsignacionesExcel = async () => {
  exportandoAsignaciones.value = true;
  
  try {
    const { default: ExcelJS } = await import('exceljs');
    // 1. Consultar datos al Backend (Asumiendo endpoint en Frente 2/OCI)
    const headers = await authHeaders();
    // NOTA OPERATIVA: Asegúrate de tener este endpoint '/api/usuarios-asignados' configurado en tu backend
    const params = new URLSearchParams({ fecha: fechaOperacion.value });
    const respuesta = await fetch(`${API_BASE_URL}/api/usuarios-asignados?${params.toString()}`, { headers });
    
    if (!respuesta.ok) throw new Error('No se pudieron obtener los datos de asignaciones.');
    
    const json = await respuesta.json();
    const asignacionesCrudas: any[] = Array.isArray(json?.data) ? json.data : [];

    // Normalización/Blindaje de datos de asignación
    const asignaciones: UsuarioAsignado[] = asignacionesCrudas.map(asig => ({
      num_control: asig.num_control || 'S/N',
      nombre: asig.nombre || 'Desconocido',
      puesto: asig.puesto || '',
      dpto: asig.dpto || '',
      turno: asig.turno || '',
      empresa: asig.empresa || 'ILPEA',
      horario_entrada: asig.horario_entrada || '',
      horario_salida: asig.horario_salida || '',
      dias_trabajo: asig.dias_trabajo || '',
      domicilio: asig.domicilio || '',
      colonia: asig.colonia || '',
      referencia: asig.referencia || '',
      ruta_asignada: asig.ruta_asignada ? `Ruta ${asig.ruta_asignada}` : 'SIN RUTA',
      parada_asignada: asig.parada_asignada || 'S/P',
      estatus: asig.estatus || 'REGISTRADO'
    }));

    const asignacionesExportar = filtroPeriodo.value === 'todos'
      ? asignaciones
      : asignaciones.filter((asig) => asig.ruta_asignada !== 'SIN RUTA');

    if (!asignacionesExportar.length) {
      await dialogAlert('No hay asignaciones registradas para la fecha seleccionada.', { title: 'Sin datos' });
      exportandoAsignaciones.value = false;
      return;
    }

    // 2. Configurar Workbook ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Asignaciones Personal');

    // 3. Encabezado Corporativo (Negro) - Abarca las 15 columnas
    worksheet.mergeCells('A1:O1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'ILPEA - CATÁLOGO DE ASIGNACIONES DE PERSONAL';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;

    // 4. Definición exacta de Columnas (según imagen)
    worksheet.columns = [
      { header: 'NUM CONTROL', key: 'num_control', width: 15 },
      { header: 'NOMBRE', key: 'nombre', width: 35 },
      { header: 'PUESTO', key: 'puesto', width: 20 },
      { header: 'DPTO', key: 'dpto', width: 15 },
      { header: 'TURNO', key: 'turno', width: 12 },
      { header: 'EMPRESA', key: 'empresa', width: 12 },
      { header: 'HORARIO ENTRADA', key: 'horario_entrada', width: 18 },
      { header: 'HORARIO SALIDA', key: 'horario_salida', width: 18 },
      { header: 'DÍAS TRABAJO', key: 'dias_trabajo', width: 20 },
      { header: 'DOMICILIO', key: 'domicilio', width: 40 },
      { header: 'COLONIA', key: 'colonia', width: 25 },
      { header: 'REFERENCIA', key: 'referencia', width: 30 },
      { header: 'RUTA ASIGNADA', key: 'ruta_asignada', width: 18 },
      { header: 'PARADA ASIGNADA', key: 'parada_asignada', width: 30 },
      { header: 'ESTATUS', key: 'estatus', width: 15 }
    ];

    // 5. Estilo Encabezados de Columna (Verde)
    const headerRow = worksheet.getRow(2);
    // Asignamos valores manualmente para asegurar mayúsculas exactas de la imagen
    headerRow.values = [
      'NUM CONTROL', 'NOMBRE', 'PUESTO', 'DPTO', 'TURNO', 'EMPRESA', 
      'HORARIO ENTRADA', 'HORARIO SALIDA', 'DÍAS TRABAJO', 
      'DOMICILIO', 'COLONIA', 'REFERENCIA', 
      'RUTA ASIGNADA', 'PARADA ASIGNADA', 'ESTATUS'
    ];
    
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF107C41' } }; // Verde Excel
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    headerRow.height = 25;

    // 6. Agregar Datos con estilos básicos
    asignacionesExportar.forEach(asig => {
      const row = worksheet.addRow(asig);
      
      // Estilo por defecto para la fila de datos
      row.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 9 };
        cell.alignment = { vertical: 'middle' };
        cell.border = { bottom: {style:'thin', color: {argb: 'FFEEEEEE'}} };
      });

      // Alineación centrada para columnas específicas
      row.getCell('num_control').alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell('turno').alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell('empresa').alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell('horario_entrada').alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell('horario_salida').alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell('ruta_asignada').alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell('estatus').alignment = { horizontal: 'center', vertical: 'middle' };

      // --- RESALTADO CONDICIONAL (Clave de la imagen) ---
      // Si la RUTA ASIGNADA (Columna M) es "SIN RUTA", aplicamos texto rojo y fondo rosa pálido
      if (asig.ruta_asignada === 'SIN RUTA') {
         // Accedemos a la celda específica M (columna 13)
         row.getCell('ruta_asignada').font = { color: { argb: 'FFFF0000' }, bold: true }; // Rojo bold
         row.getCell('ruta_asignada').fill = { type: 'pattern', pattern: 'solid', fgColor: {argb: 'FFFEE2E2'} }; // Rosa suave alert
      }
    });

    // 7. Descargar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Catalogo_Asignaciones_ILPEA_${fechaOperacion.value}.xlsx`);

  } catch (error: any) {
    console.error('Error Catálogo Excel:', error);
    await dialogAlert(`Ocurrió un error al generar el catálogo: ${error.message}`, { title: 'Error' });
  } finally {
    exportandoAsignaciones.value = false;
  }
};

// --- CICLO DE VIDA ---
function cerrarOcupDropdown() { ocupDropdownOpen.value = false; }

onMounted(() => {
  obtenerRutasProgramadasPorDia(filtroDia.value);
  cargarTurnos();
  document.addEventListener('click', cerrarOcupDropdown);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', cerrarOcupDropdown);
});
</script>

<style scoped>
/* Estilos existentes intactos */
.admin-layout { display: flex; min-height: 100vh; background: #f8f9fa; font-family: 'Inter', system-ui, sans-serif; color: #1a1a1a; }
.main-content { flex: 1; padding: 3rem; }
.header-flex { display: flex; justify-content: space-between; align-items: flex-start; }
.content-header { margin-bottom: 2rem; }
.content-header h2 { margin: 0; font-size: 1.5rem; }
.content-header p { color: #666; font-size: 0.9rem; margin-top: 0.5rem; }
.fuente-datos { margin-top: 0.35rem; }
.badge { display: inline-block; padding: 0.2rem 0.55rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
.badge-live { background: #dcfce7; color: #166534; }
.badge-ref { background: #e2e8f0; color: #475569; }

/* NUEVOS Estilos para el grupo de botones */
.button-group { display: flex; gap: 10px; align-items: center; }

.btn-exportar { background: #000; color: #fff; border: none; padding: 0.7rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem; transition: 0.3s; }
.btn-exportar:hover { background: #333; }
.btn-exportar:disabled { background: #888; cursor: not-allowed; opacity: 0.7; }

/* Estilo Verde Excel existente */
.excel-btn { background: #107c41; } 
.excel-btn:hover { background: #0c5e31; }

/* NUEVO Estilo para botón de asignaciones (Azul oscuro corporativo) */
.assignments-btn { background: #1e3a8a; } 
.assignments-btn:hover { background: #1e40af; }

/* Resto de estilos intactos... */
.charts-filter { margin-bottom: 1.5rem; display: flex; align-items: center; gap: 1rem; font-size: 0.9rem; }
.minimal-select { padding: 0.65rem 0.8rem; border-radius: 8px; border: 1px solid var(--ilpea-border); outline: none; background: var(--ilpea-white); color: var(--ilpea-gray-900); font-family: inherit; font-size: 0.9rem; transition: border-color 0.2s, box-shadow 0.2s; }
.minimal-select:focus { border-color: var(--ilpea-accent); box-shadow: 0 0 0 3px rgba(16, 124, 65, 0.12); }
.filters-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem; margin-bottom: 1.5rem; }
.filters-header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
.filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.9rem; margin-top: 0.8rem; align-items: end; }
.filter-item { display: flex; flex-direction: column; gap: 0.45rem; flex: 1; min-width: 180px; }
.filter-item label { font-size: 0.8rem; font-weight: 600; color: #475569; }
.filter-item .minimal-select { width: 100%; height: auto; box-sizing: border-box; }

/* ── Island period selector ── */
.filter-item--island { gap: 0.45rem; }
.period-island {
  position: relative;
  display: inline-flex;
  align-self: flex-start;
  background: #1a1a1a;
  border-radius: 999px;
  padding: 5px;
  gap: 0;
}
.period-btn {
  position: relative;
  z-index: 2;
  width: 70px;
  padding: 7px 0;
  border: none;
  background: transparent;
  border-radius: 999px;
  color: #999;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  transition: color 0.3s ease, transform 0.15s ease;
}
.period-btn.active {
  color: #fff;
  transform: translateY(-1px);
}
.period-btn:active { transform: scale(0.92); }
.period-indicator {
  position: absolute;
  top: 5px;
  left: 5px;
  width: 70px;
  height: calc(100% - 10px);
  background: #333;
  border-radius: 999px;
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  z-index: 1;
}

/* ── Radio dropdown de ocupación ── */
.filter-item--radio { gap: 0.45rem; }
.filter-radio-label { font-size: 0.85rem; font-weight: 600; color: #374151; }

.radio-dropdown { position: relative; }

.radio-dropdown__trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.7rem;
  border: 1.5px solid var(--ilpea-border);
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: border-color 0.18s, box-shadow 0.18s;
  width: 100%;
}
.radio-dropdown--open .radio-dropdown__trigger,
.radio-dropdown__trigger:hover {
  border-color: var(--ilpea-accent);
  box-shadow: 0 0 0 3px rgba(16,124,65,0.1);
}
.radio-dropdown__chevron {
  margin-left: auto;
  color: #9ca3af;
  flex-shrink: 0;
  transition: transform 0.2s;
}
.radio-dropdown--open .radio-dropdown__chevron { transform: rotate(180deg); }

.radio-dropdown__panel {
  position: fixed;
  z-index: 9999;
  min-width: 170px;
  padding: 0.4rem 0;
  background: #fff;
  border: 1px solid var(--ilpea-border);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15,23,42,0.13);
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.55rem 0.85rem;
  cursor: pointer;
  transition: background 0.14s;
}
.radio-option:hover { background: #f3f4f6; }

/* Círculo base */
.radio-circle {
  flex-shrink: 0;
  width: 18px; height: 18px;
  border-radius: 50%;
  border: 2px solid;
  background: transparent;
  transition: background 0.22s, box-shadow 0.22s;
}
.radio-circle--neutral { border-color: #9ca3af; }
.radio-circle--alta    { border-color: #22c55e; }
.radio-circle--media   { border-color: #eab308; }
.radio-circle--baja    { border-color: #ef4444; }

/* Relleno cuando está seleccionado */
.radio-circle--filled.radio-circle--neutral { background: #9ca3af; box-shadow: 0 0 7px 1px rgba(156,163,175,0.5); }
.radio-circle--filled.radio-circle--alta    { background: #22c55e; box-shadow: 0 0 7px 1px rgba(34,197,94,0.5); }
.radio-circle--filled.radio-circle--media   { background: #eab308; box-shadow: 0 0 7px 1px rgba(234,179,8,0.5); }
.radio-circle--filled.radio-circle--baja    { background: #ef4444; box-shadow: 0 0 7px 1px rgba(239,68,68,0.5); }

.radio-option:hover .radio-circle--neutral { box-shadow: 0 0 5px 1px rgba(156,163,175,0.3); }
.radio-option:hover .radio-circle--alta    { box-shadow: 0 0 5px 1px rgba(34,197,94,0.3); }
.radio-option:hover .radio-circle--media   { box-shadow: 0 0 5px 1px rgba(234,179,8,0.3); }
.radio-option:hover .radio-circle--baja    { box-shadow: 0 0 5px 1px rgba(239,68,68,0.3); }

.radio-text { font-size: 0.83rem; color: #374151; user-select: none; }
.filters-info { margin: 0.8rem 0 0; font-size: 0.85rem; color: #6b7280; }
.charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; margin-bottom: 3rem; }
.chart-item { background: #fff; padding: 1.5rem; border-radius: 12px; border: 1px solid #e0e0e0; min-height: 300px; }
.chart-item-small { grid-column: span 1; }
.section-title { font-size: 1.1rem; margin-bottom: 1rem; color: #333; }
.ia-block {
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-header-inline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0;
}

.section-header-inline .section-title {
  margin-bottom: 0;
}

.ia-block-content,
.ia-block-empty {
  margin: 0;
}

.ia-block-empty {
  padding: 1.5rem 1rem;
}

.pdf-wrapper { background-color: #ffffff; padding: 1.5rem; border-radius: 8px; }
.table-card { background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 0; }
.minimal-table { width: 100%; border-collapse: collapse; }
.minimal-table th { background: #fafafa; padding: 1rem; text-align: left; font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
.minimal-table td { padding: 1.2rem 1rem; border-top: 1px solid #f0f0f0; font-size: 0.9rem; }
.minimal-table tr.row-alert td { background-color: #fef2f2 !important; }
.minimal-table tr.row-cancelled td { background-color: #f8fafc !important; color: #64748b; }
.occupancy-cell { display: flex; align-items: center; gap: 12px; }
.bar-bg { flex: 1; background: #eee; height: 6px; border-radius: 10px; overflow: hidden; min-width: 100px; }
.bar-fill { height: 100%; transition: 0.4s ease; }
.bar-fill.ok { background-color: #10b981 !important; }
.bar-fill.low { background-color: #ef4444 !important; }
.tag { padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; }
.tag-ok { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
.tag-alert { background: #fff1f2; color: #991b1b; border: 1px solid #fecdd3; }
.tag-cancelled { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
.tag-pending { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }
.status-box { padding: 4rem; text-align: center; color: #888; }
.error-msg { color: #ef4444; }
.btn-manage { background: none; border: 1px solid #ddd; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
.btn-manage:disabled { cursor: not-allowed; opacity: 0.5; }

/* Botón "Cargar" de Recomendaciones IA — chispa animada con letras (estilo UIVerse, hue ILPEA) */
.btn-ia-wrapper {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
  align-self: flex-start;
}

.btn-ia-cargar {
  --border-radius: 24px;
  --padding: 4px;
  --transition: 0.4s;
  --button-color: #101010;
  --highlight-color-hue: 147deg;

  position: relative;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.55em 0.9em 0.55em 0.9em;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  color: #fff;
  background-color: var(--button-color);
  box-shadow:
    inset 0px 1px 1px rgba(255, 255, 255, 0.2),
    inset 0px 2px 2px rgba(255, 255, 255, 0.15),
    inset 0px 4px 4px rgba(255, 255, 255, 0.1),
    inset 0px 8px 8px rgba(255, 255, 255, 0.05),
    inset 0px 16px 16px rgba(255, 255, 255, 0.05),
    0px -1px 1px rgba(0, 0, 0, 0.02),
    0px -2px 2px rgba(0, 0, 0, 0.03),
    0px -4px 4px rgba(0, 0, 0, 0.05),
    0px -8px 8px rgba(0, 0, 0, 0.06),
    0px -16px 16px rgba(0, 0, 0, 0.08);
  border: solid 1px #fff2;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: box-shadow var(--transition), border var(--transition), background-color var(--transition);
}

.btn-ia-cargar::before {
  content: '';
  position: absolute;
  top: calc(0px - var(--padding));
  left: calc(0px - var(--padding));
  width: calc(100% + var(--padding) * 2);
  height: calc(100% + var(--padding) * 2);
  border-radius: calc(var(--border-radius) + var(--padding));
  pointer-events: none;
  background-image: linear-gradient(0deg, #0004, #000a);
  z-index: -1;
  transition: box-shadow var(--transition), filter var(--transition);
  box-shadow:
    0 -8px 8px -6px #0000 inset,
    0 -16px 16px -8px #00000000 inset,
    1px 1px 1px #fff2,
    2px 2px 2px #fff1,
    -1px -1px 1px #0002,
    -2px -2px 2px #0001;
}

.btn-ia-cargar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  pointer-events: none;
  background-image: linear-gradient(
    0deg,
    #fff,
    hsl(var(--highlight-color-hue), 100%, 70%),
    hsla(var(--highlight-color-hue), 100%, 70%, 50%),
    8%,
    transparent
  );
  background-position: 0 0;
  opacity: 0;
  transition: opacity var(--transition), filter var(--transition);
}

.btn-ia-svg {
  width: 18px;
  height: 18px;
  margin-right: 0.45rem;
  fill: #e8e8e8;
  animation: btn-ia-flicker 2s linear infinite;
  animation-delay: 0.5s;
  filter: drop-shadow(0 0 2px #fff9);
  transition: fill var(--transition), filter var(--transition), opacity var(--transition);
}

@keyframes btn-ia-flicker {
  50% { opacity: 0.35; }
}

.btn-ia-txt {
  position: relative;
  z-index: 1;
  display: inline-block;
  white-space: nowrap;
}

.btn-ia-letter {
  display: inline-block;
  color: #fff5;
  animation: btn-ia-letter-anim 2s ease-in-out infinite;
  transition: color var(--transition), text-shadow var(--transition);
}

@keyframes btn-ia-letter-anim {
  50% {
    text-shadow: 0 0 3px #fff8;
    color: #fff;
  }
}

.btn-ia-cargar:hover {
  border: solid 1px hsla(var(--highlight-color-hue), 100%, 80%, 40%);
}

.btn-ia-cargar:hover::before {
  box-shadow:
    0 -8px 8px -6px #fffa inset,
    0 -16px 16px -8px hsla(var(--highlight-color-hue), 100%, 70%, 30%) inset,
    1px 1px 1px #fff2,
    2px 2px 2px #fff1,
    -1px -1px 1px #0002,
    -2px -2px 2px #0001;
}

.btn-ia-cargar:hover::after {
  opacity: 1;
  mask-image: linear-gradient(0deg, #fff, transparent);
}

.btn-ia-cargar:hover .btn-ia-svg {
  fill: #fff;
  filter: drop-shadow(0 0 3px hsl(var(--highlight-color-hue), 100%, 70%)) drop-shadow(0 -4px 6px #0009);
  animation: none;
}

.btn-ia-cargar:active:not(:disabled) {
  border: solid 1px hsla(var(--highlight-color-hue), 100%, 80%, 70%);
  background-color: hsla(var(--highlight-color-hue), 50%, 20%, 0.5);
}

.btn-ia-cargar:active:not(:disabled)::before {
  box-shadow:
    0 -8px 12px -6px #fffa inset,
    0 -16px 16px -8px hsla(var(--highlight-color-hue), 100%, 70%, 80%) inset,
    1px 1px 1px #fff4,
    2px 2px 2px #fff2,
    -1px -1px 1px #0002,
    -2px -2px 2px #0001;
}

.btn-ia-cargar:active:not(:disabled)::after {
  opacity: 1;
  mask-image: linear-gradient(0deg, #fff, transparent);
  filter: brightness(200%);
}

.btn-ia-cargar:active:not(:disabled) .btn-ia-letter {
  text-shadow: 0 0 1px hsla(var(--highlight-color-hue), 100%, 90%, 90%);
  animation: none;
}

.btn-ia-cargar.is-loading::after {
  opacity: 0.6;
  mask-image: linear-gradient(0deg, #fff, transparent);
}

.btn-ia-cargar.is-loading .btn-ia-letter {
  animation: btn-ia-letter-anim 0.9s ease-in-out infinite;
}

.btn-ia-cargar.is-loading .btn-ia-svg {
  animation-duration: 1s;
}

.btn-ia-cargar:disabled {
  cursor: not-allowed;
  opacity: 0.75;
}

.btn-retry { margin-top: 1rem; padding: 0.5rem 1rem; cursor: pointer; background: #000; color: #fff; border: none; border-radius: 4px; }
.empty-row { text-align: center; color: #6b7280; font-style: italic; }

.ruta-acciones {
  min-width: 220px;
}

.unidad-modal {
  width: min(560px, 95vw);
}

.bloqueo-modal {
  width: min(760px, 95vw);
}

.unidad-intro,
.bloqueo-intro {
  margin: 0 0 1rem;
  line-height: 1.5;
}

.bloqueo-tabla {
  max-height: 320px;
  margin-bottom: 1rem;
}

.unidad-modal label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: #334155;
}

.unidad-modal input,
.unidad-modal select,
.unidad-modal textarea {
  font-weight: 400;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
}

.estado-ok,
.estado-error {
  margin: 0 0 0.75rem;
  padding: 0.65rem 0.8rem;
  border-radius: 8px;
  font-size: 0.85rem;
}

.estado-ok {
  background: #ecfdf5;
  color: #065f46;
}

.estado-error {
  background: #fee2e2;
  color: #991b1b;
}
@media print { .no-print { display: none !important; } }

/* ── KPIs ── */
.kpis-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 0;
}
.kpi-card {
  background: #fff;
  border: 1px solid var(--ilpea-border);
  border-radius: 12px;
  padding: 1.1rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
}
.kpi-card:hover {
  border-color: var(--ilpea-accent);
  box-shadow: 0 2px 8px rgba(16, 124, 65, 0.12);
}
.kpi-card--active {
  border-color: var(--ilpea-accent);
  background: #f0fdf4;
  box-shadow: 0 0 0 2px rgba(16, 124, 65, 0.15);
}
.kpi-icon {
  width: 42px; height: 42px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.kpi-icon--blue   { background: #dbeafe; color: #1d4ed8; }
.kpi-icon--green  { background: #dcfce7; color: #15803d; }
.kpi-icon--red    { background: #fee2e2; color: #be123c; }
.kpi-icon--gray   { background: #f1f5f9; color: #475569; }
.kpi-icon--teal   { background: #ccfbf1; color: #0f766e; }
.kpi-icon--purple { background: #ede9fe; color: #7c3aed; }
.kpi-body { display: flex; flex-direction: column; flex: 1; }
.kpi-value { font-size: 1.6rem; font-weight: 800; color: var(--ilpea-black); line-height: 1; }
.kpi-label { font-size: 0.78rem; color: var(--ilpea-gray-500); margin-top: 0.25rem; }
.kpi-chevron {
  color: #94a3b8;
  flex-shrink: 0;
  transition: transform 0.25s ease;
}
.kpi-chevron--open { transform: rotate(180deg); color: var(--ilpea-accent); }

/* ── Panel expandible ── */
.kpi-expand-panel {
  background: #fff;
  border: 1px solid var(--ilpea-border);
  border-top: 3px solid var(--ilpea-accent);
  border-radius: 0 0 12px 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
}
.kpi-expand-enter-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.kpi-expand-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.kpi-expand-enter-from  { opacity: 0; transform: translateY(-6px); }
.kpi-expand-leave-to    { opacity: 0; transform: translateY(-4px); }

.kpi-panel-title {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.92rem; font-weight: 700; color: var(--ilpea-black);
  margin: 0 0 1rem;
}
.kpi-panel-content { display: flex; flex-direction: column; gap: 0; }

/* mini KPIs dentro del panel */
.kpi-mini-kpis {
  display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.5rem;
}
.kpi-mini {
  flex: 1; min-width: 90px;
  border: 1px solid #e2e8f0; border-radius: 10px;
  padding: 0.65rem 0.85rem;
  background: #f8fafc;
  display: flex; flex-direction: column; gap: 0.2rem;
}
.kpi-mini span { font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
.kpi-mini strong { font-size: 1.1rem; font-weight: 800; color: var(--ilpea-black); }
.kpi-mini--green strong { color: #15803d; }
.kpi-mini--red strong { color: #be123c; }

/* Barras horizontales */
.kpi-bars-list { display: flex; flex-direction: column; gap: 0.55rem; }
.kpi-bars-row { display: flex; align-items: center; gap: 0.75rem; }
.kpi-bars-label { font-size: 0.8rem; color: #374151; width: 60px; flex-shrink: 0; }
.kpi-bar-track {
  flex: 1; height: 10px; background: #e5e7eb; border-radius: 99px; overflow: hidden;
}
.kpi-bar-track--wide { height: 14px; }
.kpi-bar-fill {
  height: 100%; border-radius: 99px;
  background: var(--ilpea-accent);
  transition: width 0.4s ease;
}
.kpi-bar-fill--blue  { background: #3b82f6; }
.kpi-bar-fill--green { background: #22c55e; }
.kpi-bar-fill--red   { background: #ef4444; }
.kpi-bars-pct { font-size: 0.78rem; color: #374151; width: 52px; text-align: right; flex-shrink: 0; }

/* Tabla dentro del panel */
.kpi-panel-table-wrap { overflow-x: auto; margin-top: 0.75rem; }
.kpi-panel-table {
  width: 100%; border-collapse: collapse; min-width: 480px; font-size: 0.83rem;
}
.kpi-panel-table th {
  background: #f8fafc; color: #64748b; font-size: 0.72rem;
  text-transform: uppercase; letter-spacing: 0.04em;
  padding: 0.5rem 0.75rem; text-align: left;
  border-bottom: 1px solid #e2e8f0;
}
.kpi-panel-table td {
  padding: 0.55rem 0.75rem; border-bottom: 1px solid #f1f5f9; color: #0f172a;
}
.kpi-panel-table tr:last-child td { border-bottom: none; }
.kpi-empty { text-align: center; color: #94a3b8; padding: 1.5rem; }

/* badges */
.kpi-badge {
  display: inline-block; padding: 0.2rem 0.55rem; border-radius: 99px;
  font-size: 0.72rem; font-weight: 600;
}
.kpi-badge--green { background: #dcfce7; color: #15803d; }
.kpi-badge--red   { background: #fee2e2; color: #be123c; }
.kpi-badge--gray  { background: #f1f5f9; color: #475569; }

/* Formulario dentro del panel */
.kpi-form-row {
  display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: flex-end; margin-bottom: 1rem;
}
.kpi-form-label {
  display: flex; flex-direction: column; gap: 0.3rem;
  font-size: 0.8rem; font-weight: 600; color: #374151;
}
.kpi-input {
  border: 1px solid var(--ilpea-border); border-radius: 8px;
  padding: 0.65rem 0.8rem; font-size: 0.9rem;
  min-width: 150px;
  background: var(--ilpea-white); color: var(--ilpea-gray-900);
  font-family: inherit; transition: border-color 0.2s, box-shadow 0.2s;
}
.kpi-input:focus { outline: none; border-color: var(--ilpea-accent); box-shadow: 0 0 0 3px rgba(16, 124, 65, 0.12); }
.kpi-btn {
  padding: 0.5rem 1rem; border: none; border-radius: 8px;
  background: var(--ilpea-black); color: #fff;
  font-size: 0.85rem; font-weight: 600; cursor: pointer;
  transition: opacity 0.18s;
}
.kpi-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.kpi-btn:hover:not(:disabled) { background: #1a1a1a; }

@media (max-width: 768px) {
  .kpis-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .kpis-grid { grid-template-columns: 1fr; }
}


/* ── Header simplificado ── */
.header-flex { display: flex; justify-content: space-between; align-items: center; }
.content-header { margin-bottom: 1.5rem; }
.content-header h2 { margin: 0; font-size: 1.5rem; }

/* ── Filtros colapsables (Vuetify override) ── */
.filtros-panel {
  margin-bottom: 1.5rem;
  border-radius: 12px !important;
  overflow: visible !important;
}

/* Cerrado: borde verde brillante con halo */
.filtros-panel .v-expansion-panel:not(.v-expansion-panel--active) {
  border-radius: 12px !important;
  box-shadow:
    0 0 0 2px var(--ilpea-accent),
    0 0 14px 2px rgba(16, 124, 65, 0.35) !important;
  transition: box-shadow 0.3s ease;
}

/* Abierto: contorno muy tenue, sin halo */
.filtros-panel .v-expansion-panel.v-expansion-panel--active {
  border-radius: 12px !important;
  box-shadow: 0 0 0 1.5px rgba(16, 124, 65, 0.18) !important;
  transition: box-shadow 0.3s ease;
}

.filtros-panel .v-expansion-panel { background: #fff !important; }
.filtros-panel .v-expansion-panel-title { font-weight: 600; font-size: 0.9rem; padding: 0.85rem 1.1rem; min-height: unset; }
.filtros-panel .v-expansion-panel-text__wrapper { padding: 0 1.1rem 1rem; }
.filtros-panel-title-inner { display: flex; align-items: center; gap: 0.5rem; }
.filtros-badge {
  margin-left: auto;
  font-size: 0.72rem; font-weight: 700;
  background: var(--ilpea-black); color: #fff;
  padding: 0.15rem 0.55rem; border-radius: 999px;
}
.filters-actions { margin-top: 0.75rem; }

/* ── Tabla: fila cabecera con botón exportar ── */
.tabla-header-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 0.75rem;
}
.tabla-header-row .section-title { margin: 0; }


/* RESPONSIVIDAD PARA MÓVILES Y TABLETS */
@media (max-width: 768px) {
  .admin-layout { flex-direction: column; }
  .main-content { padding: 1.5rem 1rem; }
  
  .header-flex { flex-direction: column; gap: 1.5rem; align-items: stretch; }
  .button-group { flex-direction: column; width: 100%; }
  .btn-exportar { width: 100%; }
  
  .filters-header { flex-direction: column; align-items: flex-start; }
  .filters-grid { grid-template-columns: 1fr; }
  .section-header-inline { flex-direction: column; align-items: stretch; gap: 1rem; }
  
  .charts-filter { flex-direction: column; align-items: flex-start; }
  .charts-filter select { width: 100%; }
  
  /* Habilita scroll en la tabla para no romper la pantalla */
  .table-card { overflow-x: auto; }
  .minimal-table { min-width: 800px; }
}

/* Turno Grouped Select Styles */
.dia-grupo { display: flex; align-items: center; gap: 0.5rem; }
.dia-grupo__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: #0f172a;
  color: #fff;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  flex-shrink: 0;
}
.kpi-dropdown-wrapper :deep(.app-select) {
  margin-top: 0;
  min-width: 220px;
}
.kpi-dropdown-wrapper :deep(.app-select__button) {
  padding: 0.4rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background-color: white;
  min-height: 38px;
}
.kpi-dropdown-wrapper :deep(.app-select__button:focus) {
  outline: none;
  border-color: var(--ilpea-accent);
  box-shadow: 0 0 0 3px rgba(16, 124, 65, 0.12);
}
</style>