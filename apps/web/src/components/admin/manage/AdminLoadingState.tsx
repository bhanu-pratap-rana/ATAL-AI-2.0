/**
 * AdminLoadingState Component
 * Displays loading screen while checking authorization
 */

import { Loader2 } from "lucide-react";

export function AdminLoadingState() {
  return (
    <div className="min-h-screen bg-linear-to-br from-surface via-background to-white flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-slate-500">Verifying authorization...</p>
      </div>
    </div>
  );
}
