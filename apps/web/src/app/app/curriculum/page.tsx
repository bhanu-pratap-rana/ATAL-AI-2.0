import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function CurriculumPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/student/start')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream to-surface page-layout">
      <div className="container-responsive max-w-6xl">
        {/* Header */}
        <div className="mb-responsive text-center sm:text-left">
          <Link href="/app/dashboard" className="text-primary hover:text-primary-dark mb-4 inline-flex items-center gap-1 text-sm md:text-base touch-target">
            ← Back to Dashboard
          </Link>
          <h1 className="heading-1 text-primary mb-2">📚 Curriculum</h1>
          <p className="text-text-secondary text-sm md:text-base">Access digital literacy curriculum and educational resources</p>
        </div>

        {/* Content */}
        <div className="grid gap-responsive">
          <Card className="card-responsive">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Digital Literacy Fundamentals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary text-sm md:text-base mb-4">
                Learn the basics of digital literacy, including computer skills, internet safety, and online communication.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-primary-light text-primary-dark rounded-full text-sm">Beginner</span>
                <span className="px-3 py-1 bg-info-light text-info-dark rounded-full text-sm">8 Modules</span>
              </div>
            </CardContent>
          </Card>

          <Card className="card-responsive">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">AI & Machine Learning Basics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary text-sm md:text-base mb-4">
                Introduction to artificial intelligence and machine learning concepts for students.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-warning-light text-warning-dark rounded-full text-sm">Intermediate</span>
                <span className="px-3 py-1 bg-info-light text-info-dark rounded-full text-sm">12 Modules</span>
              </div>
            </CardContent>
          </Card>

          <Card className="card-responsive">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Coding for Beginners</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary text-sm md:text-base mb-4">
                Start your coding journey with Python, HTML, CSS, and JavaScript fundamentals.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-primary-light text-primary-dark rounded-full text-sm">Beginner</span>
                <span className="px-3 py-1 bg-info-light text-info-dark rounded-full text-sm">15 Modules</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/10 border-primary/30 card-responsive">
            <CardHeader>
              <CardTitle className="text-primary-dark text-lg md:text-xl">Coming Soon</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-text-secondary text-sm md:text-base">
                More curriculum modules are being developed. Check back soon for updates!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
