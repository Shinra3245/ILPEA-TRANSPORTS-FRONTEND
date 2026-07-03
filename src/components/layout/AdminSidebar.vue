<template>
  <aside class="sidebar">
    <button
      type="button"
      class="brand brand-btn"
      :class="{ 'brand-btn--activo': datosPruebaActivos }"
      title=""
      aria-label="ILPEA Admin"
      @click="manejarClicSecreto"
    >
      ILPEA <span>ADMIN</span>
    </button>

    <p v-if="mensajeDatosPrueba" class="datos-prueba-toast" role="status">{{ mensajeDatosPrueba }}</p>
    <nav class="nav-menu">
      <button
        type="button"
        @click="router.push('/admin')"
        :class="['nav-item', { active: route.path === '/admin' }]"
      >
        Dashboard
      </button>
      <button
        type="button"
        @click="router.push('/admin/rutas')"
        :class="['nav-item', { active: route.path.startsWith('/admin/rutas') }]"
      >
        Gestión de rutas
      </button>
      <button
        type="button"
        @click="router.push('/admin/calendario')"
        :class="['nav-item', { active: route.path === '/admin/calendario' }]"
      >
        Calendario
      </button>
      <button
        type="button"
        @click="router.push('/admin/usuarios/admins')"
        :class="['nav-item', { active: route.path === '/admin/usuarios/admins' }]"
      >
        Admins
      </button>
      <button
        type="button"
        @click="router.push('/admin/usuarios/jefes')"
        :class="['nav-item', { active: route.path === '/admin/usuarios/jefes' }]"
      >
        Jefes
      </button>
      <button
        type="button"
        @click="router.push('/admin/usuarios/empleados')"
        :class="['nav-item', { active: route.path === '/admin/usuarios/empleados' }]"
      >
        Empleados
      </button>
      <button
        type="button"
        @click="router.push('/admin/usuarios/camioneros')"
        :class="['nav-item', { active: route.path === '/admin/usuarios/camioneros' }]"
      >
        Camioneros
      </button>
      <button
        type="button"
        @click="router.push('/admin/turnos')"
        :class="['nav-item', { active: route.path === '/admin/turnos' }]"
      >
        Turnos
      </button>
      <button
        type="button"
        @click="router.push('/admin/unidades')"
        :class="['nav-item', { active: route.path === '/admin/unidades' }]"
      >
        Unidades
      </button>
      <button
        type="button"
        @click="router.push('/admin/programacion-semanal')"
        :class="['nav-item', { active: route.path === '/admin/programacion-semanal' || route.path === '/admin/asignaciones' }]"
      >
        Programación semanal
      </button>
    </nav>
    <button type="button" @click="cerrarSesion" class="logout-btn">Cerrar Sesión</button>
  </aside>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '../../composables/useAuth';

const router = useRouter();
const route = useRoute();
const { logout, authHeaders } = useAuth();

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const CLICS_REQUERIDOS = 5;
const VENTANA_CLICS_MS = 2500;

const clicsSecreto = ref(0);
const temporizadorClics = ref<ReturnType<typeof setTimeout> | null>(null);
const alternandoDatosPrueba = ref(false);
const datosPruebaActivos = ref(false);
const mensajeDatosPrueba = ref('');

async function consultarEstadoDatosPrueba() {
  try {
    const headers = await authHeaders();
    const respuesta = await fetch(`${API_BASE_URL}/api/datos-prueba/estado`, { headers });
    const data = await respuesta.json();
    if (respuesta.ok && data.success) {
      datosPruebaActivos.value = data.activo === true;
    }
  } catch {
    // Silencioso: el botón secreto no debe interrumpir la navegación
  }
}

function mostrarMensajeTemporal(texto: string, duracionMs = 5000) {
  mensajeDatosPrueba.value = texto;
  window.setTimeout(() => {
    if (mensajeDatosPrueba.value === texto) {
      mensajeDatosPrueba.value = '';
    }
  }, duracionMs);
}

