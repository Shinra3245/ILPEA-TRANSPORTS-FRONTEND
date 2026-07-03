<template>
  <div class="admin-layout">
    <AdminSidebar />

    <main class="main-content">
      <header class="content-header">
        <div>
          <h2>Catálogo de unidades</h2>
          <p class="subtitle">Flota ILPEA: tipo de unidad, capacidad y código operativo por ruta.</p>
        </div>
        <AppInfoButton title="Catálogo de unidades">
          <p>Administra las <strong>14 unidades base</strong> del reporte operativo ILPEA.</p>
          <ul>
            <li><strong>Nueva unidad:</strong> registra vehículos en el catálogo operativo.</li>
            <li>Los códigos Samsara (E0234, C0008…) pueden editarse cuando estén disponibles.</li>
          </ul>
          <p>Asigna unidades por turno en Gestión de rutas → Catálogo → Unidades.</p>
        </AppInfoButton>
      </header>

      <UnidadesCrudPanel />
    </main>
  </div>
</template>

<script setup lang="ts">
import AdminSidebar from '../components/layout/AdminSidebar.vue';
import AppInfoButton from '../components/ui/AppInfoButton.vue';
import UnidadesCrudPanel from '../components/UnidadesCrudPanel.vue';
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
  margin-bottom: 2rem;
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
