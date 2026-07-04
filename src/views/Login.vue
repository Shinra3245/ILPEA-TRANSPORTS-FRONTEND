<template>
  <div class="login-container">
    <div
      ref="brandPanelRef"
      class="brand-panel"
      v-motion
      :initial="{ opacity: 0, x: -40 }"
      :enter="{ opacity: 1, x: 0, transition: { duration: 600 } }"
    >
      <div class="brand-content">
        <div
          class="brand-logo"
          v-motion
          :initial="{ opacity: 0, scale: 0.6 }"
          :enter="{ opacity: 1, scale: 1, transition: { duration: 500, delay: 150 } }"
        >
          <DotLottieVue class="brand-logo-animation" autoplay loop :src="vanAnimationUrl" />
        </div>
        <h1
          v-motion
          :initial="{ opacity: 0, y: 16 }"
          :enter="{ opacity: 1, y: 0, transition: { duration: 500, delay: 250 } }"
        >
          ILPEA Transporte
        </h1>
        <p
          v-motion
          :initial="{ opacity: 0, y: 16 }"
          :enter="{ opacity: 1, y: 0, transition: { duration: 500, delay: 350 } }"
        >
          Gestión y control de flota en un solo lugar.
        </p>
      </div>
    </div>

    <div class="form-panel">
      <div
        class="login-card"
        v-motion
        :initial="{ opacity: 0, y: 24 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 550, delay: 150 } }"
      >
        <h2>Bienvenido de nuevo</h2>
        <span class="title-accent"></span>
        <p class="subtitle">Inicia sesión con tus credenciales para continuar.</p>

        <!-- Formulario de inicio de sesión -->
        <form v-if="!modoRecupera" class="form" @submit.prevent="ingresar">
          <div class="inputbox">
            <input
              id="email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder=" "
              :disabled="ingresando"
            />
            <span>Correo electrónico</span>
            <i></i>
          </div>

          <div class="inputbox">
            <input
              id="password"
              v-model="password"
              :type="mostrarPass ? 'text' : 'password'"
              required
              autocomplete="current-password"
              class="input--has-eye"
              placeholder=" "
              :disabled="ingresando"
            />
            <span>Contraseña</span>
            <i></i>
            <button type="button" class="eye-btn" tabindex="-1" @click="mostrarPass = !mostrarPass" :aria-label="mostrarPass ? 'Ocultar contraseña' : 'Mostrar contraseña'">
              <!-- ojo abierto -->
              <svg v-if="!mostrarPass" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <!-- ojo cerrado -->
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                <line x1="2" y1="2" x2="22" y2="22"/>
              </svg>
            </button>
          </div>

          <div class="recupera-row">
            <button type="button" class="link-recupera" :disabled="ingresando" @click="abrirRecupera">¿Olvidaste tu contraseña?</button>
          </div>

          <button class="btn-login" type="submit" :disabled="ingresando" :aria-busy="ingresando">
            <span class="btn-login-text">{{ ingresando ? 'Ingresando...' : 'Ingresar' }}</span>
            <span class="btn-login-icon">
              <AppIcon v-if="ingresando" name="loader-2" :size="16" spin icon-class="btn-login-arrow" />
              <AppIcon v-else name="arrow-right" :size="16" icon-class="btn-login-arrow" />
            </span>
          </button>

          <p
            v-if="errorLogin"
            class="ui-alert ui-alert--error"
            v-motion
            :initial="{ opacity: 0, y: -6 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 250 } }"
          >
            {{ errorLogin }}
          </p>
        </form>

        <!-- Formulario de recuperación de contraseña -->
        <form v-else class="form" @submit.prevent="enviarRecupera">
          <p class="subtitle recupera-desc">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>

          <div class="inputbox">
            <input
              id="emailRecupera"
              v-model="emailRecupera"
              type="email"
              required
              autocomplete="email"
              placeholder=" "
              :disabled="enviando || !!mensajeOkRecupera"
            />
            <span>Correo electrónico</span>
            <i></i>
          </div>

          <button v-if="!mensajeOkRecupera" class="btn-login" type="submit" :disabled="enviando">
            <span class="btn-login-text">{{ enviando ? 'Enviando...' : 'Enviar enlace' }}</span>
            <span class="btn-login-icon">
              <AppIcon v-if="enviando" name="loader-2" :size="16" spin icon-class="btn-login-arrow" />
              <AppIcon v-else name="send" :size="16" icon-class="btn-login-arrow" />
            </span>
          </button>

          <p
            v-if="mensajeOkRecupera"
            class="ui-alert ui-alert--success"
            v-motion
            :initial="{ opacity: 0, y: -6 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 250 } }"
          >
            {{ mensajeOkRecupera }}
          </p>

          <p
            v-if="errorRecupera"
            class="ui-alert ui-alert--error"
            v-motion
            :initial="{ opacity: 0, y: -6 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 250 } }"
          >
            {{ errorRecupera }}
          </p>

          <button type="button" class="link-recupera link-recupera--back" @click="cerrarRecupera">
            ← Volver al inicio de sesión
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'
import vantaWavesImport from 'vanta/dist/vanta.waves.min'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
import { useAuth } from '../composables/useAuth'
import AppIcon from '../components/ui/AppIcon.vue'

