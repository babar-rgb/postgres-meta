import StatCards from './dashboard/StatCards';
import ActivityChart from './dashboard/ActivityChart';
import QuickActions from './dashboard/QuickActions';
import { ShieldCheck } from 'lucide-react';

export default function Dashboard() {
    return (
        <div className="flex-1 overflow-auto bg-[#050505]">
            <div className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1">Project Overview</h1>
                        <p className="text-subtle text-sm">Welcome back. Here is what is happening with your database.</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-900/20 text-green-500 rounded-full border border-green-900/50 text-xs font-medium">
                        <ShieldCheck size={14} />
                        <span>System Healthy</span>
                    </div>
                </div>

                {/* Main Stats */}
                <StatCards />

                {/* Charts & Actions Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Chart */}
                    <div className="lg:col-span-2">
                        <ActivityChart />
                    </div>

                    {/* Right: Actions */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-semibold text-subtle uppercase tracking-wider">Quick Actions</h3>
                        <QuickActions />

                        {/* Mini Help Section */}
                        <div className="bg-[#111] border border-[#222] p-4 rounded-lg">
                            <h4 className="text-white text-sm font-medium mb-2">Need Help?</h4>
                            <p className="text-xs text-subtle mb-3 leading-relaxed">
                                Check out the auto-generated API documentation for usage examples with Client Libraries.
                            </p>
                            <a href="#" className="text-xs text-blue-400 hover:text-blue-300">Read Documentation &rarr;</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
