"use client";

/**
 * Reusable list item card component for displaying modal content
 * Consolidates 80+ lines of duplicated item rendering patterns
 * across 5 different modal types (Schools, Teachers, Students, PINs)
 */

type ModalType =
  | "schools"
  | "teachers"
  | "students"
  | "activePINs"
  | "inactivePINs"
  | null;

interface SchoolItem {
  readonly id: string;
  readonly schoolName: string;
  readonly schoolCode: string;
  readonly district: string;
  readonly block?: string | null;
  readonly hasPIN?: boolean;
}

interface TeacherItem {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly phone: string | null;
  readonly schoolName: string;
  readonly schoolCode: string;
  readonly createdAt: string;
}

interface StudentItem {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly phone: string | null;
  readonly className: string | null;
  readonly schoolName: string | null;
  readonly createdAt: string;
  readonly lastSignIn: string | null;
}

interface ActivePINSchool {
  readonly schoolId: string;
  readonly schoolName: string;
  readonly schoolCode: string;
  readonly districtName: string;
  readonly lastRotatedAt: string | null;
}

interface ListItemCardProps {
  readonly item: SchoolItem | TeacherItem | StudentItem | ActivePINSchool;
  readonly modalType: ModalType;
}

export function ListItemCard({ item, modalType }: ListItemCardProps) {
  const renderSchoolItem = (school: SchoolItem) => (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-black text-slate-800">{school.schoolName}</h4>
          <p className="text-sm text-slate-500">{school.district}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-mono text-slate-800">
            {school.schoolCode}
          </p>
          <p className="text-xs text-slate-400">
            {school.hasPIN ? "PIN Active" : "No PIN"}
          </p>
        </div>
      </div>
      {school.block && (
        <p className="text-xs text-slate-400 mt-2">Block: {school.block}</p>
      )}
    </>
  );

  const renderTeacherItem = (teacher: TeacherItem) => (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-black text-slate-800">{teacher.name}</h4>
          <p className="text-sm text-slate-500">{teacher.email}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-800">{teacher.schoolName}</p>
          <p className="text-xs text-slate-400 font-mono">
            {teacher.schoolCode}
          </p>
        </div>
      </div>
      {teacher.phone && (
        <p className="text-xs text-slate-400 mt-2">
          Phone: {teacher.phone}
        </p>
      )}
      <p className="text-xs text-slate-400 mt-1">
        Joined: {new Date(teacher.createdAt).toLocaleDateString()}
      </p>
    </>
  );

  const renderStudentItem = (student: StudentItem) => (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-black text-slate-800">{student.name}</h4>
          {student.email && (
            <p className="text-sm text-slate-500">{student.email}</p>
          )}
          {student.phone && (
            <p className="text-sm text-slate-500">{student.phone}</p>
          )}
        </div>
        {(student.schoolName || student.className) && (
          <div className="text-right">
            {student.schoolName && (
              <p className="text-sm text-slate-800">{student.schoolName}</p>
            )}
            {student.className && (
              <p className="text-xs text-slate-400">{student.className}</p>
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Joined: {new Date(student.createdAt).toLocaleDateString()}
      </p>
      {student.lastSignIn && (
        <p className="text-xs text-slate-400">
          Last Sign In: {new Date(student.lastSignIn).toLocaleDateString()}
        </p>
      )}
    </>
  );

  const renderActivePINItem = (school: ActivePINSchool) => (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-black text-slate-800">{school.schoolName}</h4>
          <p className="text-sm text-slate-500">{school.districtName}</p>
        </div>
        <p className="text-sm font-mono text-slate-800">
          {school.schoolCode}
        </p>
      </div>
      {school.lastRotatedAt && (
        <p className="text-xs text-slate-400 mt-2">
          Last Rotated: {new Date(school.lastRotatedAt).toLocaleDateString()}
        </p>
      )}
    </>
  );

  const renderInactivePINItem = (school: SchoolItem) => (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-black text-slate-800">{school.schoolName}</h4>
          <p className="text-sm text-slate-500">{school.district}</p>
        </div>
        <p className="text-sm font-mono text-slate-800">
          {school.schoolCode}
        </p>
      </div>
      <p className="text-xs text-error mt-2">No active PIN</p>
    </>
  );

  return (
    <div className="bg-slate-50 rounded-md p-4 border border-slate-200">
      {modalType === "schools" && renderSchoolItem(item as SchoolItem)}
      {modalType === "teachers" && renderTeacherItem(item as TeacherItem)}
      {modalType === "students" && renderStudentItem(item as StudentItem)}
      {modalType === "activePINs" &&
        renderActivePINItem(item as ActivePINSchool)}
      {modalType === "inactivePINs" &&
        renderInactivePINItem(item as SchoolItem)}
    </div>
  );
}
