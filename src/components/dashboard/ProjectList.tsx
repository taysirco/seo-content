import { useState, useMemo } from 'react';
import Link from "next/link";
import { Cloud, Search, Tag, Loader2, FolderOpen, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { ProjectSummary } from '@/lib/firebase';

interface ProjectListProps {
    projects: ProjectSummary[];
    loading: boolean;
    onDelete: (id: string) => Promise<void>;
}

function relativeTime(dateStr: string): string {
    const now = Date.now();
    const d = new Date(dateStr).getTime();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ProjectList({ projects, loading, onDelete }: ProjectListProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDomain, setFilterDomain] = useState('');
    const [filterTag, setFilterTag] = useState('');

    const { uniqueDomains, uniqueTags } = useMemo(() => {
        const domains = new Set<string>();
        const tags = new Set<string>();
        projects.forEach(p => {
            if (p.domain) domains.add(p.domain);
            p.tags?.forEach(t => tags.add(t));
        });
        return { uniqueDomains: Array.from(domains).sort(), uniqueTags: Array.from(tags).sort() };
    }, [projects]);

    const filteredProjects = useMemo(() => {
        let list = projects;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(p =>
                p.keyword.toLowerCase().includes(q) ||
                p.clientName?.toLowerCase().includes(q) ||
                p.domain?.toLowerCase().includes(q)
            );
        }
        if (filterDomain) {
            list = list.filter(p => p.domain === filterDomain);
        }
        if (filterTag) {
            list = list.filter(p => p.tags?.includes(filterTag));
        }
        return list;
    }, [projects, searchQuery, filterDomain, filterTag]);

    if (!loading && projects.length === 0) return null;

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
                <Cloud className="w-5 h-5" />
                Saved Projects
                <Badge variant="secondary" className="text-[10px]">{projects.length}</Badge>
            </h3>

            {/* Filters */}
            {projects.length > 2 && (
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search by keyword, client, or domain..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pr-9 h-9 text-sm"
                        />
                    </div>
                    {uniqueDomains.length > 1 && (
                        <select
                            value={filterDomain}
                            onChange={(e) => setFilterDomain(e.target.value)}
                            className="h-9 px-3 text-sm border rounded-md bg-background"
                        >
                            <option value="">All Sites</option>
                            {uniqueDomains.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    )}
                    {uniqueTags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                            <Tag className="w-3 h-3 text-muted-foreground" />
                            {uniqueTags.map(t => (
                                <Badge
                                    key={t}
                                    variant={filterTag === t ? 'default' : 'outline'}
                                    className="text-[10px] cursor-pointer hover:bg-primary/10"
                                    onClick={() => setFilterTag(filterTag === t ? '' : t)}
                                >
                                    {t}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading projects...</span>
                </div>
            ) : filteredProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No matching projects</p>
            ) : (
                <div className="space-y-2">
                    {filteredProjects.map(project => (
                        <div key={project.id} className="rounded-xl border bg-card p-4 hover:border-primary/30 transition-colors">
                            <div className="flex items-center justify-between">
                                <Link href={`/project/${project.id}`} className="flex-1 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                        {project.logoUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={project.logoUrl} alt="" className="w-7 h-7 rounded object-cover" />
                                        ) : (
                                            <FolderOpen className="w-5 h-5 text-blue-500" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold truncate">{project.keyword || 'Untitled'}</p>
                                            {project.clientName && (
                                                <Badge variant="default" className="text-[9px] shrink-0">{project.clientName}</Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {project.domain && (
                                                <Badge variant="outline" className="text-[9px]" dir="ltr">{project.domain}</Badge>
                                            )}
                                            {project.city && (
                                                <Badge variant="outline" className="text-[9px]">{project.city}</Badge>
                                            )}
                                            <Badge variant="secondary" className="text-[9px]">
                                                Step {project.currentStep}/13
                                            </Badge>
                                            {project.tags?.map(t => (
                                                <Badge key={t} variant="secondary" className="text-[8px] bg-primary/5">{t}</Badge>
                                            ))}
                                            <span className="text-[9px] text-muted-foreground">
                                                {relativeTime(project.updatedAt)}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Project</AlertDialogTitle>
                                            <AlertDialogDescription>Project &quot;{project.keyword}&quot; will be permanently deleted from the cloud.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDelete(project.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                            <div className="mt-2">
                                <Progress value={(project.currentStep / 13) * 100} className="h-1" />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
