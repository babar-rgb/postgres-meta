import { NavLink } from 'react-router-dom';
import { Terminal, FileCode, Network, ArrowRight } from 'lucide-react';

const actions = [
    {
        title: 'SQL Editor',
        desc: 'Run raw queries',
        icon: Terminal,
        href: '/sql',
        color: 'text-yellow-500',
        bg: 'bg-yellow-500/10'
    },
    {
        title: 'Schema Viz',
        desc: 'View ER Diagram',
        icon: Network,
        href: '/schema',
        color: 'text-blue-500',
        bg: 'bg-blue-500/10'
    },
    {
        title: 'API Docs',
        desc: 'Read documentation',
        icon: FileCode,
        href: '/table/users', // Default link, user can navigate
        color: 'text-green-500',
        bg: 'bg-green-500/10'
    },
];

export default function QuickActions() {
    return (
        <div className="grid grid-cols-1 gap-3">
            {actions.map((action) => (
                <NavLink
                    key={action.title}
                    to={action.href}
                    className="bg-[#0C0C0C] border border-[#222] p-4 rounded-lg flex items-center justify-between group hover:border-[#444] hover:bg-[#111] transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-md ${action.bg} ${action.color}`}>
                            <action.icon size={20} />
                        </div>
                        <div>
                            <div className="font-medium text-white text-sm">{action.title}</div>
                            <div className="text-xs text-subtle">{action.desc}</div>
                        </div>
                    </div>
                    <ArrowRight size={16} className="text-[#444] group-hover:text-white group-hover:translate-x-1 transition-all" />
                </NavLink>
            ))}
        </div>
    );
}
