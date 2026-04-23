import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, LogOut, Info, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info' | 'logout';
  confirmText?: string;
  cancelText?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger': return <Trash2 className="w-6 h-6 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'logout': return <LogOut className="w-6 h-6 text-brand" />;
      default: return <Info className="w-6 h-6 text-brand" />;
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'danger': return 'bg-red-500 hover:bg-red-600 shadow-red-500/20';
      case 'logout': return 'bg-brand hover:bg-brand-hover shadow-brand/20';
      default: return 'bg-brand hover:bg-brand-hover shadow-brand/20';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-page/80 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      ></div>
      
      {/* Modal Card */}
      <div className="relative bg-card border border-border w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        <div className="p-8 text-center space-y-4">
          {/* Header Icon */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-page border border-border flex items-center justify-center shadow-inner">
            {getIcon()}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-txt">{title}</h3>
            <p className="text-sm text-muted leading-relaxed">
              {message}
            </p>
          </div>
          
          <div className="flex flex-col gap-2 pt-4">
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all shadow-lg active:scale-[0.98] ${getButtonClass()}`}
            >
              {confirmText}
            </button>
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-xl text-muted font-bold text-sm bg-page border border-border hover:bg-card hover:text-txt transition-all active:scale-[0.98]"
            >
              {cancelText}
            </button>
          </div>
        </div>
        
        {/* Close button X */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-muted hover:text-txt rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmModal;
