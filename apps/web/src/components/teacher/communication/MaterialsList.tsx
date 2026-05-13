"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ExternalLink,
  File,
  FileText,
  FolderClosed,
  ImageIcon,
  Link2,
  Trash2,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format-date";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteMaterial, type Material } from "@/app/actions/teacher";
import { clientLogger } from "@/lib/client-logger";

interface MaterialsListProps {
  readonly materials: Material[];
  readonly classId: string;
}

const typeConfig: Record<string, { Icon: LucideIcon; label: string }> = {
  document: { Icon: FileText, label: "Document" },
  video: { Icon: Video, label: "Video" },
  link: { Icon: Link2, label: "Link" },
  image: { Icon: ImageIcon, label: "Image" },
  other: { Icon: File, label: "Other" },
};

export function MaterialsList({ materials, classId: _classId }: MaterialsListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (materialId: string) => {
    setDeletingId(materialId);
    try {
      const result = await deleteMaterial(materialId);
      if (result.success) {
        toast.success("Material deleted");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete material");
      }
    } catch (error) {
      clientLogger.error("[MaterialsList] Delete error", error instanceof Error ? error : { error: String(error) });
      toast.error("An unexpected error occurred");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleOpenLink = (material: Material) => {
    const url = material.external_url || material.file_url;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  if (materials.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 text-(--bento-orange-d)">
          <FolderClosed className="w-8 h-8" strokeWidth={2.25} aria-hidden="true" />
        </div>
        <h3 className="text-lg font-black text-slate-800 mb-2">
          No materials shared yet
        </h3>
        <p className="text-slate-500 text-sm">
          Add learning materials to help your students.
        </p>
      </div>
    );
  }

  // Sort by created_at (newest first)
  const sortedMaterials = [...materials].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="space-y-4">
      {sortedMaterials.map((material) => {
        const typeInfo =
          typeConfig[material.material_type] || typeConfig.other;
        const url = material.external_url || material.file_url;

        return (
          <Card key={material.id} className="border-slate-200 hover:shadow-sm transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <typeInfo.Icon className="w-5 h-5 text-slate-600 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                    <CardTitle className="text-lg truncate">
                      {material.title}
                    </CardTitle>
                  </div>
                  <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
                    <span>
                      Added {formatRelativeTime(material.created_at)}
                    </span>
                    {material.module_id && (
                      <Badge variant="info" className="text-xs">
                        {material.module_id}
                      </Badge>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary">{typeInfo.label}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenLink(material)}
                    disabled={!url}
                    title="Open material"
                    aria-label="Open material"
                  >
                    <ExternalLink size={16} strokeWidth={2.25} aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDeleteId(material.id)}
                    disabled={deletingId === material.id}
                    className="text-slate-400 hover:text-error"
                    aria-label="Delete material"
                  >
                    {deletingId === material.id ? (
                      "..."
                    ) : (
                      <Trash2 size={16} strokeWidth={2.25} aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {(material.description || url) && (
              <CardContent className="pt-0">
                {material.description && (
                  <p className="text-slate-500 text-sm mb-2">
                    {material.description}
                  </p>
                )}
                {url && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400">Downloads:</span>
                    <span className="font-medium">{material.download_count}</span>
                    <span className="text-slate-400 ml-4">Views:</span>
                    <span className="font-medium">{material.view_count}</span>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Material</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this material? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
              disabled={deletingId === confirmDeleteId}
            >
              {deletingId === confirmDeleteId ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
