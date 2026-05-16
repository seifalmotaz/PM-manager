// Toast store using Svelte 5 runes
type ToastType = 'info' | 'success' | 'error' | 'warning'

type ToastItem = {
	id: number
	message: string
	type: ToastType
	timeoutId: ReturnType<typeof setTimeout>
}

class ToastStore {
	toasts = $state<ToastItem[]>([])
	nextId = 0

	show(message: string, type: ToastType = 'info') {
		const id = this.nextId++
		const timeoutId = setTimeout(() => this.dismiss(id), 5000)
		this.toasts = [...this.toasts, { id, message, type, timeoutId }]
	}

	dismiss(id: number) {
		const toast = this.toasts.find((t) => t.id === id)
		if (toast) {
			clearTimeout(toast.timeoutId)
		}
		this.toasts = this.toasts.filter((t) => t.id !== id)
	}
}

export const toast = new ToastStore()
export type { ToastType }