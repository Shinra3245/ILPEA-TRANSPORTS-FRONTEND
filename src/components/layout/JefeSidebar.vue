<template>
  <aside class="sidebar">
    <div class="brand">ILPEA <span>JEFE</span></div>
    <nav class="nav-menu">
      <button
        type="button"
        @click="router.push('/jefe/programacion-semanal')"
        :class="['nav-item', { active: route.path === '/jefe/programacion-semanal' || route.path === '/jefe' }]"
      >
        Programación semanal
      </button>
    </nav>
    <button type="button" @click="cerrarSesion" class="logout-btn">Cerrar Sesión</button>
  </aside>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '../../composables/useAuth';

const router = useRouter();
const route = useRoute();
const { logout } = useAuth();

async function cerrarSesion() {
  await logout();
  router.push('/login');
}
</script>

<style scoped>
.sidebar {
  width: 240px;
  flex-shrink: 0;
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

.brand span {
  color: #666;
  font-weight: 400;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
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
