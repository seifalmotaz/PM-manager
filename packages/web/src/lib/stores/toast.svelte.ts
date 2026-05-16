interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  createdAt: Date
}

const toasts = $state<Toast[]>([])

function showToast(message: string, type: Toast['type'] = 'info') {
  const id = crypto.randomUUID()
  const toast: Toast = {
    id,
    message,
    type,
    createdAt: new Date(),
  }
  toasts.push(toast)

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    dismissToast(id)
  }, 5000)
}

function dismissToast(id: string) {
  const index = toasts.findIndex((t) => t.id === id)
  if (index !== -1) {
    toasts.splice(index, 1)
  }
}

export { toasts, showToast, dismissToast }