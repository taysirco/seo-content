import { FolderOpen, FileText, Globe, BarChart3 } from "lucide-react";

interface DashboardStatsProps {
    stats: {
        total: number;
        completed: number;
        sites: number;
    };
}

export function DashboardStats({ stats }: DashboardStatsProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <FolderOpen className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-[10px] text-muted-foreground">Total Projects</p>
                </div>
            </div>
            <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-green-500" />
                </div>
                <div>
                    <p className="text-2xl font-bold">{stats.completed}</p>
                    <p className="text-[10px] text-muted-foreground">Completed</p>
                </div>
            </div>
            <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                    <p className="text-2xl font-bold">{stats.sites}</p>
                    <p className="text-[10px] text-muted-foreground">Unique Sites</p>
                </div>
            </div>
            <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                    <p className="text-2xl font-bold">
                        {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">Completion Rate</p>
                </div>
            </div>
        </div>
    );
}
