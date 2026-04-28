export const GLOBAL_TOAST_EVENT = 'hcmue:toast'

type ToastKind = 'success' | 'error' | 'info'

type GlobalToastPayload = {
  message: string
  kind?: ToastKind
}

export function emitGlobalToast(payload: GlobalToastPayload): void {
  window.dispatchEvent(new CustomEvent<GlobalToastPayload>(GLOBAL_TOAST_EVENT, { detail: payload }))
}
