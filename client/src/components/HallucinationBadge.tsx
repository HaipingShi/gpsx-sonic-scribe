import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, RotateCcw } from 'lucide-react';

type ValidationStatus = 'PENDING' | 'VERIFIED' | 'HALLUCINATORY' | 'FAILED';

interface HallucinationBadgeProps {
    status: ValidationStatus;
    retryAttempt?: number;
    issues?: string[];
    size?: 'sm' | 'md';
    showTooltip?: boolean;
}

/**
 * Hallucination Badge component for displaying validation status
 * Shows different icons/colors based on validation result
 */
export const HallucinationBadge: React.FC<HallucinationBadgeProps> = ({
    status,
    retryAttempt = 0,
    issues = [],
    size = 'md',
    showTooltip = true,
}) => {
    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

    const getConfig = () => {
        switch (status) {
            case 'VERIFIED':
                return {
                    icon: <CheckCircle2 className={`${iconSize} text-green-500`} />,
                    bgColor: 'bg-green-50',
                    borderColor: 'border-green-200',
                    textColor: 'text-green-700',
                    label: 'Verified',
                };
            case 'HALLUCINATORY':
                return {
                    icon: <AlertTriangle className={`${iconSize} text-amber-500`} />,
                    bgColor: 'bg-amber-50',
                    borderColor: 'border-amber-200',
                    textColor: 'text-amber-700',
                    label: 'Hallucination',
                };
            case 'FAILED':
                return {
                    icon: <XCircle className={`${iconSize} text-red-500`} />,
                    bgColor: 'bg-red-50',
                    borderColor: 'border-red-200',
                    textColor: 'text-red-700',
                    label: 'Failed',
                };
            case 'PENDING':
            default:
                return {
                    icon: <Clock className={`${iconSize} text-gray-400`} />,
                    bgColor: 'bg-gray-50',
                    borderColor: 'border-gray-200',
                    textColor: 'text-gray-500',
                    label: 'Pending',
                };
        }
    };

    const config = getConfig();

    const tooltipContent = () => {
        if (!showTooltip) return '';

        let content = config.label;
        if (retryAttempt > 0) {
            content += ` (Retry ${retryAttempt}/3)`;
        }
        if (issues.length > 0) {
            content += `: ${issues.join(', ')}`;
        }
        return content;
    };

    // Icon-only mode for small size
    if (size === 'sm') {
        return (
            <div
                className="inline-flex items-center"
                title={tooltipContent()}
            >
                {config.icon}
                {retryAttempt > 0 && status !== 'VERIFIED' && (
                    <span className="ml-0.5 flex items-center">
                        <RotateCcw className="w-2.5 h-2.5 text-gray-400" />
                        <span className="text-[9px] text-gray-400">{retryAttempt}</span>
                    </span>
                )}
            </div>
        );
    }

    // Badge mode for medium size
    return (
        <div
            className={`
                inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full
                ${config.bgColor} ${config.borderColor} border
            `}
            title={tooltipContent()}
        >
            {config.icon}
            <span className={`text-xs font-medium ${config.textColor}`}>
                {config.label}
            </span>
            {retryAttempt > 0 && status !== 'VERIFIED' && (
                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    <RotateCcw className="w-2.5 h-2.5" />
                    {retryAttempt}/3
                </span>
            )}
        </div>
    );
};

export default HallucinationBadge;
