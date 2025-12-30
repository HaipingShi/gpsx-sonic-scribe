import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Mic,
    Sparkles,
    FolderOpen,
    Clock,
    Settings,
    Zap
} from 'lucide-react';

interface NavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
    badge?: string;
}

const mainNavItems: NavItem[] = [
    { path: '/', label: '控制台', icon: <LayoutDashboard size={20} /> },
    { path: '/transcribe', label: '语音转写', icon: <Mic size={20} /> },
    { path: '/polish', label: '文本清洗', icon: <Sparkles size={20} /> },
    { path: '/files', label: '文件管理', icon: <FolderOpen size={20} /> },
    { path: '/history', label: '历史记录', icon: <Clock size={20} /> },
];

const bottomNavItems: NavItem[] = [
    { path: '/settings', label: '系统设置', icon: <Settings size={20} /> },
];

const Sidebar: React.FC = () => {
    const location = useLocation();

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    const NavItemComponent: React.FC<{ item: NavItem }> = ({ item }) => (
        <NavLink
            to={item.path}
            className={`
                group flex items-center gap-3 px-4 py-3 rounded-none
                transition-all duration-300 ease-in-out border-l-2
                ${isActive(item.path)
                    ? 'bg-emerald-500/5 border-[#00ff88] text-[#00ff88] gpsx-glow'
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }
            `}
        >
            <span className={`
                transition-transform duration-300
                ${isActive(item.path) ? 'scale-110 shadow-[0_0_10px_rgba(0,255,136,0.3)]' : 'group-hover:scale-110'}
            `}>
                {React.cloneElement(item.icon as React.ReactElement, { size: 18, color: isActive(item.path) ? '#00ff88' : 'currentColor' })}
            </span>
            <span className="font-bold tracking-widest text-sm">
                {isActive(item.path) ? `[ ${item.label} ]` : item.label}
            </span>
            {item.badge && (
                <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-[#00ff88] text-black uppercase">
                    {item.badge}
                </span>
            )}
            {isActive(item.path) && (
                <div className="ml-auto w-1 h-1 bg-[#00ff88] animate-pulse rounded-full shadow-[0_0_5px_#00ff88]" />
            )}
        </NavLink>
    );

    return (
        <aside className="w-64 h-screen bg-black border-r border-white/5 flex flex-col relative overflow-hidden">
            <div className="gpsx-scanline"></div>

            {/* Logo */}
            <div className="p-8 border-b border-white/5">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-none border border-[#00ff88] shadow-[0_0_15px_rgba(0,255,136,0.3)] flex items-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-[#00ff88]/10 group-hover:bg-[#00ff88]/20 transition-colors"></div>
                            <Zap size={16} className="text-[#00ff88] relative z-10" />
                        </div>
                        <h1 className="text-xl font-black text-white tracking-tighter leading-none gpsx-glow">
                            GPSX
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="h-[1px] w-4 bg-[#00ff88]/40"></div>
                        <span className="text-[10px] text-[#00ff88]/60 font-bold tracking-[0.2em] uppercase">
                            Sonic Scribe
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto mt-4">
                <p className="px-4 py-2 text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    // 核心业务模块
                </p>
                {mainNavItems.map(item => (
                    <NavItemComponent key={item.path} item={item} />
                ))}
            </nav>

            {/* Bottom Navigation */}
            <div className="p-4 border-t border-white/5 bg-white/[0.02]">
                {bottomNavItems.map(item => (
                    <NavItemComponent key={item.path} item={item} />
                ))}

                {/* User Info */}
                <div className="mt-6 p-4 border border-white/5 bg-black flex items-center gap-3 group hover:border-[#00ff88]/30 transition-all cursor-crosshair">
                    <div className="w-8 h-8 rounded-none bg-[#111] border border-white/10 flex items-center justify-center text-[#00ff88] text-xs font-bold font-mono">
                        X
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-white tracking-widest uppercase">管理员节点</p>
                        <p className="text-[10px] text-[#00ff88]/60 font-mono">v1.0.4_稳定版</p>
                    </div>
                </div>

                {/* Powered By */}
                <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-[9px] text-slate-600 font-bold tracking-[0.15em] text-center hover:text-[#00ff88]/40 transition-colors">
                        [ POWERED BY GPSX LAB ]
                    </p>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