const vanAnimationUrl = 'https://lottie.host/7bb34f58-e1fe-4f49-90ce-c9863360d57a/4OIixYE1CV.lottie'

interface VantaWavesOptions {
  el: HTMLElement
  THREE: typeof THREE
  mouseControls?: boolean
  touchControls?: boolean
  gyroControls?: boolean
  minHeight?: number
  minWidth?: number
  scale?: number
  scaleMobile?: number
  color?: number
  backgroundColor?: number
  shininess?: number
  waveHeight?: number
  waveSpeed?: number
  zoom?: number
}

interface VantaEffect {
  destroy(): void
}

// El build UMD de vanta exporta `{ default: fn }`; Vite envuelve eso una vez
// más al importarlo como default, así que hay que desempaquetarlo a mano.
const WAVES = (
  (vantaWavesImport as { default?: unknown })?.default ?? vantaWavesImport
) as (options: VantaWavesOptions) => VantaEffect

const router = useRouter()
const { login, recuperarContrasena, obtenerRol, error } = useAuth()

const email = ref('')
const password = ref('')
const mostrarPass = ref(false)
const ingresando = ref(false)
const errorLogin = computed(() => error.value)

const modoRecupera = ref(false)
const emailRecupera = ref('')
const enviando = ref(false)
const mensajeOkRecupera = ref('')
const errorRecupera = ref('')

function abrirRecupera() {
  emailRecupera.value = email.value
  mensajeOkRecupera.value = ''
  errorRecupera.value = ''
  modoRecupera.value = true
}

function cerrarRecupera() {
  modoRecupera.value = false
  mensajeOkRecupera.value = ''
  errorRecupera.value = ''
}

async function enviarRecupera() {
  enviando.value = true
  errorRecupera.value = ''
  mensajeOkRecupera.value = ''
  const { ok, mensaje } = await recuperarContrasena(emailRecupera.value.trim())
  if (ok) {
    mensajeOkRecupera.value = mensaje
  } else {
    errorRecupera.value = mensaje
  }
  enviando.value = false
}

const brandPanelRef = ref<HTMLElement | null>(null)
let vantaEffect: VantaEffect | null = null

onMounted(() => {
  if (!brandPanelRef.value) return

  try {
    vantaEffect = WAVES({
      el: brandPanelRef.value,
      THREE,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200,
      minWidth: 200,
      scale: 1,
      scaleMobile: 1,
      color: 0x107c41,
      backgroundColor: 0x0a0a0a,
      shininess: 35,
      waveHeight: 18,
      waveSpeed: 0.9,
      zoom: 0.85,
    })
  } catch (err) {
    console.error('No se pudo inicializar el fondo animado del login:', err)
  }
})

onUnmounted(() => {
  vantaEffect?.destroy()
  vantaEffect = null
})

const ingresar = async () => {
  if (ingresando.value) return

  ingresando.value = true

  try {
    const ok = await login(email.value.trim(), password.value)
    if (!ok) return

    const rol = obtenerRol()

    if (rol === 'ADMIN') {
      await router.push('/admin')
    } else if (rol === 'JEFE') {
      await router.push('/jefe')
    } else if (rol === 'CAMIONERO') {
      await router.push('/camionero/escaner')
    } else {
      await router.push('/empleado')
    }
  } finally {
    if (router.currentRoute.value.path === '/login') {
      ingresando.value = false
    }
  }
}
</script>

<style scoped>
.login-container {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  min-height: 100vh;
  font-family: Inter, system-ui, sans-serif;
}

/* Brand panel */
.brand-panel {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--ilpea-black);
  box-shadow: inset -6px 0 24px -10px rgba(16, 124, 65, 0.5);
}

.brand-content {
  position: relative;
  z-index: 1;
  max-width: 420px;
  padding: 2rem;
  color: var(--ilpea-white);
  text-align: left;
}

.brand-logo {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  max-width: 280px;
  aspect-ratio: 16 / 9;
  margin: 0 0 0.5rem -16px;
}

.brand-logo-animation {
  width: 100%;
  height: 100%;
}

.brand-content h1 {
  font-size: 2.25rem;
  font-weight: 800;
  margin: 0 0 0.75rem 0;
  letter-spacing: -0.02em;
}

.brand-content p {
  display: inline-block;
  font-size: 1.05rem;
  color: var(--ilpea-white);
  margin: 0;
  line-height: 1.5;
  padding: 0.55rem 0.9rem;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.38);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

/* Form panel */
.form-panel {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ilpea-white);
  padding: 1.5rem;
}

.form-panel::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  background: linear-gradient(180deg, transparent 0%, var(--ilpea-accent) 50%, transparent 100%);
  opacity: 0.5;
}

