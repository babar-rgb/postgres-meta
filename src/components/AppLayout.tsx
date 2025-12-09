import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
    const location = useLocation();
    const pathSegments = location.pathname.split('/').filter(Boolean);

    // Simple breadcrumb logic
    const breadcrumbs = pathSegments.length > 0
        ? pathSegments.join(' / ')
        : 'Home';

    return (
        <div className="flex h-screen w-full bg-background text-zinc-100 font-sans overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0">
                {/* Minimal Header / Breadcrumbs */}
                <header className="h-[53px] border-b border-border flex items-center px-6 bg-background shrink-0">
                    <div className="text-sm text-subtle">
                        <span className="opacity-50">Project Nexus / </span>
                        <span className="text-accent">{breadcrumbs}</span>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-auto bg-[#0C0C0C]">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