async function alternarDatosPrueba() {
  if (alternandoDatosPrueba.value) {
    return;
  }

  alternandoDatosPrueba.value = true;
  try {
    const headers = await authHeaders();
    const respuesta = await fetch(`${API_BASE_URL}/api/datos-prueba/toggle`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    });
    const data = await respuesta.json();

    if (!respuesta.ok || !data.success) {
      mostrarMensajeTemporal(data.message || 'No se pudo alternar los datos de prueba.');
      return;
    }

    const resultado = data.data || {};
    datosPruebaActivos.value = resultado.activo === true;

    if (resultado.accion === 'generado') {
      const resumen = [
        `${resultado.jefes ?? 2} jefes`,
        `${resultado.empleados ?? 4} empleados`,
        `${resultado.camioneros ?? 2} camioneros`,
        `${resultado.asignaciones_semanal ?? 0} asignaciones`,
      ].join(' · ');
      mostrarMensajeTemporal(`Datos de prueba creados (${resumen}). Contraseña: IlpeaPrueba123!`, 8000);
    } else {
      mostrarMensajeTemporal('Datos de prueba eliminados sin afectar registros existentes.');
    }
  } catch {
    mostrarMensajeTemporal('Error de conexión al alternar datos de prueba.');
  } finally {
    alternandoDatosPrueba.value = false;
  }
}

function manejarClicSecreto() {
  clicsSecreto.value += 1;

  if (temporizadorClics.value) {
    clearTimeout(temporizadorClics.value);
  }

  if (clicsSecreto.value >= CLICS_REQUERIDOS) {
    clicsSecreto.value = 0;
    alternarDatosPrueba();
    return;
  }

  temporizadorClics.value = setTimeout(() => {
    clicsSecreto.value = 0;
    temporizadorClics.value = null;
  }, VENTANA_CLICS_MS);
}

async function cerrarSesion() {
  await logout();
  router.push('/login');
}

onMounted(() => {
  consultarEstadoDatosPrueba();
});
</script>

<style scoped>
.sidebar {
  width: 240px;
  background: var(--ilpea-black);
  color: var(--ilpea-white);
  padding: 2rem 1rem 2rem 1.25rem;
  display: flex;
  flex-direction: column;
}

.brand {
  font-weight: 800;
  font-size: 1.2rem;
  margin-bottom: 3rem;
}

.brand-btn {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: default;
  user-select: none;
}

.brand-btn--activo span {
  color: #4ade80;
}

.datos-prueba-toast {
  margin: -2rem 0 1.5rem;
  padding: 0.55rem 0.65rem;
  border-radius: 8px;
  background: rgba(74, 222, 128, 0.12);
  border: 1px solid rgba(74, 222, 128, 0.35);
  color: #bbf7d0;
  font-size: 0.72rem;
  line-height: 1.35;
}

.brand span {
  color: #666;
  font-weight: 400;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-bottom: 2rem;
}

.nav-item {
  position: relative;
  display: block;
  width: 100%;
  background: transparent;
  border: none;
  color: #888;
  text-align: left;
  padding: 0.7rem 0.75rem 0.7rem 1.1rem;
  cursor: pointer;
  border-radius: 5px;
  font-size: 0.88rem;
  transition: background 0.18s, color 0.18s;
}

/* Barra de acento izquierda */
.nav-item::before {
  content: '';
  position: absolute;
  top: 15%;
  left: -1px;
  width: 4px;
  height: 70%;
  background-color: var(--ilpea-accent);
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.18s;
}

.nav-item:hover {
  background-color: rgba(255, 255, 255, 0.06);
  color: var(--ilpea-white);
}

.nav-item.active {
  background-color: rgba(255, 255, 255, 0.09);
  color: var(--ilpea-white);
}

.nav-item.active::before {
  opacity: 1;
}

.logout-btn {
  background: var(--ilpea-danger);
  color: var(--ilpea-white);
  padding: 0.8rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 700;
  transition: background 0.3s;
  width: 100%;
}

.logout-btn:hover {
  background: #b91c1c;
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    padding: 1.5rem;
    align-items: center;
  }

  .brand {
    margin-bottom: 1.5rem;
  }

  .nav-menu {
    width: 100%;
  }

  .nav-item {
    text-align: center;
  }
}
</style>
