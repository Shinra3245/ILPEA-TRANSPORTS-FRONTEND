import { useAuth } from './useAuth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface UnidadTurno {
  vehiculo_id?: string | null;
  tipo?: string | null;
  codigo?: string | null;
  capacidad?: number | null;
}

export interface ProgramacionSemanalItem {
  /** Clave Firestore: {semana}_{id_empleado}_{turno_id} */
  id: string;
  semana: string;
  id_empleado: string;
  empleado_nombre: string;
  ruta_id: string;
  ruta_numero?: number | null;
  ruta_nombre?: string | null;
  turno_id?: string | null;
  turno_nombre?: string | null;
  asiento?: number | null;
  unidad?: UnidadTurno | null;
  parada?: { id?: string | null; nombre?: string | null; orden?: number | null } | null;
}

export interface EmpleadoSinAsignar {
  uid: string;
  id_empleado: string;
  nombre?: string | null;
  jefe_uid?: string | null;
}

export interface VehiculoCatalogo {
  id: string;
  codigo?: string | null;
  tipo?: string | null;
  capacidad?: number | null;
  placas?: string | null;
  estado?: string | null;
  ruta_numero?: number | null;
  es_plantilla?: boolean;
}

export interface TurnoCatalogo {
  id: string;
  nombre?: string | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  orden?: number | null;
  dia_semana?: number | null;
  dia_nombre?: string | null;
  tipo?: string | null;
  dias_operacion?: number[] | null;
  es_plantilla?: boolean;
  activo?: boolean;
  deshabilitado_en?: string | null;
}

export interface AbordajePayload {
  fecha: string;
  id_ruta: string;
  turno?: string | null;
  id_empleado: string;
  abordo: boolean;
}

export interface AbordajeItem {
  id_empleado: string;
  nombre: string;
  asiento?: number | null;
  parada_id?: string | null;
  abordo: boolean;
  hora_abordaje?: string | null;
}

export interface CalendarioRutaDia {
  ruta: number;
  turno: string;
  turno_id?: string | null;
  estado: string;
  asientos_ocupados: number;
  capacidad_limite: number;
  cancelada: boolean;
  deshabilitada?: boolean;
  planificada?: boolean;
  id_ruta?: string | null;
  programacion_id?: string | null;
}

export interface CalendarioDiaResumen {
  total: number;
  rutas: CalendarioRutaDia[];
}

export type CalendarioRutasPorDia = Record<string, CalendarioDiaResumen>;

export interface CalendarioPasajeroDetalle {
  id_empleado: string;
  nombre: string;
  asiento?: number | null;
  parada_id?: string | null;
  abordo: boolean;
  hora_abordaje?: string | null;
}

export interface CalendarioProgramacionDetalle {
  programacion_id: string;
  fecha: string | null;
  turno: string | null;
  turno_id?: string | null;
  estado: string;
  cancelada: boolean;
  motivo_cancelacion?: string | null;
  semana_origen?: string | null;
  ruta?: {
    id: string;
    numero?: number | null;
    zona?: string | null;
    tipo_unidad?: string | null;
  } | null;
  vehiculo?: Record<string, unknown> | null;
  codigo_unidad?: string | null;
  tipo_unidad?: string | null;
  asientos_ocupados: number;
  capacidad_limite: number;
  asientos_disponibles: number;
  ocupacion_pct: number;
  total_abordados: number;
  pasajeros: CalendarioPasajeroDetalle[];
}

export interface MetricasDiariasDoc {
  fecha: string;
  rutas: Record<string, {
    numero?: number | null;
    turno_id?: string | null;
    capacidad: number;
    asignados: number;
    abordados: number;
    ocupacion_pct: number;
    estado: string;
  }>;
  totales: {
    rutas_programadas: number;
    rutas_activas: number;
    rutas_canceladas: number;
    asignados: number;
    abordados: number;
  };
}

async function leerJsonSeguro(respuesta: Response) {
  return respuesta.json().catch(() => ({}));
}