.login-card {
  background: var(--ilpea-white);
  padding: 2.5rem;
  border-radius: 16px;
  border: 1px solid var(--ilpea-border);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
  max-width: 420px;
  width: 100%;
}

.login-card h2 {
  color: var(--ilpea-black);
  margin: 0 0 0.6rem 0;
  font-size: 1.6rem;
  font-weight: 800;
}

.title-accent {
  display: block;
  width: 42px;
  height: 4px;
  border-radius: 2px;
  background: var(--ilpea-accent);
  margin-bottom: 1.2rem;
}

.subtitle {
  margin: 0 0 2rem 0;
  color: var(--ilpea-gray-500);
  font-size: 0.92rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* ── Inputbox flotante ── */
.inputbox {
  position: relative;
  width: 100%;
  padding-top: 1.35rem;
  margin-bottom: 0.5rem;
}

.inputbox input {
  position: relative;
  width: 100%;
  padding: 18px 10px 10px;
  background: transparent;
  outline: none;
  box-shadow: none;
  border: none;
  color: var(--ilpea-gray-900);
  font-size: 0.95rem;
  letter-spacing: 0.02em;
  transition: 0.35s;
  z-index: 10;
}

.inputbox input.input--has-eye {
  padding-right: 2.6rem;
}

.inputbox input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* Label flotante */
.inputbox span {
  position: absolute;
  left: 10px;
  top: 1.35rem;          /* alineado con el top-padding del inputbox */
  padding: 18px 0 10px;
  font-size: 0.95rem;
  color: var(--ilpea-gray-500);
  letter-spacing: 0.02em;
  transition: 0.35s;
  pointer-events: none;
  z-index: 11;
}

.inputbox input:valid ~ span,
.inputbox input:focus ~ span,
.inputbox input:not(:placeholder-shown) ~ span {
  color: var(--ilpea-accent);
  transform: translateX(-10px) translateY(-2.25rem);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

/* Línea / relleno inferior */
.inputbox i {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 2px;
  background: var(--ilpea-accent);
  border-radius: 4px 4px 0 0;
  transition: 0.35s;
  pointer-events: none;
  z-index: 9;
}

.inputbox input:valid ~ i,
.inputbox input:focus ~ i,
.inputbox input:not(:placeholder-shown) ~ i {
  height: 48px;
  background: rgba(16, 124, 65, 0.07);
  border-radius: 8px 8px 0 0;
}

/* Ícono de ojo */
.eye-btn {
  position: absolute;
  right: 10px;
  bottom: 14px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--ilpea-gray-500);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 12;
  transition: color 0.2s;
  line-height: 1;
}

.eye-btn:hover {
  color: var(--ilpea-accent);
}

.btn-login {
  position: relative;
  margin-top: 0.75rem;
  height: 3.1em;
  padding: 0 1.3rem;
  border: none;
  border-radius: 0.9em;
  background: var(--ilpea-black);
  color: var(--ilpea-white);
  font-weight: 600;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  overflow: hidden;
  cursor: pointer;
  box-shadow: inset 0 0 1.6em -0.6em rgba(16, 124, 65, 0.6);
  transition: box-shadow 0.2s;
}

.btn-login-text {
  position: relative;
  margin-right: 3rem;
}

.btn-login-icon {
  position: absolute;
  right: 0.3em;
  top: 50%;
  transform: translateY(-50%);
  width: 2.2em;
  height: 2.2em;
  border-radius: 0.7em;
  background: var(--ilpea-white);
  color: var(--ilpea-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0.1em 0.1em 0.6em 0.2em rgba(16, 124, 65, 0.35);
  transition: width 0.3s ease;
}

.btn-login:hover:not(:disabled) .btn-login-icon {
  width: calc(100% - 0.6em);
}

.btn-login :deep(.btn-login-arrow) {
  transition: transform 0.3s ease;
}

.btn-login:hover:not(:disabled) :deep(.btn-login-arrow) {
  transform: translateX(0.1em);
}

.btn-login:active:not(:disabled) .btn-login-icon {
  transform: translateY(-50%) scale(0.95);
}

.btn-login:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* ── Recuperación de contraseña ── */
.recupera-row {
  display: flex;
  justify-content: flex-end;
  margin-top: -0.15rem;
}
.link-recupera {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.82rem;
  color: var(--ilpea-gray-500);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color 0.2s;
}
.link-recupera:hover { color: var(--ilpea-accent); }
.link-recupera--back {
  text-decoration: none;
  margin-top: 0.25rem;
  text-align: center;
  display: block;
  width: 100%;
}
.recupera-desc { margin-bottom: 0.5rem; }

@media (max-width: 900px) {
  .login-container {
    grid-template-columns: 1fr;
  }

  .brand-panel {
    min-height: 240px;
    padding: 2rem 0;
  }

  .brand-content h1 {
    font-size: 1.75rem;
  }
}

@media (max-width: 600px) {
  .login-card {
    padding: 2rem;
  }
}
</style>
