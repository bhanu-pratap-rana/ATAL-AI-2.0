"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  exportStudentProgress,
  exportAIInteractions,
} from "@/app/actions/teacher";
import { arrayToCsv, downloadCsv, type CsvColumn } from "@/lib/csv";
import { clientLogger } from "@/lib/client-logger";

type ExportType = "progress" | "ai";

interface ExportButtonProps {
  readonly classId: string;
  readonly type: ExportType;
  readonly className?: string;
}

// Column order + headers for each export. Keys match the flat objects the
// server actions return; CSV cell safety is handled entirely in @/lib/csv.
type Row = Record<string, unknown>;

const PROGRESS_COLUMNS: ReadonlyArray<CsvColumn<Row>> = [
  { key: "name", header: "Student" },
  { key: "roll_number", header: "Roll Number" },
  { key: "progress_percentage", header: "Progress %" },
  { key: "mastery_score", header: "Mastery Score" },
  { key: "last_active", header: "Last Active" },
];

const AI_COLUMNS: ReadonlyArray<CsvColumn<Row>> = [
  { key: "student_name", header: "Student" },
  { key: "topic_id", header: "Topic" },
  { key: "role", header: "Role" },
  { key: "message", header: "Message" },
  { key: "language", header: "Language" },
  { key: "input_mode", header: "Input Mode" },
  { key: "tokens_used", header: "Tokens" },
  { key: "created_at", header: "Timestamp" },
];

interface ExportResult {
  success?: boolean;
  data?: Row[];
  error?: string;
}

export function ExportButton({ classId, type, className }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const raw =
        type === "progress"
          ? await exportStudentProgress(classId)
          : await exportAIInteractions(classId);
      const result = raw as unknown as ExportResult;

      if (!result.success) {
        toast.error(result.error ?? "Export failed");
        return;
      }

      const rows = result.data ?? [];
      if (rows.length === 0) {
        toast.info("Nothing to export yet");
        return;
      }

      const columns = type === "progress" ? PROGRESS_COLUMNS : AI_COLUMNS;
      const stamp = new Date().toISOString().slice(0, 10);
      const baseName = type === "progress" ? "student-progress" : "ai-interactions";
      downloadCsv(`${baseName}-${stamp}.csv`, arrayToCsv(rows, columns));
      toast.success("Export ready");
    } catch (error) {
      clientLogger.error(
        "[ExportButton] export failed",
        error instanceof Error ? error : { error: String(error) },
      );
      toast.error("Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading}
      className={className}
    >
      <Download size={14} strokeWidth={2.5} aria-hidden="true" className="mr-1.5" />
      {loading ? "Exporting…" : "Export CSV"}
    </Button>
  );
}
