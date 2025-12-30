import React from 'react';
import { cn } from '@/lib/utils';

interface FilePreviewProps {
    isOpen: boolean;
    onClose: () => void;
    file: {
        name: string;
        content: string;
        type: string;
    } | null;
}

const FilePreview: React.FC<FilePreviewProps> = ({ isOpen, onClose, file }) => {
    if (!isOpen || !file) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fadeIn"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className={cn(
                        'relative w-full max-w-4xl max-h-[90vh]',
                        'bg-white rounded-2xl shadow-2xl',
                        'border-2 border-gray-200',
                        'animate-slideUp'
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={cn(
                        'flex items-center justify-between p-6 border-b border-gray-200',
                        'bg-gradient-to-r from-gray-50 to-blue-50'
                    )}>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">📄</span>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{file.name}</h2>
                                <p className="text-sm text-gray-600">{file.type}</p>
                            </div>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className={cn(
                                'p-2 rounded-lg',
                                'hover:bg-gray-200 transition-colors',
                                'text-gray-600 hover:text-gray-900'
                            )}
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                        <pre className={cn(
                            'p-4 rounded-lg',
                            'bg-gray-50 border border-gray-200',
                            'text-sm text-gray-800 font-mono',
                            'whitespace-pre-wrap break-words'
                        )}>
                            {file.content}
                        </pre>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                        <button
                            onClick={() => {
                                // Copy to clipboard
                                navigator.clipboard.writeText(file.content);
                            }}
                            className={cn(
                                'px-4 py-2 rounded-lg',
                                'bg-blue-500 hover:bg-blue-600',
                                'text-white font-semibold',
                                'transition-colors shadow-md hover:shadow-lg'
                            )}
                        >
                            📋 Copy
                        </button>

                        <button
                            onClick={onClose}
                            className={cn(
                                'px-4 py-2 rounded-lg',
                                'bg-gray-200 hover:bg-gray-300',
                                'text-gray-700 font-semibold',
                                'transition-colors'
                            )}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
        </>
    );
};

export default FilePreview;
