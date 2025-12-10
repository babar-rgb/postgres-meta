import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Database, Table2, Plus, Settings, Home, Star } from 'lucide-react';
import ConnectionStatus from './ConnectionStatus';
import { useTables } from '../hooks/useDb';
import CreateTableModal from './modals/CreateTableModal';
import ConnectionSettings from './modals/ConnectionSettings';

export default function Sidebar() {
    const { data: tables, isLoading } = useTables();

    // Debugging: Log if tables are fetched but empty
    if (tables && tables.length === 0) {
        console.log("Sidebar: Tables fetched but list is empty. Check if you are looking at the correct schema (public).", tables);
    }

    const [isTableModalOpen, setIsTableModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const [favorites, setFavorites] = useState<string[]>(() => {
        const saved = localStorage.getItem('nexus_favorites');
        return saved ? JSON.parse(saved) : [];
    });

    const toggleFavorite = (tableName: string) => {
        const newFavs = favorites.includes(tableName)
            ? favorites.filter(t => t !== tableName)
            : [...favorites, tableName];
        setFavorites(newFavs);
        localStorage.setItem('nexus_favorites', JSON.stringify(newFavs));
    };

    const isFavorite = (name: string) => favorites.includes(name);

    return (
        <>
            <div className="w-[250px] bg-background border-r border-border h-full flex flex-col text-sm text-subtle shrink-0 font-sans">
                <div className="p-4 border-b border-border flex items-center gap-2">
                    <div className="w-5 h-5 bg-white rounded-md flex items-center justify-center">
                        <div className="w-2 h-2 bg-black rounded-full" />
                    </div>
                    <span className="font-medium text-accent">Project Nexus</span>
                </div>

                <div className="flex-1 overflow-auto py-4 px-2">
                    <div className="mb-6">
                        <NavLink
                            to="/"
                            className={({ isActive }) =>
                                `flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors mb-4 ${isActive ? 'bg-active text-accent' : 'hover:bg-surface text-subtle hover:text-accent'}`
                            }
                        >
                            <Home size={14} />
                            <span>Home</span>
                        </NavLink>

                        <div className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-[#555]">Favorites</div>
                        {favorites.length === 0 ? (
                            <div className="text-xs px-2 text-zinc-600 italic">No favorites yet</div>
                        ) : (
                            <div className="space-y-0.5">
                                {favorites.map(fav => (
                                    <NavLink
                                        key={fav}
                                        to={`/table/${fav}`}
                                        className={({ isActive }) =>
                                            `flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors group justify-between ${isActive
                                                ? 'bg-active text-accent'
                                                : 'hover:bg-surface text-subtle hover:text-accent'
                                            }`
                                        }
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Table2 size={14} className="text-yellow-500" />
                                            <span className="truncate">{fav}</span>
                                        </div>
                                    </NavLink>
                                ))}
                            </div>
                        )}
                    </div>


                    {/* TABLES SECTION */}
                    <div>
                        <div className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-[#555] flex justify-between items-center group cursor-pointer hover:text-zinc-300">
                            <span>Tables</span>
                            <button
                                onClick={(e) => { e.preventDefault(); setIsTableModalOpen(true); }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#222] rounded transition-all"
                                title="Create new table"
                            >
                                <Plus size={14} />
                            </button>
                        </div>

                        <div className="space-y-0.5">
                            {isLoading ? (
                                <div className="px-2 space-y-2 opacity-50">
                                    <div className="h-5 bg-[#222] rounded w-3/4 animate-pulse" />
                                    <div className="h-5 bg-[#222] rounded w-1/2 animate-pulse" />
                                </div>
                            ) : tables?.filter(t => (t as any).type === 'BASE TABLE').length === 0 ? (
                                <div className="px-2 text-xs text-subtle">No tables found</div>
                            ) : (
                                tables?.filter(t => (t as any).type === 'BASE TABLE').map((table) => (
                                    <div key={table.id} className="group relative flex items-center">
                                        <NavLink
                                            to={`/table/${table.name}`}
                                            className={({ isActive }) =>
                                                `flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors border border-transparent ${isActive
                                                    ? 'bg-active text-accent border-[#333]'
                                                    : 'hover:bg-surface text-subtle hover:text-accent'
                                                }`
                                            }
                                        >
                                            <Table2 size={14} />
                                            <span className="truncate" title={table.name}>{table.name}</span>
                                        </NavLink>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                toggleFavorite(table.name);
                                            }}
                                            className={`absolute right-2 p-1 rounded hover:bg-[#222] transition-all ${isFavorite(table.name) ? 'opacity-100 text-yellow-500' : 'opacity-0 group-hover:opacity-100 text-zinc-600'}`}
                                            title="Toggle Favorite"
                                        >
                                            <Star size={12} fill={isFavorite(table.name) ? "currentColor" : "none"} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* VIEWS SECTION */}
                    {tables?.some(t => (t as any).type === 'VIEW') && (
                        <div className="mt-6">
                            <div className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-[#555] flex justify-between items-center group cursor-pointer hover:text-zinc-300">
                                <span>Views</span>
                            </div>

                            <div className="space-y-0.5">
                                {tables?.filter(t => (t as any).type === 'VIEW').map((table) => (
                                    <div key={table.id} className="group relative flex items-center">
                                        <NavLink
                                            to={`/table/${table.name}`}
                                            className={({ isActive }) =>
                                                `flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors border border-transparent ${isActive
                                                    ? 'bg-active text-accent border-[#333]'
                                                    : 'hover:bg-surface text-subtle hover:text-accent'
                                                }`
                                            }
                                        >
                                            <div className="flex items-center justify-center w-[14px] h-[14px]">
                                                {/* Eye icon or similar for Views */}
                                                <div className="w-1.5 h-1.5 rounded-full border border-subtle group-hover:border-accent"></div>
                                            </div>
                                            <span className="truncate italic" title={table.name}>{table.name}</span>
                                        </NavLink>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                toggleFavorite(table.name);
                                            }}
                                            className={`absolute right-2 p-1 rounded hover:bg-[#222] transition-all ${isFavorite(table.name) ? 'opacity-100 text-yellow-500' : 'opacity-0 group-hover:opacity-100 text-zinc-600'}`}
                                            title="Toggle Favorite"
                                        >
                                            <Star size={12} fill={isFavorite(table.name) ? "currentColor" : "none"} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-6 space-y-1">
                        <NavLink
                            to="/sql"
                            className={({ isActive }) =>
                                `flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${isActive ? 'bg-active text-accent' : 'hover:bg-surface text-subtle hover:text-accent'
                                }`
                            }
                        >
                            <Database size={14} />
                            <span>SQL Editor</span>
                        </NavLink>

                        <NavLink
                            to="/schema"
                            className={({ isActive }) =>
                                `flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${isActive ? 'bg-active text-accent' : 'hover:bg-surface text-subtle hover:text-accent'
                                }`
                            }
                        >
                            <div className="rotate-90">
                                <Database size={14} className="opacity-50" />
                            </div>
                            <span>Schema Visualizer</span>
                        </NavLink>
                    </div>
                </div>

                <div className="p-2 border-t border-border">
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors hover:bg-surface text-subtle hover:text-accent group"
                    >
                        <Settings size={14} className="group-hover:rotate-45 transition-transform" />
                        <span>Settings</span>
                    </button>
                </div>

                <div className="p-3 border-t border-border text-xs text-subtle flex justify-between items-center bg-[#070707]">
                    <span className="font-mono">v0.6.0</span>
                    <ConnectionStatus />
                </div>
            </div>

            <CreateTableModal isOpen={isTableModalOpen} onClose={() => setIsTableModalOpen(false)} />
            <ConnectionSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </>
    );
}
