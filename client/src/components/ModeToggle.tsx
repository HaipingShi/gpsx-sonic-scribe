import React from 'react';
import { Zap, Wrench } from 'lucide-react';

interface ModeToggleProps {
    currentMode: 'MANUAL' | 'SOLO';
    onChange: (mode: 'MANUAL' | 'SOLO') => void;
    disabled?: boolean;
    size?: 'sm' | 'md';
}

/**
 * Mode Toggle component for switching between Manual and Solo modes
 * Shows a toggle button group with visual indicators
 */
export const ModeToggle: React.FC<ModeToggleProps> = ({
    currentMode,
    onChange,
    disabled = false,
    size = 'md',
}) => {
    const buttonBase = `
        flex items-center gap-1.5 transition-all duration-200
        ${size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `;

    const activeStyle = 'bg-white shadow-sm text-gray-900 font-medium';
    const inactiveStyle = 'text-gray-500 hover:text-gray-700';

    return (
        <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5">
            {/* Manual Mode Button */}
            <button
                type="button"
                onClick={() => !disabled && onChange('MANUAL')}
                disabled={disabled}
                className={`
                    ${buttonBase}
                    ${currentMode === 'MANUAL' ? activeStyle : inactiveStyle}
                    rounded-md
                `}
            >
                <Wrench className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
                <span>Manual</span>
            </button>

            {/* Solo Mode Button */}
            <button
                type="button"
                onClick={() => !disabled && onChange('SOLO')}
                disabled={disabled}
                className={`
                    ${buttonBase}
                    ${currentMode === 'SOLO' ? activeStyle : inactiveStyle}
                    rounded-md
                `}
            >
                <Zap className={`
                    ${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}
                    ${currentMode === 'SOLO' ? 'text-yellow-500' : ''}
                `} />
                <span>Solo</span>
            </button>
        </div>
    );
};

export default ModeToggle;