export function useOperacionModulos() {
  const { authHeaders } = useAuth();

  const fetchAutorizado = async (url: string, init: RequestInit = {}) => {
    const headersAuth = await authHeaders();
    const headers = {
      ...(init.headers || {}),
      ...headersAuth,
    };

    let respuesta: Response;
    try {
      respuesta = await fetch(url, { ...init, headers });
    } catch {
      throw new Error(
        `No se pudo conectar con el backend (${API_BASE_URL}). Verifica que esté corriendo con "npm run dev" en la carpeta backend.`,
      );
    }

    const json = await leerJsonSeguro(respuesta);

    if (!respuesta.ok || json?.success === false) {
      throw new Error(json?.message || `Error ${respuesta.status}`);
    }

    return json;
  };

  const listarProgramacionSemanal = async (semana: string): Promise<ProgramacionSemanalItem[]> => {
    const query = new URLSearchParams({ semana }).toString();
    const json = await fetchAutorizado(`${API_BASE_URL}/api/programacion-semanal?${query}`);
    const data = Array.isArray(json?.data) ? json.data : [];
    return data.map((item: Record<string, unknown>) => ({
      id: String(item.id || ''),
      semana: String(item.semana || semana),
      id_empleado: String(item.id_empleado || ''),
      empleado_nombre: String(item.empleado_nombre || item.id_empleado || ''),
      ruta_id: String(item.ruta_id || ''),
      ruta_numero: item.ruta_numero != null ? Number(item.ruta_numero) : null,
      ruta_nombre: item.ruta_nombre ? String(item.ruta_nombre) : null,
      turno_id: item.turno_id ? String(item.turno_id) : null,
      turno_nombre: item.turno_nombre ? String(item.turno_nombre) : null,
      asiento: item.asiento != null ? Number(item.asiento) : null,
      unidad: item.unidad && typeof item.unidad === 'object'
        ? item.unidad as UnidadTurno
        : null,
      parada: item.parada && typeof item.parada === 'object'
        ? item.parada as ProgramacionSemanalItem['parada']
        : null,
    }));
  };

  const crearProgramacionSemanal = async (payload: {
    semana: string;
    id_empleado: string;
    ruta_id: string;
    turno_id?: string | null;
    parada_id?: string | null;
    asiento?: number | null;
  }) => {
    const json = await fetchAutorizado(`${API_BASE_URL}/api/programacion-semanal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return json?.data;
  };

  const materializarSemana = async (semana: string) => {
    const json = await fetchAutorizado(`${API_BASE_URL}/api/programacion-semanal/materializar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ semana }),
    });
    return json;
  };

  const listarVehiculos = async (): Promise<VehiculoCatalogo[]> => {
    const json = await fetchAutorizado(`${API_BASE_URL}/api/vehiculos`);
    const data = Array.isArray(json?.data) ? json.data : [];
    return data.map((item: Record<string, unknown>) => ({
      id: String(item.id || ''),
      codigo: item.codigo ? String(item.codigo) : null,
      tipo: item.tipo ? String(item.tipo) : null,
      capacidad: item.capacidad != null ? Number(item.capacidad) : null,
      placas: item.placas ? String(item.placas) : null,
      estado: item.estado ? String(item.estado) : null,
      ruta_numero: item.ruta_numero != null ? Number(item.ruta_numero) : null,
      es_plantilla: item.es_plantilla === true,
    }));
  };

  const crearUnidad = async (payload: {
    id?: string | null;
    codigo: string;
    tipo: string;
    capacidad: number;
    placas?: string | null;
    ruta_numero?: number | null;
  }) => {
    const json = await fetchAutorizado(`${API_BASE_URL}/api/vehiculos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return json?.data;
  };

  const actualizarUnidad = async (id: string, payload: {
    codigo?: string | null;
    tipo?: string | null;
    capacidad?: number | null;
    placas?: string | null;
    ruta_numero?: number | null;
    estado?: string | null;
  }) => {
    const json = await fetchAutorizado(`${API_BASE_URL}/api/vehiculos/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return json?.data;
  };

  const eliminarUnidad = async (id: string) => {
    await fetchAutorizado(`${API_BASE_URL}/api/vehiculos/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  };

  const listarTurnos = async (opciones?: { incluirInactivos?: boolean }): Promise<TurnoCatalogo[]> => {
    const params = new URLSearchParams();
    if (opciones?.incluirInactivos) {
      params.set('incluir_inactivos', '1');
    }
    const query = params.toString();
    const json = await fetchAutorizado(`${API_BASE_URL}/api/turnos${query ? `?${query}` : ''}`);
    const data = Array.isArray(json?.data) ? json.data : [];
    return data.map((item: Record<string, unknown>) => ({
      id: String(item.id || ''),
      nombre: item.nombre ? String(item.nombre) : null,
      hora_inicio: item.hora_inicio ? String(item.hora_inicio) : null,
      hora_fin: item.hora_fin ? String(item.hora_fin) : null,
      orden: item.orden != null ? Number(item.orden) : null,
      dia_semana: item.dia_semana != null ? Number(item.dia_semana) : null,
      dia_nombre: item.dia_nombre ? String(item.dia_nombre) : null,
      tipo: item.tipo ? String(item.tipo) : null,
      dias_operacion: Array.isArray(item.dias_operacion)
        ? item.dias_operacion.map((d) => Number(d))
        : null,
      es_plantilla: item.es_plantilla === true,
      activo: item.activo !== false,
      deshabilitado_en: item.deshabilitado_en ? String(item.deshabilitado_en) : null,
    }));
  };

  const crearTurno = async (payload: {
    id?: string | null;
    nombre: string;
    dia_semana: number;
    tipo: string;
    hora_inicio?: string | null;
    hora_fin?: string | null;
    orden?: number | null;
  }) => {
    const json = await fetchAutorizado(`${API_BASE_URL}/api/turnos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return json?.data;
  };

  const actualizarTurno = async (id: string, payload: {
    nombre?: string | null;
    hora_inicio?: string | null;
    hora_fin?: string | null;
    orden?: number | null;
    activo?: boolean;
  }) => {
    const json = await fetchAutorizado(`${API_BASE_URL}/api/turnos/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return json?.data;
  };

  const deshabilitarTurno = async (id: string) => {
    await fetchAutorizado(`${API_BASE_URL}/api/turnos/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  };

  const habilitarTurno = async (id: string) => {
    const json = await fetchAutorizado(`${API_BASE_URL}/api/turnos/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: true }),
    });
    return json?.data;
  };

  const crearRuta = async (payload: {
    ruta: number;
    nombre?: string | null;
    zona?: string | null;
    referencia?: string | null;
    turnos: string[];
    unidad_por_turno: Record<string, { vehiculo_id: string }>;
    paradas?: Array<{ nombre: string; zona?: string | null; orden?: number | null }>;
  }) => {
    const json = await fetchAutorizado(`${API_BASE_URL}/api/rutas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return json?.data;
  };

  const actualizarRuta = async (id: string, payload: {
    nombre?: string | null;
    zona?: string | null;
    turnos?: string[];
    unidad_por_turno?: Record<string, { vehiculo_id: string }>;
    paradas?: Array<{ nombre: string; zona?: string | null; orden?: number | null }>;
  }) => {
    const json = await fetchAutorizado(`${API_BASE_URL}/api/rutas/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return json?.data;
  };

  const eliminarProgramacionSemanal = async (id: string) => {
    await fetchAutorizado(`${API_BASE_URL}/api/programacion-semanal/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  };

  const listarEmpleadosSinAsignar = async (semana: string): Promise<EmpleadoSinAsignar[]> => {
    const query = new URLSearchParams({ semana }).toString();
    const json = await fetchAutorizado(`${API_BASE_URL}/api/programacion-semanal/sin-asignar?${query}`);
    const data = Array.isArray(json?.data) ? json.data : [];
    return data.map((item: Record<string, unknown>) => ({
      uid: String(item.uid || ''),
      id_empleado: String(item.id_empleado || ''),
      nombre: item.nombre ? String(item.nombre) : null,
      jefe_uid: item.jefe_uid ? String(item.jefe_uid) : null,
    }));
  };

  const obtenerManifiestoAbordajes = async (params: {
    fecha: string;
    id_ruta: string;
    turno?: string | null;
  }) => {
    const query = new URLSearchParams({
      fecha: params.fecha,
      id_ruta: params.id_ruta,
    });
    if (params.turno) {
      query.set('turno', params.turno);
    }

    const json = await fetchAutorizado(`${API_BASE_URL}/api/abordajes?${query.toString()}`);
    const data = json?.data || null;

    if (!data) {
      return null;
    }

    const manifiestoRaw = Array.isArray(data.manifiesto) ? data.manifiesto : [];
    const manifiesto: AbordajeItem[] = manifiestoRaw.map((item: Record<string, unknown>) => ({
      id_empleado: String(item.id_empleado || ''),
      nombre: String(item.nombre || item.id_empleado || ''),
      asiento: item.asiento != null ? Number(item.asiento) : null,
      parada_id: item.parada_id ? String(item.parada_id) : null,
      abordo: item.abordo === true,
      hora_abordaje: item.hora_abordaje ? String(item.hora_abordaje) : null,
    }));

    return {
      ...data,
      manifiesto,
    };
  };

  const registrarAbordaje = async (payload: AbordajePayload) => {
    const json = await fetchAutorizado(`${API_BASE_URL}/api/abordajes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return json?.data;
  };

  const ejecutarRollupMetricas = async (fecha: string): Promise<MetricasDiariasDoc> => {
    const json = await fetchAutorizado(`${API_BASE_URL}/api/metricas/rollup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha }),
    });
    return json?.data as MetricasDiariasDoc;
  };

  const obtenerMetricasDiarias = async (fecha: string): Promise<MetricasDiariasDoc | null> => {
    const query = new URLSearchParams({ fecha }).toString();
    const json = await fetchAutorizado(`${API_BASE_URL}/api/metricas/diarias?${query}`);
    return (json?.data || null) as MetricasDiariasDoc | null;
  };

  const obtenerMetricasRango = async (desde: string, hasta: string): Promise<MetricasDiariasDoc[]> => {
    const query = new URLSearchParams({ desde, hasta }).toString();
    const json = await fetchAutorizado(`${API_BASE_URL}/api/metricas/diarias/rango?${query}`);
    const data = Array.isArray(json?.data) ? json.data : [];
    return data as MetricasDiariasDoc[];
  };

  const obtenerCalendarioRutas = async (desde: string, hasta: string): Promise<CalendarioRutasPorDia> => {
    const query = new URLSearchParams({ desde, hasta }).toString();
    const json = await fetchAutorizado(`${API_BASE_URL}/api/rutas/calendario?${query}`);
    const dias = json?.dias;
    return dias && typeof dias === 'object' ? dias as CalendarioRutasPorDia : {};
  };

  const obtenerDetalleProgramacionCalendario = async (programacionId: string): Promise<CalendarioProgramacionDetalle> => {
    const query = new URLSearchParams({ programacion_id: programacionId }).toString();
    const json = await fetchAutorizado(`${API_BASE_URL}/api/rutas/calendario/detalle?${query}`);
    if (!json?.data) {
      throw new Error('No se encontró el detalle de la programación.');
    }
    return json.data as CalendarioProgramacionDetalle;
  };

  const cancelarProgramacion = async (payload: {
    ruta_id: string;
    fecha: string;
    turno?: string | null;
    motivo?: string;
  }): Promise<void> => {
    await fetchAutorizado(`${API_BASE_URL}/api/programacion/cancelar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ruta_origen_id: payload.ruta_id,
        fecha: payload.fecha,
        ...(payload.turno ? { turno: payload.turno } : {}),
        ...(payload.motivo ? { motivo: payload.motivo } : {}),
      }),
    });
  };

  return {
    listarProgramacionSemanal,
    crearProgramacionSemanal,
    eliminarProgramacionSemanal,
    listarEmpleadosSinAsignar,
    materializarSemana,
    listarVehiculos,
    crearUnidad,
    actualizarUnidad,
    eliminarUnidad,
    listarTurnos,
    crearTurno,
    actualizarTurno,
    deshabilitarTurno,
    habilitarTurno,
    crearRuta,
    actualizarRuta,
    obtenerManifiestoAbordajes,
    registrarAbordaje,
    ejecutarRollupMetricas,
    obtenerMetricasDiarias,
    obtenerMetricasRango,
    obtenerCalendarioRutas,
    obtenerDetalleProgramacionCalendario,
    cancelarProgramacion,
  };
}
