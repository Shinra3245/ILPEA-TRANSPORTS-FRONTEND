<template>
  <div class="admin-layout">
    <AdminSidebar />

    <main class="main-content">
      <header class="content-header">
        <div>
          <h2>Catálogo de turnos</h2>
          <p class="subtitle">Plantilla semanal estilo Excel: día × tipo de turno (1er, 2do, Mixto, 3er).</p>
        </div>
        <AppInfoButton title="Catálogo de turnos">
          <p>Administra los <strong>26 turnos base</strong> de la semana operativa ILPEA.</p>
          <ul>
            <li><strong>Nuevo turno:</strong> añade un slot de turno al catálogo semanal.</li>
            <li><strong>Parrilla:</strong> vista rápida de la semana con conteo de rutas por turno.</li>
          </ul>
          <p>Tras migrar, reasigna turnos y unidades en Gestión de rutas → Catálogo.</p>
        </AppInfoButton>
      </header>

      <TurnosCrudPanel />
    </main>
  </div>
</template>

<script setup lang="ts">
import AdminSidebar from '../components/layout/AdminSidebar.vue';
import AppInfoButton from '../components/ui/AppInfoButton.vue';
import TurnosCrudPanel from '../components/TurnosCrudPanel.vue';
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
