'use client'

import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function TeacherCompleteStep() {
  const router = useRouter()

  return (
    <AuthCard title="Registration Complete! 🎉" description="Welcome to ATAL AI">
      <div className="text-center space-y-6">
        <div className="text-6xl">🎓</div>

        <div>
          <h3 className="text-2xl font-bold text-success mb-2">Success!</h3>
          <p className="text-text-secondary">
            Your account has been created successfully. You can now access your dashboard and start managing your classes.
          </p>
        </div>

        <Button
          onClick={() => router.push('/app/teacher/classes')}
          size="lg"
          className="w-full bg-success hover:bg-success-dark text-white"
        >
          Go to Dashboard
        </Button>
      </div>
    </AuthCard>
  )
}
