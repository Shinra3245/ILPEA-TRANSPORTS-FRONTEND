<template>
  <div class="admin-layout">
    <AdminSidebar />

    <main class="main-content">
      <header class="content-header">
        <div>
          <h2>Gestión de rutas</h2>
          <p class="subtitle">Seguimiento en vivo y administración del catálogo de rutas, turnos y unidades.</p>
        </div>
        <AppInfoButton title="Gestión de Rutas">
          <p>Esta vista agrupa dos módulos:</p>
          <ul>
            <li><strong>Seguimiento:</strong> acceso directo a los links de Samsara por ruta.</li>
            <li><strong>Catálogo de rutas:</strong> crear, editar turnos/unidades, habilitar o deshabilitar rutas.</li>
          </ul>
          <p>Para deshabilitar una ruta con pasajeros activos, primero debes reasignarlos en programación semanal.</p>
        </AppInfoButton>
      </header>

      <div class="rutas-tabs">
        <button
          type="button"
          :class="['rutas-tab-btn', { active: pestañaActiva === 'seguimiento' }]"
          @click="cambiarPestaña('seguimiento')"
        >
          Seguimiento
        </button>
        <button
          type="button"
          :class="['rutas-tab-btn', { active: pestañaActiva === 'catalogo' }]"
          @click="cambiarPestaña('catalogo')"
        >
          Catálogo de rutas
        </button>
      </div>

      <RutasSamsaraPanel v-if="pestañaActiva === 'seguimiento'" />
      <RutasCrudPanel v-else />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminSidebar from '../components/layout/AdminSidebar.vue';
import AppInfoButton from '../components/ui/AppInfoButton.vue';
import RutasSamsaraPanel from '../components/RutasSamsaraPanel.vue';
import RutasCrudPanel from '../components/RutasCrudPanel.vue';

type PestañaRutas = 'seguimiento' | 'catalogo';

const route = useRoute();
const router = useRouter();
const pestañaActiva = ref<PestañaRutas>('seguimiento');

function resolverPestañaDesdeQuery(): PestañaRutas {
  const tab = String(route.query.tab || '');
  if (tab === 'catalogo' || tab === 'administracion' || tab === 'generar') {
    return 'catalogo';
  }
  return 'seguimiento';
}

function cambiarPestaña(pestaña: PestañaRutas) {
  pestañaActiva.value = pestaña;
  const query = pestaña === 'seguimiento' ? {} : { tab: 'catalogo' };
  router.replace({ path: '/admin/rutas', query });
}

onMounted(() => {
  pestañaActiva.value = resolverPestañaDesdeQuery();
});

watch(
  () => route.query.tab,
  () => {
    pestañaActiva.value = resolverPestañaDesdeQuery();
  },
);
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #f8f9fa;
  font-family: 'Inter', system-ui, sans-serif;
  color: #1a1a1a;
  width: 100%;
}

.main-content {
  flex: 1;
  min-width: 0;
  padding: 3rem;
}

.content-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.content-header h2 {
  margin: 0 0 0.35rem 0;
  font-size: 1.5rem;
  color: #1a1a1a;
}

.subtitle {
  margin: 0;
  color: var(--ilpea-gray-500);
  font-size: 0.92rem;
  max-width: 52rem;
  line-height: 1.5;
}

.rutas-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.rutas-tab-btn {
  border: 1px solid var(--ilpea-border);
  background: var(--ilpea-white);
  color: var(--ilpea-gray-500);
  border-radius: 999px;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.rutas-tab-btn.active {
  background: var(--ilpea-black);
  border-color: var(--ilpea-black);
  color: var(--ilpea-white);
}

.rutas-tab-btn:hover:not(.active) {
  border-color: var(--ilpea-gray-500);
  color: var(--ilpea-gray-900);
}

@media (max-width: 768px) {
  .admin-layout {
    flex-direction: column;
  }

  .main-content {
    padding: 1.5rem 1rem;
  }
}
</style>
