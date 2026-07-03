import { reactive } from 'vue';

type DialogType = 'alert' | 'confirm';

interface DialogState {
  visible: boolean;
  type: DialogType;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  resolve: ((value: boolean) => void) | null;
}

const state = reactive<DialogState>({
  visible: false,
  type: 'alert',
  title: '',
  message: '',
  confirmLabel: 'Aceptar',
  cancelLabel: 'Cancelar',
  resolve: null,
});

function openDialog(
  type: DialogType,
  message: string,
  options: { title?: string; confirmLabel?: string; cancelLabel?: string } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    state.type = type;
    state.message = message;
    state.title = options.title ?? (type === 'confirm' ? 'Confirmar acción' : 'Aviso');
    state.confirmLabel = options.confirmLabel ?? 'Aceptar';
    state.cancelLabel = options.cancelLabel ?? 'Cancelar';
    state.resolve = resolve;
    state.visible = true;
  });
}

function closeDialog(result: boolean) {
  state.visible = false;
  state.resolve?.(result);
  state.resolve = null;
}

export function useDialog() {
  const dialogAlert = (
    message: string,
    options?: { title?: string; confirmLabel?: string },
  ) => openDialog('alert', message, options);

  const dialogConfirm = (
    message: string,
    options?: { title?: string; confirmLabel?: string; cancelLabel?: string },
  ) => openDialog('confirm', message, options);

  return { dialogAlert, dialogConfirm, state, closeDialog };
}
