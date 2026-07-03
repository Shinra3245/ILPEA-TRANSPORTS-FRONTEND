import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'Login', component: () => import('../views/Login.vue') },
    { path: '/auth/action', name: 'AuthAction', component: () => import('../views/AuthAction.vue') },
    { 
      path: '/admin', 
      name: 'Admin', 
      component: () => import('../views/AdminDashboard.vue'),
      meta: { requiresAuth: true, role: 'ADMIN' }
    },

    // --- CALENDARIO DE RUTAS ---
    {
      path: '/admin/calendario',
      name: 'CalendarioRutas',
      component: () => import('../views/CalendarioRutas.vue'),
      meta: { requiresAuth: true, role: 'ADMIN' }
    },

    // --- RUTA PARA GESTIÓN DE RUTAS ---
    {
      path: '/admin/rutas',
      name: 'GestionRutas',
      component: () => import('../views/GestionRutas.vue'),
      meta: { requiresAuth: true, role: 'ADMIN' }
    },
    {
      path: '/admin/rutas/eliminacion',
      redirect: { path: '/admin/rutas', query: { tab: 'catalogo' } },
    },

    // --- Gestión de usuarios (jefes y empleados por separado) ---
    {
      path: '/admin/usuarios',
      redirect: '/admin/usuarios/admins',
    },
    {
      path: '/admin/usuarios/admins',
      name: 'AdminAdmins',
      component: () => import('../views/AdminAdmins.vue'),
      meta: { requiresAuth: true, role: 'ADMIN' }
    },
    {
      path: '/admin/usuarios/jefes',
      name: 'AdminJefes',
      component: () => import('../views/AdminJefes.vue'),
      meta: { requiresAuth: true, role: 'ADMIN' }
    },
    {
      path: '/admin/usuarios/empleados',
      name: 'AdminEmpleados',
      component: () => import('../views/AdminEmpleados.vue'),
      meta: { requiresAuth: true, role: 'ADMIN' }
    },
    {
      path: '/admin/usuarios/camioneros',
      name: 'AdminCamioneros',
      component: () => import('../views/AdminCamioneros.vue'),
      meta: { requiresAuth: true, role: 'ADMIN' }
    },

    {
      // Unificado: las asignaciones ahora viven en la programación semanal.
      path: '/admin/asignaciones',
      redirect: '/admin/programacion-semanal',
    },
    {
      path: '/admin/turnos',
      name: 'AdminTurnos',
      component: () => import('../views/GestionTurnos.vue'),
      meta: { requiresAuth: true, role: 'ADMIN' }
    },
    {
      path: '/admin/unidades',
      name: 'AdminUnidades',
      component: () => import('../views/GestionUnidades.vue'),
      meta: { requiresAuth: true, role: 'ADMIN' }
    },
    {
      path: '/admin/programacion-semanal',
      name: 'AdminProgramacionSemanal',
      component: () => import('../views/ProgramacionSemanal.vue'),
      meta: { requiresAuth: true, role: 'ADMIN' }
    },

    {
      // Unificado: el panel del jefe ahora es la programación semanal.
      path: '/jefe',
      redirect: '/jefe/programacion-semanal',
    },
    {
      path: '/jefe/programacion-semanal',
      name: 'JefeProgramacionSemanal',
      component: () => import('../views/ProgramacionSemanal.vue'),
      meta: { requiresAuth: true, role: 'JEFE' }
    },
    {
      path: '/jefe/abordajes',
      redirect: '/jefe/programacion-semanal',
    },
    {
      path: '/jefe/metricas',
      redirect: '/jefe/programacion-semanal',
    },
    {
      path: '/empleado',
      name: 'Empleado',
      component: () => import('../views/EmpleadoDashboard.vue'),
      meta: { requiresAuth: true, role: 'EMPLEADO' }
    },
    {
      path: '/camionero',
      redirect: '/camionero/escaner',
    },
    {
      path: '/camionero/escaner',
      name: 'CamioneroEscaner',
      component: () => import('../views/CamioneroEscanerView.vue'),
      meta: { requiresAuth: true, role: 'CAMIONERO' }
    }
  ]
})

// GUARDIÁN DE NAVEGACIÓN (Se mantiene igual, está perfecto)
router.beforeEach(async (to, _from, next) => {
  const { restaurarSesion, obtenerRol } = useAuth()
  const autenticado = await restaurarSesion()
  const userRole = obtenerRol()

  if (to.meta.requiresAuth && !autenticado) {
    next('/login')
  } else if (to.meta.role && to.meta.role !== userRole) {
    if (userRole === 'ADMIN') next('/admin')
    else if (userRole === 'JEFE') next('/jefe')
    else if (userRole === 'EMPLEADO') next('/empleado')
    else if (userRole === 'CAMIONERO') next('/camionero/escaner')
    else next('/login')
  } else {
    next()
  }
})

export default router