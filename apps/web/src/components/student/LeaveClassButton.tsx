"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { leaveClass } from "@/app/actions/student";
import { clientLogger } from "@/lib/client-logger";

interface LeaveClassButtonProps {
  readonly classId: string;
  readonly className: string;
}

export function LeaveClassButton({ classId, className }: LeaveClassButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLeave = async () => {
    setLoading(true);
    try {
      const result = await leaveClass(classId);
      if (result.success) {
        toast.success(`You left ${className}`);
        setOpen(false);
        router.push("/app/student/classes");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      clientLogger.error(
        "[LeaveClassButton] leave failed",
        error instanceof Error ? error : { error: String(error) },
      );
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut size={14} strokeWidth={2.5} aria-hidden="true" className="mr-1.5" />
          Leave Class
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave {className}?</DialogTitle>
          <DialogDescription>
            You will no longer see announcements or materials from this class,
            and your teacher will no longer see your progress. You can rejoin
            anytime with the class code.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleLeave}
            disabled={loading}
          >
            {loading ? "Leaving…" : "Leave Class"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
