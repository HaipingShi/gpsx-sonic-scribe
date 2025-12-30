import React from 'react';
import { cn } from '@/lib/utils';

export type FileStatus = 'pending' | 'processing' | 'complete' | 'error';

interface StatusIconProps {
    status: FileStatus;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

const STATUS_CONFIG: Record<FileStatus, { icon: string; color: string; bgColor: string; label: string; ringColor: string; animate?: boolean }> = {
    pending: {
        icon: '⏳',
        color: 'text-gray-400',
        bgColor: 'bg-gray-100',
        label: 'Pending',
        ringColor: 'ring-gray-300',
    },
    processing: {
        icon: '🔄',
        color: 'text-blue-500',
        bgColor: 'bg-blue-100',
        label: 'Processing',
        animate: true,
        ringColor: 'ring-blue-300',
    },
    complete: {
        icon: '✓',
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-100',
        label: 'Complete',
        ringColor: 'ring-emerald-300',
    },
    error: {
        icon: '❌',
        color: 'text-red-500',
        bgColor: 'bg-red-100',
        label: 'Error',
        ringColor: 'ring-red-300',
    },
};

const SIZE_CONFIG = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
};

const StatusIcon: React.FC<StatusIconProps> = ({
    status,
    size = 'md',
    showLabel = false
}) => {
    const config = STATUS_CONFIG[status];
    const sizeClass = SIZE_CONFIG[size];

    return (
        <div className="flex items-center gap-2">
            <div
                className={cn(
                    'flex items-center justify-center rounded-full',
                    'ring-2 ring-offset-1',
                    sizeClass,
                    config.bgColor,
                    config.ringColor,
                    config.animate && 'animate-spin'
                )}
            >
                <span className={config.color}>{config.icon}</span>
            </div>
            {showLabel && (
                <span className={cn('text-sm font-medium', config.color)}>
                    {config.label}
                </span>
            )}
        </div>
    );
};

export default StatusIcon;
