<template>
  <div class="action-bg">
    <div
      class="action-card"
      v-motion
      :initial="{ opacity: 0, y: 24 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 500 } }"
    >
      <!-- Branding -->
      <div class="action-brand">
        <span class="action-brand__bar"></span>
        <div>
          <div class="action-brand__name">ILPEA Transporte</div>
          <div class="action-brand__sub">GESTIÓN DE FLOTA</div>
        </div>
      </div>

      <!-- Verificando enlace -->
      <template v-if="estado === 'verificando'">
        <div class="action-spinner"></div>
        <p class="action-sub">Verificando enlace...</p>
      </template>

      <!-- Enlace inválido / expirado -->
      <template v-else-if="estado === 'error'">
        <div class="action-icon action-icon--error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="26" height="26">
            <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" />
          </svg>
        </div>
        <h2 class="action-title">Enlace no válido</h2>
        <p class="action-sub">{{ mensajeError }}</p>
        <button class="action-btn" @click="router.push('/login')">Ir al inicio de sesión</button>
      </template>

      <!-- Formulario de nueva contraseña -->
      <template v-else-if="estado === 'formulario'">
        <h2 class="action-title">Nueva contraseña</h2>
        <span class="action-accent"></span>
        <p class="action-sub">Cuenta: <strong>{{ correoUsuario }}</strong></p>

        <form class="action-form" @submit.prevent="cambiarContrasena">
          <label for="nuevaPass">Contraseña</label>
          <div class="input-wrap">
            <input
              id="nuevaPass"
              v-model="nuevaPass"
              :type="mostrarPass ? 'text' : 'password'"
              required
              minlength="6"
              placeholder="Mínimo 6 caracteres"
              autocomplete="new-password"
            />
            <button
              type="button"
              class="toggle-pass"
              :aria-label="mostrarPass ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              @click="mostrarPass = !mostrarPass"
            >
              <!-- Ojo abierto -->
              <svg v-if="mostrarPass" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke-linecap="round" />
                <line x1="1" y1="1" x2="23" y2="23" stroke-linecap="round" />
              </svg>
              <!-- Ojo cerrado -->
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>

          <button class="action-btn" type="submit" :disabled="guardando">
            {{ guardando ? 'Guardando...' : 'Guardar contraseña' }}
          </button>

          <p
            v-if="errorForm"
            class="ui-alert ui-alert--error"
            v-motion
            :initial="{ opacity: 0, y: -6 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 250 } }"
          >
            {{ errorForm }}
          </p>
        </form>
      </template>

      <!-- Éxito + cuenta regresiva -->
      <template v-else-if="estado === 'exito'">
        <div class="action-icon action-icon--success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="26" height="26">
            <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <h2 class="action-title">¡Contraseña actualizada!</h2>
        <p class="action-sub">Tu contraseña se cambió correctamente.</p>

        <div class="countdown-wrap">
          <div class="countdown-ring" :style="cuentaRingStyle">
            <span class="countdown-num">{{ cuenta }}</span>
          </div>
          <p class="countdown-label">Regresando al inicio de sesión...</p>
        </div>

        <button class="action-btn action-btn--outline" @click="irAlLogin">Ir ahora →</button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth'
import { auth } from '../lib/firebase'

type Estado = 'verificando' | 'formulario' | 'exito' | 'error'

const router = useRouter()
const route = useRoute()

const estado = ref<Estado>('verificando')
const correoUsuario = ref('')
const mensajeError = ref('')
const errorForm = ref('')
const nuevaPass = ref('')
const mostrarPass = ref(false)
const guardando = ref(false)

const CUENTA_INICIO = 5
const cuenta = ref(CUENTA_INICIO)
let cuentaInterval: ReturnType<typeof setInterval> | null = null

const cuentaRingStyle = computed(() => {
  const pct = (cuenta.value / CUENTA_INICIO) * 100
  return {
    background: `conic-gradient(var(--ilpea-accent) ${pct}%, #e5e7eb ${pct}%)`,
  }
})

onMounted(async () => {
  const mode = route.query.mode as string
  const oobCode = route.query.oobCode as string

  if (mode !== 'resetPassword' || !oobCode) {
    estado.value = 'error'
    mensajeError.value = 'El enlace no es válido. Solicita uno nuevo desde el inicio de sesión.'
    return
  }

  try {
    correoUsuario.value = await verifyPasswordResetCode(auth, oobCode)
    estado.value = 'formulario'
  } catch {
    estado.value = 'error'
    mensajeError.value =
      'El enlace expiró o ya fue utilizado. Solicita uno nuevo desde el inicio de sesión.'
  }
})

