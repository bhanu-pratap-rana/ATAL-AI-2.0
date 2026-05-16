/**
 * SchoolsList Component
 * Displays list of all schools with PIN status
 */

import type { SchoolListItem, SchoolPINInfo } from "@/app/actions/admin-pin-management";
import { Button } from "@/components/ui/button";

interface SchoolsListProps {
  readonly schools: SchoolListItem[];
  readonly selectedSchool: SchoolPINInfo | null;
  readonly onSelectSchool: (school: SchoolListItem) => Promise<void>;
  readonly isLoading: boolean;
  /** Total schools across the dataset; used to surface "Showing X of Y"
   *  when the visible list has been filtered or capped. */
  readonly totalCount?: number;
}

/** Maximum rows rendered at once. Keeps the DOM bounded on low-end
 *  devices — the search box narrows results below this cap quickly. */
const RENDER_CAP = 100;

export function SchoolsList({
  schools,
  selectedSchool,
  onSelectSchool,
  isLoading,
  totalCount,
}: SchoolsListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Loading schools...</p>
      </div>
    );
  }

  const visibleSchools = schools.slice(0, RENDER_CAP);
  const isCapped = schools.length > RENDER_CAP;
  const headerLabel =
    totalCount !== undefined && totalCount !== schools.length
      ? `Schools (${schools.length} of ${totalCount})`
      : `Schools (${schools.length})`;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200">
        <p className="text-sm font-semibold text-slate-500">{headerLabel}</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {schools.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <p className="text-sm text-slate-500 text-center">
              No schools found
            </p>
          </div>
        ) : (
          <>
            {visibleSchools.map((school) => (
              <Button
                type="button"
                variant="ghost"
                key={school.schoolId}
                onClick={() => onSelectSchool(school)}
                className={`w-full h-auto justify-start text-left px-4 py-3 border-b border-slate-200 hover:bg-slate-100 whitespace-normal rounded-none ${
                  selectedSchool?.schoolId === school.schoolId
                    ? "bg-[#1E3A5F]/10 border-l-4 border-l-[#1E3A5F]"
                    : ""
                }`}
              >
                <div className="w-full">
                  <p className="text-sm font-medium text-text truncate">
                    {school.schoolName}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs font-mono text-slate-500">
                      {school.schoolCode}
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${
                        school.hasPIN
                          ? "bg-success/20 text-success"
                          : "bg-warning/20 text-warning"
                      }`}
                    >
                      {school.hasPIN ? "PIN" : "No PIN"}
                    </span>
                  </div>
                </div>
              </Button>
            ))}
            {isCapped && (
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <p className="text-xs text-slate-500 text-center">
                  Showing first {RENDER_CAP} of {schools.length} — refine your
                  search to narrow results.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
