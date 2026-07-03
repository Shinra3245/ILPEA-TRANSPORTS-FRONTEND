<template>
  <div
    ref="root"
    class="app-grouped-select"
    :class="{ 'is-open': open, 'is-disabled': disabled }"
    @click.stop
  >
    <button
      ref="triggerRef"
      type="button"
      class="app-grouped-select__trigger"
      :disabled="disabled"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <span class="app-grouped-select__value" :class="{ 'is-placeholder': !selectedLabel }">
        {{ selectedLabel || placeholder }}
      </span>
      <svg class="app-grouped-select__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <Teleport to="body">
      <div
        v-if="open && !disabled"
        ref="panelRef"
        class="app-grouped-select__panel"
        :style="panelStyle"
        role="listbox"
      >
        <template v-if="groups.length">
          <template v-for="(grupo, grupoIndex) in groups" :key="`${grupo.label}-${grupoIndex}`">
            <div v-if="grupo.items.length" class="app-grouped-select__group">
              <div class="app-grouped-select__group-header">
                <slot name="optiongroup" :option="grupo">
                  <span>{{ grupo.label }}</span>
                </slot>
              </div>
              <button
                v-for="(item, itemIndex) in grupo.items"
                :key="`${item.value}-${itemIndex}`"
                type="button"
                class="app-grouped-select__option"
                :class="{ 'is-selected': item.value === modelValue, 'is-highlighted': flatIndex(grupoIndex, itemIndex) === highlightIndex }"
                role="option"
                :aria-selected="item.value === modelValue"
                @mousedown.prevent="select(item.value)"
                @mouseenter="highlightIndex = flatIndex(grupoIndex, itemIndex)"
              >
                <slot name="option" :option="item">
                  <span class="app-grouped-select__option-label">{{ item.label }}</span>
                  <span v-if="item.hint" class="app-grouped-select__option-hint">{{ item.hint }}</span>
                </slot>
              </button>
            </div>
          </template>
        </template>

        <template v-else>
          <button
            v-for="(item, index) in flatOptions"
            :key="`${item.value}-${index}`"
            type="button"
            class="app-grouped-select__option app-grouped-select__option--flat"
            :class="{ 'is-selected': item.value === modelValue, 'is-highlighted': index === highlightIndex }"
            role="option"
            :aria-selected="item.value === modelValue"
            @mousedown.prevent="select(item.value)"
            @mouseenter="highlightIndex = index"
          >
            <slot name="option" :option="item">
              <span class="app-grouped-select__option-label">{{ item.label }}</span>
              <span v-if="item.hint" class="app-grouped-select__option-hint">{{ item.hint }}</span>
            </slot>
          </button>
        </template>

        <p v-if="!allItems.length" class="app-grouped-select__empty">{{ emptyMessage }}</p>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

export interface GroupedSelectOption {
  value: string;
  label: string;
  hint?: string;
}

export interface GroupedSelectGroup {
  label: string;
  code?: string;
  items: GroupedSelectOption[];
}

