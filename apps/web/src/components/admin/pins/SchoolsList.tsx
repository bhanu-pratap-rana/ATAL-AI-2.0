/**
 * SchoolsList Component
 * Displays list of all schools with PIN status
 */

import type { SchoolListItem, SchoolPINInfo } from "@/app/actions/admin-pin-management";

interface SchoolsListProps {
  readonly schools: SchoolListItem[];
  readonly selectedSchool: SchoolPINInfo | null;
  readonly onSelectSchool: (school: SchoolListItem) => Promise<void>;
  readonly isLoading: boolean;
}

export function SchoolsList({
  schools,
  selectedSchool,
  onSelectSchool,
  isLoading,
}: SchoolsListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">Loading schools...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-slate-200">
        <p className="text-sm font-semibold text-slate-500">
          Schools ({schools.length})
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {schools.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <p className="text-sm text-slate-500 text-center">
              No schools found
            </p>
          </div>
        ) : (
          schools.map((school) => (
            <button
                type="button"
              key={school.schoolId}
              onClick={() => onSelectSchool(school)}
              className={`w-full text-left px-4 py-3 border-b border-slate-200 transition-colors hover:bg-slate-100 ${
                selectedSchool?.schoolId === school.schoolId
                  ? "bg-primary/10 border-l-4 border-l-primary"
                  : ""
              }`}
            >
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
            </button>
          ))
        )}
      </div>
    </div>
  );
}
