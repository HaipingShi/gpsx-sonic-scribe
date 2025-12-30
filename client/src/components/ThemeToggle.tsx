import React, { useState, useEffect } from 'react';
import { Sun, Zap } from 'lucide-react';

const ThemeToggle: React.FC = () => {
    const [theme, setTheme] = useState<'matrix' | 'midnight'>(
        (localStorage.getItem('gpsx-theme') as 'matrix' | 'midnight') || 'matrix'
    );

    useEffect(() => {
        const root = window.document.documentElement;
        root.setAttribute('data-theme', theme);
        localStorage.setItem('gpsx-theme', theme);

        // Update body class for tailwind if needed
        if (theme === 'midnight') {
            root.classList.add('theme-midnight');
        } else {
            root.classList.remove('theme-midnight');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'matrix' ? 'midnight' : 'matrix'));
    };

    return (
        <button
            onClick={toggleTheme}
            className="fixed bottom-8 right-8 z-[100] p-4 bg-[var(--gpsx-bg-card)] border border-[var(--gpsx-accent-primary)]/40 text-[var(--gpsx-accent-primary)] hover:bg-[var(--gpsx-accent-primary)]/10 hover:border-[var(--gpsx-accent-primary)] transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.5)] group overflow-hidden"
            title={theme === 'matrix' ? '切换至午夜霓虹主题' : '切换至黑客帝国主题'}
        >
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="relative flex items-center justify-center gap-3">
                {theme === 'matrix' ? (
                    <>
                        <Zap size={20} className="animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden group-hover:block animate-in slide-in-from-right-2">MIDNIGHT_CYBER</span>
                    </>
                ) : (
                    <>
                        <Sun size={20} className="text-purple-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden group-hover:block animate-in slide-in-from-right-2 text-purple-500">MATRIX_GREEN</span>
                    </>
                )}
            </div>

            {/* Decor corner */}
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-[#00ff88] transform rotate-45" />
        </button>
    );
};

export default ThemeToggle;
