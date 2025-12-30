import React from 'react';
import { cn } from '@/lib/utils';
import StatusIcon, { FileStatus } from './StatusIcon';

interface FileListItemProps {
    file: {
        name: string;
        size: number;
        status: FileStatus;
        wordCount?: number;
        duration?: number;
        createdAt: string;
    };
    onClick?: () => void;
    onDownload?: () => void;
    onDelete?: () => void;
}

const FileListItem: React.FC<FileListItemProps> = ({
    file,
    onClick,
    onDownload,
    onDelete,
}) => {
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div
            onClick={onClick}
            className={cn(
                'group relative p-4 rounded-xl border-2 border-gray-200',
                'bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50',
                'transition-all duration-300 cursor-pointer',
                'hover:border-blue-300 hover:shadow-lg hover:scale-[1.01]'
            )}
        >
            {/* Main Content */}
            <div className="flex items-center gap-4">
                {/* File Icon */}
                <div className="flex-shrink-0">
                    <div className={cn(
                        'w-12 h-12 rounded-lg flex items-center justify-center',
                        'bg-gradient-to-br from-gray-100 to-gray-200',
                        'text-2xl shadow-sm'
                    )}>
                        {getFileIcon(file.name)}
                    </div>
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900 truncate">
                            {file.name}
                        </h4>
                        <StatusIcon status={file.status} size="sm" />
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                            📦 {formatFileSize(file.size)}
                        </span>

                        {file.wordCount && (
                            <span className="text-xs text-gray-500 bg-blue-50 px-2 py-0.5 rounded-md">
                                📝 {file.wordCount.toLocaleString()} words
                            </span>
                        )}

                        {file.duration && (
                            <span className="text-xs text-gray-500 bg-purple-50 px-2 py-0.5 rounded-md">
                                ⏱️ {formatDuration(file.duration)}
                            </span>
                        )}
                    </div>

                    <div className="text-xs text-gray-400 mt-1">
                        {new Date(file.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </div>
                </div>

                {/* Action Buttons - appear on hover */}
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="flex items-center gap-2">
                        {onDownload && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDownload();
                                }}
                                className={cn(
                                    'p-2 rounded-lg',
                                    'bg-blue-500 hover:bg-blue-600',
                                    'text-white transition-colors',
                                    'shadow-md hover:shadow-lg'
                                )}
                                title="Download"
                            >
                                📥
                            </button>
                        )}

                        {onDelete && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Delete ${file.name}?`)) {
                                        onDelete();
                                    }
                                }}
                                className={cn(
                                    'p-2 rounded-lg',
                                    'bg-red-500 hover:bg-red-600',
                                    'text-white transition-colors',
                                    'shadow-md hover:shadow-lg'
                                )}
                                title="Delete"
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

function getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();

    const iconMap: Record<string, string> = {
        mp3: '🎵',
        wav: '🎵',
        m4a: '🎵',
        txt: '📄',
        md: '📝',
        docx: '📘',
    };

    return iconMap[ext || ''] || '📄';
}

export default FileListItem;
