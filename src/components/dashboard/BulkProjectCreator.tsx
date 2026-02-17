import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

interface BulkProjectCreatorProps {
    onClone: (kw: string) => string;
    onClose: () => void;
}

export function BulkProjectCreator({ onClone, onClose }: BulkProjectCreatorProps) {
    const router = useRouter();
    const [bulkKeywords, setBulkKeywords] = useState('');

    const handleCreate = () => {
        const keywords = bulkKeywords.split('\n').map(k => k.trim()).filter(Boolean);
        if (keywords.length === 0) {
            toast.error('Enter at least one keyword');
            return;
        }

        let firstId = '';
        for (const kw of keywords) {
            const id = onClone(kw);
            if (!firstId) firstId = id;
        }

        toast.success(`Created ${keywords.length} projects`);
        setBulkKeywords('');
        onClose();
        if (firstId) router.push(`/project/${firstId}`);
    };

    return (
        <div className="rounded-xl border bg-card p-5 space-y-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Bulk Create Projects (one keyword per line)
            </h4>
            <p className="text-[10px] text-muted-foreground">
                Client settings, location, and rules will be copied to each new project
            </p>
            <textarea
                className="w-full h-32 p-3 text-sm border rounded-lg bg-background resize-none"
                placeholder={"keyword 1\nkeyword 2\nkeyword 3"}
                value={bulkKeywords}
                onChange={(e) => setBulkKeywords(e.target.value)}
            />
            <div className="flex items-center gap-3">
                <Button
                    onClick={handleCreate}
                    disabled={!bulkKeywords.trim()}
                    className="gap-2"
                >
                    <Copy className="w-4 h-4" />
                    Create {bulkKeywords.split('\n').filter(k => k.trim()).length || 0} Projects
                </Button>
                <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            </div>
        </div>
    );
}
