<template>
  <div class="admin-layout">
    <AdminSidebar />

    <main class="main-content">
      <header class="content-header">
        <div>
          <h2>Gestión de Administradores</h2>
          <p class="subtitle">Alta, edición y baja de cuentas con acceso al panel admin.</p>
        </div>
        <AppInfoButton title="Gestión de Administradores">
          <p>Esta vista permite administrar las cuentas con rol <strong>ADMIN</strong> en el sistema.</p>
          <ul>
            <li><strong>Crear admin:</strong> se genera una cuenta en Firebase Auth y se envía un correo con las credenciales de acceso.</li>
            <li><strong>Editar:</strong> puedes actualizar nombre, correo, contraseña y estado (activo / inactivo).</li>
            <li><strong>Eliminar:</strong> borra la cuenta permanentemente. Esta acción no se puede deshacer.</li>
            <li><strong>Exportar Excel:</strong> descarga la lista actual de administradores en formato .xlsx.</li>
          </ul>
          <p>No puedes eliminar ni desactivar tu propia cuenta desde esta pantalla.</p>
        </AppInfoButton>
      </header>

      <AdminCrudPanel />
    </main>
  </div>
</template>

<script setup lang="ts">
import AdminSidebar from '../components/layout/AdminSidebar.vue';
import AdminCrudPanel from '../components/AdminCrudPanel.vue';
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