const props = withDefaults(
  defineProps<{
    modelValue: string;
    groups?: GroupedSelectGroup[];
    options?: GroupedSelectOption[];
    placeholder?: string;
    disabled?: boolean;
    emptyMessage?: string;
  }>(),
  {
    groups: () => [],
    options: () => [],
    placeholder: 'Seleccionar...',
    disabled: false,
    emptyMessage: 'Sin opciones',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const root = ref<HTMLElement | null>(null);
const triggerRef = ref<HTMLButtonElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const open = ref(false);
const highlightIndex = ref(0);
const panelStyle = ref<Record<string, string>>({});

const flatOptions = computed(() => props.options);
const allItems = computed(() => {
  if (props.groups.length) {
    return props.groups.flatMap((grupo) => grupo.items);
  }
  return flatOptions.value;
});

const selectedLabel = computed(() => {
  const item = allItems.value.find((opcion) => opcion.value === props.modelValue);
  return item?.label || '';
});

function flatIndex(grupoIndex: number, itemIndex: number) {
  let index = 0;
  for (let i = 0; i < grupoIndex; i += 1) {
    index += props.groups[i]?.items.length || 0;
  }
  return index + itemIndex;
}

function updatePanelPosition() {
  if (!triggerRef.value) return;
  const rect = triggerRef.value.getBoundingClientRect();
  panelStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    zIndex: '9999',
  };
}

function openPanel() {
  if (props.disabled) return;
  updatePanelPosition();
  open.value = true;
  const selectedIndex = allItems.value.findIndex((item) => item.value === props.modelValue);
  highlightIndex.value = selectedIndex >= 0 ? selectedIndex : 0;
}

function closePanel() {
  open.value = false;
}

function toggle() {
  if (open.value) {
    closePanel();
    return;
  }
  openPanel();
}

function select(value: string) {
  emit('update:modelValue', value);
  closePanel();
}

function onDocumentClick(event: MouseEvent) {
  if (!open.value) return;
  const target = event.target as Node;
  if (root.value?.contains(target) || panelRef.value?.contains(target)) return;
  closePanel();
}

function onKeydown(event: KeyboardEvent) {
  if (!open.value) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    closePanel();
    return;
  }

  const total = allItems.value.length;
  if (!total) return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    highlightIndex.value = (highlightIndex.value + 1) % total;
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    highlightIndex.value = (highlightIndex.value - 1 + total) % total;
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    const item = allItems.value[highlightIndex.value];
    if (item) select(item.value);
  }
}

watch(open, async (isOpen) => {
  if (!isOpen) return;
  await nextTick();
  updatePanelPosition();
});

watch(
  () => props.modelValue,
  () => {
    const selectedIndex = allItems.value.findIndex((item) => item.value === props.modelValue);
    if (selectedIndex >= 0) highlightIndex.value = selectedIndex;
  },
);

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', updatePanelPosition);
  window.addEventListener('scroll', updatePanelPosition, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick);
  document.removeEventListener('keydown', onKeydown);
  window.removeEventListener('resize', updatePanelPosition);
  window.removeEventListener('scroll', updatePanelPosition, true);
});
</script>

<style scoped>
.app-grouped-select {
  position: relative;
  width: 100%;
}

.app-grouped-select__trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  border: 1px solid var(--ilpea-border);
  border-radius: 8px;
  padding: 0.65rem 0.8rem;
  font-size: 0.9rem;
  background: var(--ilpea-white);
  color: var(--ilpea-gray-900);
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  text-align: left;
}

.app-grouped-select__trigger:hover:not(:disabled),
.app-grouped-select.is-open .app-grouped-select__trigger {
  border-color: var(--ilpea-accent);
  box-shadow: 0 0 0 3px rgba(16, 124, 65, 0.12);
}

.app-grouped-select__trigger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.app-grouped-select__value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-grouped-select__value.is-placeholder {
  color: #94a3b8;
}

.app-grouped-select__chevron {
  flex-shrink: 0;
  color: #94a3b8;
  transition: transform 0.2s;
}

.app-grouped-select.is-open .app-grouped-select__chevron {
  transform: rotate(180deg);
}

.app-grouped-select__panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.13);
  max-height: 280px;
  overflow-y: auto;
  padding: 0.35rem 0;
}

.app-grouped-select__group + .app-grouped-select__group {
  border-top: 1px solid #f1f5f9;
  margin-top: 0.2rem;
  padding-top: 0.2rem;
}

.app-grouped-select__group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.85rem 0.3rem;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
}

.app-grouped-select__option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1rem;
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  padding: 0.55rem 0.85rem 0.55rem 1.35rem;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.14s;
}

.app-grouped-select__option--flat {
  padding-left: 0.85rem;
}

.app-grouped-select__option:hover,
.app-grouped-select__option.is-highlighted {
  background: #e0f2fe;
}

.app-grouped-select__option.is-selected {
  background: #dbeafe;
  color: #1d4ed8;
}

.app-grouped-select__option-label {
  font-size: 0.88rem;
  color: #1e293b;
}

.app-grouped-select__option.is-selected .app-grouped-select__option-label {
  color: #1d4ed8;
  font-weight: 600;
}

.app-grouped-select__option-hint {
  font-size: 0.72rem;
  color: #64748b;
}

.app-grouped-select__empty {
  margin: 0;
  padding: 0.75rem 0.85rem;
  font-size: 0.82rem;
  color: #94a3b8;
}
</style>
