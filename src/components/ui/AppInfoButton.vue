<template>
  <button type="button" class="info-btn" @click="open = true">
    <span class="info-btn__glow"></span>
    <span class="info-btn__content">
      <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" class="info-btn__icon">
        <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      </svg>
      Información
    </span>
  </button>

  <Teleport to="body">
    <Transition name="info-modal">
      <div v-if="open" class="info-overlay" @click.self="open = false">
        <div class="info-modal" role="dialog" :aria-label="title">
          <!-- Header -->
          <div class="info-modal__header">
            <div class="info-modal__icon-wrap">
              <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
                <path clip-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" fill-rule="evenodd"/>
              </svg>
            </div>
            <h3 class="info-modal__title">{{ title }}</h3>
            <button type="button" class="info-modal__close" @click="open = false" aria-label="Cerrar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <!-- Slot de contenido -->
          <div class="info-modal__body">
            <slot />
          </div>

          <div class="info-modal__bg-glow"></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{ title: string }>();
const open = ref(false);
</script>

<style scoped>
/* ── Botón ── */
.info-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 0.55rem 1.1rem;
  border: none;
  border-radius: 12px;
  background: rgba(79, 70, 229, 0.88);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  transition: background 0.25s, box-shadow 0.25s;
  flex-shrink: 0;
}
.info-btn:hover {
  background: rgba(67, 56, 202, 0.95);
  box-shadow: 0 0 18px 4px rgba(79, 70, 229, 0.35);
}
.info-btn:focus-visible {
  outline: 2px solid rgba(99, 102, 241, 0.7);
  outline-offset: 3px;
}
.info-btn__glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(168, 85, 247, 0.25), rgba(236, 72, 153, 0.2));
  filter: blur(14px);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}
.info-btn:hover .info-btn__glow { opacity: 1; }
.info-btn__content {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  z-index: 1;
}
.info-btn__icon { width: 15px; height: 15px; flex-shrink: 0; }

/* ── Overlay ── */
.info-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

/* ── Modal ── */
.info-modal {
  position: relative;
  width: min(480px, 100%);
  background: linear-gradient(135deg, rgba(17, 24, 39, 0.97), rgba(31, 41, 55, 0.97));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 0 40px rgba(79, 70, 229, 0.18), 0 20px 60px rgba(0,0,0,0.4);
  overflow: hidden;
  color: #e5e7eb;
}
.info-modal__bg-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(79, 70, 229, 0.08), rgba(168, 85, 247, 0.08));
  filter: blur(30px);
  pointer-events: none;
}

.info-modal__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.25rem 0.9rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  z-index: 1;
}
.info-modal__icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(79, 70, 229, 0.2);
  color: #818cf8;
  flex-shrink: 0;
}
.info-modal__title {
  flex: 1;
  margin: 0;
  font-size: 0.98rem;
  font-weight: 700;
  color: #fff;
}
.info-modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: rgba(255,255,255,0.07);
  color: #9ca3af;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.info-modal__close:hover { background: rgba(255,255,255,0.14); color: #fff; }

.info-modal__body {
  padding: 1.1rem 1.25rem 1.4rem;
  position: relative;
  z-index: 1;
  font-size: 0.875rem;
  line-height: 1.65;
  color: #d1d5db;
}

/* ── Estilos del contenido del slot ── */
.info-modal__body :deep(p) { margin: 0 0 0.7rem; }
.info-modal__body :deep(p:last-child) { margin-bottom: 0; }
.info-modal__body :deep(ul) {
  margin: 0.4rem 0 0.8rem 1.1rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.info-modal__body :deep(li) { color: #d1d5db; }
.info-modal__body :deep(strong) { color: #f3f4f6; font-weight: 700; }
.info-modal__body :deep(em) { color: #a5b4fc; font-style: normal; }

/* ── Transición ── */
.info-modal-enter-active,
.info-modal-leave-active { transition: opacity 0.2s, transform 0.22s; }
.info-modal-enter-from,
.info-modal-leave-to { opacity: 0; transform: scale(0.96) translateY(8px); }
</style>
