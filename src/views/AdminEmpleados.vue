<template>
  <div class="admin-layout">
    <AdminSidebar />

    <main class="main-content">
      <header class="content-header">
        <div>
          <h2>Gestión de Empleados</h2>
          <p class="subtitle">Alta, edición y baja de empleados.</p>
        </div>
        <AppInfoButton title="Gestión de Empleados">
          <p>Administra el catálogo de <strong>empleados</strong> asignados al servicio de transporte ILPEA.</p>
          <ul>
            <li><strong>Crear empleado:</strong> se genera una cuenta y se envía correo con credenciales. Cada empleado queda vinculado a un jefe de turno.</li>
            <li><strong>Editar:</strong> actualiza nombre, correo, jefe asignado, contraseña y estado.</li>
            <li><strong>Eliminar:</strong> borra la cuenta permanentemente e desvincula al empleado de sus rutas.</li>
            <li><strong>Exportar Excel:</strong> descarga la lista filtrada de empleados con su jefe asignado.</li>
          </ul>
          <p>Un empleado inactivo no puede iniciar sesión ni aparecerá en la programación de nuevas rutas.</p>
        </AppInfoButton>
      </header>

      <EmpleadoCrudPanel />
    </main>
  </div>
</template>

<script setup lang="ts">
import AdminSidebar from '../components/layout/AdminSidebar.vue';
import EmpleadoCrudPanel from '../components/EmpleadoCrudPanel.vue';
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
