import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useToastStore } from '../../store/toastStore';
import ToastNotification from './ToastNotification';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-24 right-4 z-[100] pointer-events-none">
      <div className="flex flex-col gap-2 pointer-events-auto items-end">
        <AnimatePresence initial={false} mode="popLayout">
          {toasts.map((toast) => (
            <ToastNotification key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ToastContainer;
