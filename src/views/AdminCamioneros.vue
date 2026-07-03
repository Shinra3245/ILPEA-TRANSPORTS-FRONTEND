<template>
  <div class="admin-layout">
    <AdminSidebar />
    <main class="main-content">
      <header class="content-header">
        <div>
          <h2>Gestión de Camioneros</h2>
          <p class="subtitle">Alta, edición y asignación de camioneros a rutas.</p>
        </div>
        <AppInfoButton title="Gestión de Camioneros">
          <p>Administra los usuarios con rol <strong>Camionero</strong> para escaneo de asistencia por QR.</p>
          <ul>
            <li><strong>Crear camionero:</strong> genera cuenta, ID interno y credenciales de acceso.</li>
            <li><strong>Asignar ruta:</strong> vincula el camionero a una ruta activa para operación diaria.</li>
            <li><strong>Editar:</strong> actualiza datos, estado y ruta asignada.</li>
            <li><strong>Eliminar:</strong> borra la cuenta y libera su asignación de ruta.</li>
          </ul>
        </AppInfoButton>
      </header>

      <CamioneroCrudPanel />
    </main>
  </div>
</template>

<script setup lang="ts">
import AdminSidebar from '../components/layout/AdminSidebar.vue';
import CamioneroCrudPanel from '../components/CamioneroCrudPanel.vue';
import AppInfoButton from '../components/ui/AppInfoButton.vue';
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
