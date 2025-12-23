import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getTeacherAssessmentOverview } from '@/app/actions/teacher'

// Format date to relative time
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return date.toLocaleDateString()
}

// Get score color based on value
function getScoreColor(score: number | null): string {
  if (score === null) return 'bg-gray-100 text-gray-600'
  if (score >= 80) return 'bg-success-light text-success-dark'
  if (score >= 60) return 'bg-warning-light text-warning-dark'
  return 'bg-error-light text-error-dark'
}

export default async function TeacherAssessmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/teacher/start')
  }

  // Check app_metadata for role - teachers, admins, and super_admins can access
  const role = user.app_metadata?.role
  const isTeacherOrAdmin = role === 'teacher' || role === 'admin' || role === 'super_admin'
  if (!isTeacherOrAdmin) {
    redirect('/app/dashboard')
  }

  // Fetch real assessment data
  const overviewResult = await getTeacherAssessmentOverview()
  const overview = overviewResult.success ? overviewResult.data : null

  const hasClasses = overview && overview.classes.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream to-surface page-layout">
      <div className="container-responsive max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-responsive">
          <div className="text-center sm:text-left">
            <Link href="/app/dashboard" className="text-primary hover:text-primary-dark mb-4 inline-flex items-center gap-1 text-sm md:text-base touch-target">
              ← Back to Dashboard
            </Link>
            <h1 className="heading-1 text-primary mb-2">📝 Assessments</h1>
            <p className="text-text-secondary text-sm md:text-base">View student assessment results by class</p>
          </div>
        </div>

        {/* Summary Stats */}
        {hasClasses && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-responsive">
            <Card className="card-responsive bg-primary/10 border-primary/20">
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-primary">{overview.classes.length}</p>
                <p className="text-xs text-text-secondary">Classes</p>
              </CardContent>
            </Card>
            <Card className="card-responsive bg-info/10 border-info/20">
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-info-dark">{overview.totalAssessments}</p>
                <p className="text-xs text-text-secondary">Total Assessments</p>
              </CardContent>
            </Card>
            <Card className="card-responsive bg-success/10 border-success/20 col-span-2 md:col-span-1">
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-success-dark">
                  {overview.overallAverageScore !== null ? `${overview.overallAverageScore}%` : '-'}
                </p>
                <p className="text-xs text-text-secondary">Average Score</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Classes with Assessment Results */}
        <div className="grid gap-responsive">
          {hasClasses ? (
            <>
              {overview.classes.map((cls) => (
                <Card key={cls.classId} className="card-responsive">
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <CardTitle className="text-lg md:text-xl">{cls.className}</CardTitle>
                      {cls.subject && (
                        <span className="text-sm text-text-secondary">{cls.subject}</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-surface rounded-lg">
                        <p className="text-xl font-bold text-primary">{cls.studentCount}</p>
                        <p className="text-xs text-text-secondary">Students</p>
                      </div>
                      <div className="text-center p-3 bg-surface rounded-lg">
                        <p className="text-xl font-bold text-info-dark">{cls.assessmentsTaken}</p>
                        <p className="text-xs text-text-secondary">Assessments</p>
                      </div>
                      <div className={`text-center p-3 rounded-lg ${getScoreColor(cls.averageScore)}`}>
                        <p className="text-xl font-bold">
                          {cls.averageScore !== null ? `${cls.averageScore}%` : '-'}
                        </p>
                        <p className="text-xs">Avg Score</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/app/teacher/classes/${cls.classId}`}>
                        <Button variant="outline" size="sm" className="touch-target">
                          View Class
                        </Button>
                      </Link>
                      <Link href={`/app/teacher/assessments/${cls.classId}`}>
                        <Button variant="outline" size="sm" className="touch-target">
                          View Results
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <Card className="bg-surface border-dashed card-responsive">
              <CardContent className="text-center py-8 md:py-12">
                <div className="text-4xl mb-4">📚</div>
                <p className="text-text-tertiary text-base md:text-lg mb-2">No classes yet</p>
                <p className="text-text-secondary text-sm mb-4">
                  Create a class first, then your students can take assessments.
                </p>
                <Link href="/app/teacher/classes">
                  <Button className="bg-primary hover:bg-primary-dark btn-mobile-full sm:w-auto touch-target">
                    Go to Classes
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Info Card */}
        <Card className="card-responsive mt-responsive bg-info-light border-info/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div>
                <p className="font-medium text-info-dark mb-1">About Assessments</p>
                <p className="text-sm text-info-dark/80">
                  Students take the Digital Literacy Pre-Assessment when they join a class or through the student dashboard.
                  You can view their results and track progress for each class.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
