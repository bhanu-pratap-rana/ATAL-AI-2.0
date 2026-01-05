'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { removeStudent } from '@/app/actions/teacher'

interface StudentInfo {
  user_id: string
  name: string | null
  phone: string | null
  roll_number: string | null
  class_name: string | null
}

interface Enrollment {
  id: string
  created_at: string
  student_id: string
  student: StudentInfo | null
}

interface RosterTableProps {
  readonly enrollments: Enrollment[]
  readonly classId: string
}

export function RosterTable({ enrollments, classId }: RosterTableProps) {
  const router = useRouter()
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleRemove(studentId: string, studentName: string) {
    if (!confirm(`Remove ${studentName} from this class?`)) {
      return
    }

    setRemovingId(studentId)

    try {
      const result = await removeStudent(classId, studentId)

      if (result.success) {
        toast.success('Student removed successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to remove student')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setRemovingId(null)
    }
  }

  // Helper to get display name for student
  function getStudentDisplayName(enrollment: Enrollment): string {
    return enrollment.student?.name || `Student ${enrollment.student_id.slice(0, 8)}`
  }

  // Helper to get student initial
  function getStudentInitial(enrollment: Enrollment): string {
    const name = enrollment.student?.name
    if (name) {
      return name[0].toUpperCase()
    }
    return 'S'
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <Table role="table" aria-label="Class roster with student enrollment information">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Student</TableHead>
            <TableHead scope="col" className="hidden sm:table-cell">Roll No.</TableHead>
            <TableHead scope="col" className="hidden md:table-cell">Class</TableHead>
            <TableHead scope="col" className="hidden lg:table-cell">Phone</TableHead>
            <TableHead scope="col" className="hidden xl:table-cell">Enrolled</TableHead>
            <TableHead scope="col" className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollments.map((enrollment) => {
            const enrolledDate = new Date(enrollment.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
            const displayName = getStudentDisplayName(enrollment)
            const initial = getStudentInitial(enrollment)

            return (
              <TableRow key={enrollment.id}>
                <TableCell>
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-2">
                    <div className="flex items-center gap-2">
                      <div className="size-8 shrink-0 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {initial}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm md:text-base">
                          {displayName}
                        </span>
                        {/* Mobile-only: Show roll number and class inline */}
                        <div className="flex gap-2 text-xs text-muted-foreground sm:hidden">
                          {enrollment.student?.roll_number && (
                            <span>#{enrollment.student.roll_number}</span>
                          )}
                          {enrollment.student?.class_name && (
                            <span>{enrollment.student.class_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground xl:hidden ml-10 md:ml-0">
                      {enrolledDate}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground">
                  {enrollment.student?.roll_number || '-'}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {enrollment.student?.class_name || '-'}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground">
                  {enrollment.student?.phone || '-'}
                </TableCell>
                <TableCell className="hidden xl:table-cell text-muted-foreground">
                  {enrolledDate}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(enrollment.student_id, displayName)}
                    disabled={removingId === enrollment.student_id}
                    className="h-9 px-3"
                    aria-label={`Remove ${displayName} from class`}
                  >
                    {removingId === enrollment.student_id ? 'Removing...' : 'Remove'}
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
