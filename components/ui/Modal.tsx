import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  /** Wider sheet for forms with many actions */
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  size = 'sm',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const widthClass =
    size === 'lg' ? 'max-w-lg' : size === 'md' ? 'max-w-md' : 'max-w-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content — scrollable, fits mobile viewport */}
      <div
        className={`relative bg-[#0d0d0d] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] ${widthClass} w-full mx-0 sm:mx-4 max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300`}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {title && (
          <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
            <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-[0.12em] font-mono pr-2">
              {title}
            </h2>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto overscroll-contain flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
};
