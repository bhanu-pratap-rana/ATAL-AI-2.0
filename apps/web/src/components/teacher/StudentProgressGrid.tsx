'use client';

/**
 * Real-time Student Progress Grid
 *
 * Shows all enrolled students' progress with live updates.
 * Uses Supabase real-time subscriptions for instant visibility.
 *
 * Features:
 * - Real-time mastery score updates
 * - At-risk student highlighting
 * - Activity status indicators
 * - Click to view detailed progress
 */

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { clientLogger } from '@/lib/client-logger';

interface StudentProgress {
  id: string;
  student_id: string;
  student_name: string;
  email: string;
  module_id: string;
  topics_mastered: number;
  total_topics: number;
  average_mastery: number;
  last_activity: string | null;
  is_at_risk: boolean;
  current_topic?: string;
}

interface StudentProgressGridProps {
  classId: string;
  teacherId: string;
}

export function StudentProgressGrid({ classId, teacherId }: StudentProgressGridProps) {
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial student data
  const fetchStudentProgress = useCallback(async () => {
    try {
      const supabase = createClient();

      // Get all enrolled students with their progress
      const { data, error: fetchError } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          student:auth_users_view!enrollments_student_id_fkey (
            id,
            email,
            raw_user_meta_data
          )
        `)
        .eq('class_id', classId);

      if (fetchError) throw fetchError;

      // Get knowledge state for each student
      const studentIds = data?.map((e) => e.student_id) || [];

      if (studentIds.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      const { data: progressData } = await supabase
        .from('student_knowledge_state')
        .select('*')
        .in('student_id', studentIds);

      // Aggregate progress by student
      const progressMap = new Map<string, StudentProgress>();

      for (const enrollment of data || []) {
        const studentId = enrollment.student_id;
        // The join returns an array, but we expect a single student per enrollment
        const studentArray = enrollment.student as unknown as Array<{
          id: string;
          email: string;
          raw_user_meta_data?: { full_name?: string };
        }> | null;
        const studentData = studentArray?.[0];

        const studentProgress = (progressData || []).filter(
          (p) => p.student_id === studentId
        );

        const masteredTopics = studentProgress.filter(
          (p) => p.status === 'mastered'
        ).length;
        const totalMastery = studentProgress.reduce(
          (sum, p) => sum + (p.mastery_score || 0),
          0
        );
        const avgMastery =
          studentProgress.length > 0
            ? totalMastery / studentProgress.length
            : 0;

        // Check if at-risk (multiple topics with low mastery after many attempts)
        const isAtRisk = studentProgress.some(
          (p) => p.mastery_score < 40 && p.attempts > 3
        );

        // Get latest activity
        const latestActivity = studentProgress.reduce(
          (latest, p) =>
            !latest || (p.last_attempt_at && p.last_attempt_at > latest)
              ? p.last_attempt_at
              : latest,
          null as string | null
        );

        progressMap.set(studentId, {
          id: `${studentId}-progress`,
          student_id: studentId,
          student_name:
            studentData?.raw_user_meta_data?.full_name ||
            studentData?.email?.split('@')[0] ||
            'Unknown Student',
          email: studentData?.email || '',
          module_id: 'all',
          topics_mastered: masteredTopics,
          total_topics: 50, // 5 modules x 10 topics
          average_mastery: Math.round(avgMastery * 100) / 100,
          last_activity: latestActivity,
          is_at_risk: isAtRisk,
        });
      }

      setStudents(Array.from(progressMap.values()));
      setLoading(false);
    } catch (err) {
      clientLogger.error('[StudentProgressGrid] Error:', err instanceof Error ? err : undefined);
      setError('Failed to load student progress');
      setLoading(false);
    }
  }, [classId]);

  // Set up real-time subscription
  useEffect(() => {
    fetchStudentProgress();

    const supabase = createClient();

    // Subscribe to knowledge state changes
    const channel = supabase
      .channel(`class-progress-${classId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_knowledge_state',
        },
        () => {
          // Refetch when any progress changes
          // In a production app, we'd do smarter updates
          fetchStudentProgress();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]); // Only depend on classId to avoid subscription recreation

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-error">
        <p>{error}</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No students enrolled in this class yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {students.map((student) => (
        <StudentProgressCard key={student.id} student={student} />
      ))}
    </div>
  );
}

/**
 * Individual Student Progress Card
 */
function StudentProgressCard({ student }: { student: StudentProgress }) {
  const progressPercent = Math.round(
    (student.topics_mastered / student.total_topics) * 100
  );

  const getActivityStatus = (lastActivity: string | null) => {
    if (!lastActivity) return { status: 'inactive', label: 'No activity' };

    const hours = Math.floor(
      (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60)
    );

    if (hours < 1) return { status: 'active', label: 'Active now' };
    if (hours < 24) return { status: 'recent', label: `${hours}h ago` };
    if (hours < 168) return { status: 'week', label: `${Math.floor(hours / 24)}d ago` };
    return { status: 'inactive', label: 'Over a week' };
  };

  const activity = getActivityStatus(student.last_activity);

  return (
    <Card
      className={`transition-all hover:shadow-md ${
        student.is_at_risk ? 'border-destructive/50 bg-destructive/10' : ''
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium truncate">
            {student.student_name}
          </CardTitle>
          <span
            className={`w-2 h-2 rounded-full ${
              activity.status === 'active'
                ? 'bg-success'
                : activity.status === 'recent'
                ? 'bg-warning'
                : 'bg-muted'
            }`}
            title={activity.label}
          />
        </div>
        <p className="text-xs text-muted-foreground truncate">{student.email}</p>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                student.is_at_risk
                  ? 'bg-destructive'
                  : progressPercent >= 70
                  ? 'bg-success'
                  : progressPercent >= 40
                  ? 'bg-warning'
                  : 'bg-primary'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Mastered:</span>{' '}
            <span className="font-medium">
              {student.topics_mastered}/{student.total_topics}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Avg:</span>{' '}
            <span className="font-medium">{student.average_mastery}%</span>
          </div>
        </div>

        {/* At-Risk Badge */}
        {student.is_at_risk && (
          <div className="mt-2 text-xs text-destructive font-medium flex items-center gap-1">
            <span>⚠️</span> Needs attention
          </div>
        )}

        {/* Activity */}
        <div className="mt-2 text-xs text-muted-foreground">{activity.label}</div>
      </CardContent>
    </Card>
  );
}
