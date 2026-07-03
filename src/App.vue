<template>
  <v-app>
    <router-view />
    <AppDialog />
  </v-app>
</template>

<script setup lang="ts">
import AppDialog from './components/ui/AppDialog.vue';
</script>

<style>
/* Reset global de márgenes */
body {
  margin: 0;
  padding: 0;
}

/*
  Protección contra la tipografía y el color de fondo de Vuetify.
  Vuetify inyecta estilos en .v-application; los sobrescribimos con
  las variables propias del proyecto para que no afecte las vistas.
*/
.v-application {
  font-family: 'Inter', system-ui, sans-serif !important;
  background: #f8fafc !important;
  color: #1a1a1a !important;
}

/* Encabezados y etiquetas legibles dentro de Vuetify (no heredar grises del SO) */
.v-application h1,
.v-application h2,
.v-application h3,
.v-application h4,
.v-application label {
  color: #1a1a1a;
}
.v-application--wrap {
  min-height: 100vh;
}
</style>
