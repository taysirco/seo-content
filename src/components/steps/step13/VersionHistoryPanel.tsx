'use client';

import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface VersionHistoryPanelProps {
    versions: { content: string; timestamp: number; label: string }[];
    onRestore: (content: string) => void;
}

// W16-1: Version History Panel
export function VersionHistoryPanel({ versions, onRestore }: VersionHistoryPanelProps) {
    if (versions.length === 0) return null;

    return (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <h4 className="text-xs font-semibold">سجل النسخ ({versions.length})</h4>
            {versions.map((v, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] p-2 rounded border bg-background">
                    <span className="text-muted-foreground shrink-0">{new Date(v.timestamp).toLocaleTimeString('ar-SA')}</span>
                    <span className="flex-1 truncate">{v.label}</span>
                    <span className="text-[9px] text-muted-foreground">{v.content.split(/\s+/).length} كلمة</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] gap-1 shrink-0"
                        onClick={() => {
                            onRestore(v.content);
                            toast.success('تم استعادة النسخة');
                        }}
                    >
                        ↩ استعادة
                    </Button>
                </div>
            ))}
        </div>
    );
}
