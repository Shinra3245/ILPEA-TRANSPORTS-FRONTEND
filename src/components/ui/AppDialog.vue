<template>
  <Teleport to="body">
    <Transition name="dlg">
      <div v-if="state.visible" class="dlg-backdrop" @mousedown.self="onBackdrop">
        <div
          class="dlg-panel"
          role="dialog"
          :aria-modal="true"
          :aria-labelledby="'dlg-title'"
          @keydown.esc="onEsc"
        >
          <div class="dlg-icon" :class="`dlg-icon--${state.type}`">
            <svg v-if="state.type === 'confirm'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <h2 id="dlg-title" class="dlg-title">{{ state.title }}</h2>
          <p class="dlg-message">{{ state.message }}</p>

          <div class="dlg-actions" :class="{ 'dlg-actions--single': state.type === 'alert' }">
            <button
              v-if="state.type === 'confirm'"
              class="dlg-btn dlg-btn--cancel"
              @click="closeDialog(false)"
            >
              {{ state.cancelLabel }}
            </button>
            <button
              class="dlg-btn dlg-btn--confirm"
              :class="{ 'dlg-btn--danger': state.type === 'confirm' }"
              @click="closeDialog(true)"
              autofocus
            >
              {{ state.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useDialog } from '../../composables/useDialog';

const { state, closeDialog } = useDialog();

function onBackdrop() {
  if (state.type === 'alert') closeDialog(true);
}

function onEsc() {
  closeDialog(false);
}
</script>

<style scoped>
.dlg-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(3px);
  padding: 1rem;
}

.dlg-panel {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18), 0 4px 16px rgba(0, 0, 0, 0.08);
  padding: 2rem 2rem 1.5rem;
  max-width: 420px;
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
}

.dlg-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.25rem;
  flex-shrink: 0;
}

.dlg-icon--alert {
  background: #f0fdf4;
  color: #107c41;
}

.dlg-icon--confirm {
  background: #fef3c7;
  color: #92400e;
}

.dlg-icon svg {
  width: 26px;
  height: 26px;
}

.dlg-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}

.dlg-message {
  margin: 0;
  font-size: 0.9rem;
  color: #475569;
  line-height: 1.6;
}

.dlg-actions {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.75rem;
  width: 100%;
}

.dlg-actions--single {
  justify-content: center;
}

.dlg-btn {
  flex: 1;
  padding: 0.65rem 1.25rem;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: opacity 0.15s, transform 0.1s;
}

.dlg-btn:active {
  transform: scale(0.97);
}

.dlg-btn--cancel {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #e2e8f0;
}

.dlg-btn--cancel:hover {
  background: #e2e8f0;
}

.dlg-btn--confirm {
  background: #107c41;
  color: #ffffff;
}

.dlg-btn--confirm:hover {
  background: #0d6635;
}

.dlg-btn--danger {
  background: #be123c;
}

.dlg-btn--danger:hover {
  background: #9f1239;
}

.dlg-actions--single .dlg-btn--confirm {
  max-width: 180px;
  flex: none;
}

/* Transition */
.dlg-enter-active,
.dlg-leave-active {
  transition: opacity 0.18s ease;
}

.dlg-enter-active .dlg-panel,
.dlg-leave-active .dlg-panel {
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.dlg-enter-from,
.dlg-leave-to {
  opacity: 0;
}

.dlg-enter-from .dlg-panel,
.dlg-leave-to .dlg-panel {
  transform: scale(0.94) translateY(-8px);
  opacity: 0;
}
</style>
