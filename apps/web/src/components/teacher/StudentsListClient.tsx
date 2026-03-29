"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { StudentRow } from "@/app/app/teacher/classes/page";

function getInitial(name: string | null): string {
  return (name ?? "?").charAt(0).toUpperCase();
}

function getBadge(score: number | null): { label: string; color: string } {
  if (score === null) return { label: "No data", color: "bg-slate-100 text-slate-500" };
  if (score >= 70) return { label: "Proficient", color: "bg-emerald-100 text-emerald-700" };
  if (score >= 40) return { label: "Developing", color: "bg-yellow-100 text-yellow-700" };
  return { label: "Beginner", color: "bg-orange-100 text-orange-700" };
}

function getRelativeTime(iso: string | null): string {
  if (!iso) return "Never active";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function StudentsListClient({ students }: Readonly<{ students: StudentRow[] }>) {
  const [query, setQuery] = useState("");

  const filtered = students.filter((s) =>
    (s.name ?? "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-28">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Search bar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 px-4 py-3">
          <Search size={18} className="text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search students…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm font-bold text-slate-700 placeholder:text-slate-400 bg-transparent outline-none"
          />
        </div>

        {/* Students list */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 sm:p-12 text-center">
            <div className="text-4xl mb-3">👥</div>
            <p className="font-black text-slate-800 mb-1">
              {students.length === 0 ? "No students enrolled" : "No results"}
            </p>
            <p className="text-sm font-bold text-slate-400">
              {students.length === 0
                ? "Students appear here once they join your classes"
                : "Try a different search term"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((student) => {
              const badge = getBadge(student.avgMastery);
              return (
                <div
                  key={student.studentId}
                  className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex items-center justify-between gap-3"
                >
                  {/* Avatar + info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 text-sm flex-shrink-0">
                      {getInitial(student.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-800 text-sm truncate">
                        {student.name ?? "Unknown Student"}
                      </p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Last active: {getRelativeTime(student.lastActiveAt)}
                      </p>
                    </div>
                  </div>

                  {/* Score + badge */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {student.avgMastery !== null && (
                      <p className="text-lg font-black text-blue-600">{student.avgMastery}%</p>
                    )}
                    <span className={`text-xs font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