onUnmounted(() => {
  if (cuentaInterval) clearInterval(cuentaInterval)
})

async function cambiarContrasena() {
  const oobCode = route.query.oobCode as string
  if (nuevaPass.value.length < 6) {
    errorForm.value = 'La contraseña debe tener al menos 6 caracteres.'
    return
  }

  guardando.value = true
  errorForm.value = ''

  try {
    await confirmPasswordReset(auth, oobCode, nuevaPass.value)
    estado.value = 'exito'
    iniciarCuenta()
  } catch {
    errorForm.value =
      'No se pudo cambiar la contraseña. El enlace puede haber expirado. Solicita uno nuevo.'
  } finally {
    guardando.value = false
  }
}

function iniciarCuenta() {
  cuentaInterval = setInterval(() => {
    cuenta.value -= 1
    if (cuenta.value <= 0) {
      clearInterval(cuentaInterval!)
      cuentaInterval = null
      irAlLogin()
    }
  }, 1000)
}

function irAlLogin() {
  if (cuentaInterval) {
    clearInterval(cuentaInterval)
    cuentaInterval = null
  }
  router.push('/login')
}
</script>

<style scoped>
.action-bg {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  padding: 1.5rem;
  font-family: Inter, system-ui, sans-serif;
}

.action-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.07);
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
}

/* ── Branding ── */
.action-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 1.75rem;
}
.action-brand__bar {
  display: block;
  width: 5px;
  height: 34px;
  background: var(--ilpea-accent);
  border-radius: 4px;
  flex-shrink: 0;
}
.action-brand__name {
  font-size: 1rem;
  font-weight: 800;
  color: var(--ilpea-black);
  line-height: 1.1;
}
.action-brand__sub {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--ilpea-accent);
  letter-spacing: 0.08em;
  margin-top: 2px;
}

/* ── Título + acento ── */
.action-title {
  margin: 0 0 0.5rem;
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--ilpea-black);
  line-height: 1.2;
}
.action-accent {
  display: block;
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--ilpea-accent);
  margin-bottom: 0.9rem;
}
.action-sub {
  margin: 0 0 1.5rem;
  font-size: 0.9rem;
  color: #64748b;
  line-height: 1.55;
}
.action-sub strong { color: var(--ilpea-black); }

/* ── Iconos de estado ── */
.action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  margin-bottom: 1rem;
}
.action-icon--success {
  background: rgba(16, 124, 65, 0.1);
  color: var(--ilpea-accent);
}
.action-icon--error {
  background: rgba(185, 28, 28, 0.09);
  color: #b91c1c;
}

/* ── Spinner de verificación ── */
.action-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e2e8f0;
  border-top-color: var(--ilpea-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Formulario ── */
.action-form {
  width: 100%;
  display: grid;
  gap: 0.65rem;
}
.action-form label {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--ilpea-black);
}
.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.input-wrap input {
  width: 100%;
  padding: 0.75rem 2.6rem 0.75rem 0.85rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}
.input-wrap input:focus {
  outline: none;
  border-color: var(--ilpea-accent);
  box-shadow: 0 0 0 3px rgba(16, 124, 65, 0.12);
}
.toggle-pass {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  display: flex;
  align-items: center;
  padding: 0;
  transition: color 0.2s;
}
.toggle-pass:hover { color: var(--ilpea-black); }

/* ── Botón principal ── */
.action-btn {
  width: 100%;
  padding: 0.8rem 1.2rem;
  margin-top: 0.35rem;
  border: none;
  border-radius: 9px;
  background: var(--ilpea-black);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
  box-shadow: inset 0 0 1.6em -0.6em rgba(16, 124, 65, 0.5);
}
.action-btn:hover:not(:disabled) { background: #1a1a1a; }
.action-btn:disabled { opacity: 0.65; cursor: not-allowed; }
.action-btn--outline {
  background: transparent;
  border: 1.5px solid #cbd5e1;
  color: #374151;
  box-shadow: none;
  font-size: 0.88rem;
}
.action-btn--outline:hover:not(:disabled) {
  border-color: var(--ilpea-accent);
  color: var(--ilpea-accent);
  background: transparent;
}

/* ── Countdown ── */
.countdown-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 0.65rem;
  margin: 0.5rem 0 1.25rem;
}
.countdown-ring {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.9s linear;
}
.countdown-num {
  font-size: 1.9rem;
  font-weight: 800;
  color: var(--ilpea-black);
  background: #fff;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.countdown-label {
  margin: 0;
  font-size: 0.85rem;
  color: #64748b;
}
</style>
