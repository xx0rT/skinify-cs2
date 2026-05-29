import { create } from 'zustand';
import { nanoid } from 'nanoid';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
  icon?: React.ReactNode;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'> | string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast, type) => set((state) => {
    let toastData: Omit<Toast, 'id'>;

    // Support both object format and simple string format
    if (typeof toast === 'string') {
      toastData = {
        type: type || 'info',
        title: type === 'success' ? 'Success' : type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Info',
        message: toast,
        duration: 3000
      };
    } else {
      toastData = toast;
    }

    const newToast = { ...toastData, id: nanoid() };

    // Limit to 5 toasts maximum
    const updatedToasts = [newToast, ...state.toasts].slice(0, 5);

    return {
      toasts: updatedToasts
    };
  }),
  
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(toast => toast.id !== id)
  })),
  
  clearAll: () => set({ toasts: [] })
}));