import Link from "next/link";
import { Search, Copy, Trash2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { STEPS_META } from "@/types/pipeline";

interface LocalProjectCardProps {
    keyword: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clientMeta: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    location: any;
    currentStep: number;
    completedSteps: number;
    onDelete: () => void;
}

export function LocalProjectCard({
    keyword,
    clientMeta,
    location,
    currentStep,
    completedSteps,
    onDelete,
}: LocalProjectCardProps) {
    return (
        <div className="space-y-3">
            <h3 className="font-semibold text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Current Project
            </h3>
            <div className="rounded-xl border bg-card p-5 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between">
                    <Link href="/project/new" className="flex-1 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            {clientMeta?.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={clientMeta.logoUrl} alt="" className="w-8 h-8 rounded object-cover" />
                            ) : (
                                <Search className="w-6 h-6 text-primary" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-lg truncate">{keyword}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {clientMeta?.clientName && (
                                    <Badge variant="default" className="text-[10px]">{clientMeta.clientName}</Badge>
                                )}
                                {clientMeta?.domain && (
                                    <Badge variant="outline" className="text-[10px]" dir="ltr">{clientMeta.domain}</Badge>
                                )}
                                {location?.cityAr && (
                                    <Badge variant="outline" className="text-[10px]">{location.cityAr}</Badge>
                                )}
                                <Badge variant="secondary" className="text-[10px]">
                                    Step {currentStep}/13 — {STEPS_META[currentStep - 1]?.titleEn}
                                </Badge>
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
                                <AlertDialogTitle>Delete Local Project</AlertDialogTitle>
                                <AlertDialogDescription>Project &quot;{keyword}&quot; and all its data will be permanently deleted. This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
                <div className="mt-3 flex items-center gap-3">
                    <Progress value={(completedSteps / 13) * 100} className="h-1.5 flex-1" />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{completedSteps}/13 done</span>
                </div>
            </div>
        </div>
    );
}
