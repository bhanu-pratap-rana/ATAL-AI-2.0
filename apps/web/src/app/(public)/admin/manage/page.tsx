'use client'

import { useState } from 'react'
import { deleteUserByEmail } from '@/app/actions/admin-delete'
import { createAdminUser } from '@/app/actions/admin-auth'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle, Loader2, Eye, EyeOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { FORM_TIMING } from '@/lib/constants/ui-timings'

type Step = 'delete' | 'create'

export default function AdminManagePage() {
  const [step, setStep] = useState<Step>('delete')
  const [email, setEmail] = useState('atal.app.ai@gmail.com')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [completed, setCompleted] = useState(false)

  async function handleDeleteUser() {
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter an email address' })
      return
    }

    if (
      !window.confirm(
        `Are you sure you want to DELETE the user ${email}?\n\nThis action cannot be undone!`
      )
    ) {
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const result = await deleteUserByEmail(email.trim().toLowerCase())

      if (result.success) {
        setMessage({
          type: 'success',
          text: `✓ User deleted! You can now create a new admin account.`,
        })
        toast.success('User deleted successfully')

        // Move to next step after brief delay
        setTimeout(() => {
          setStep('create')
          setMessage(null)
        }, FORM_TIMING.nextStepsDelay)
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to delete user' })
        toast.error(result.error || 'Failed to delete user')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred'
      setMessage({ type: 'error', text: errorMsg })
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateAdmin() {
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter an email address' })
      return
    }

    if (!password) {
      setMessage({ type: 'error', text: 'Please enter a password' })
      return
    }

    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' })
      return
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const result = await createAdminUser(email.trim().toLowerCase(), password)

      if (result.success) {
        // SECURITY: Never display passwords in messages - recommend password manager
        setMessage({
          type: 'success',
          text: `✓ Admin account created!\n\nEmail: ${email}\n\nTip: Use a password manager to securely store your credentials. Login at /admin/login`,
        })
        toast.success(`Admin account created for ${email}`)

        // Mark as completed
        setCompleted(true)

        // Clear form
        setPassword('')
        setConfirmPassword('')
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to create admin account' })
        toast.error(result.error || 'Failed to create admin account')
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred'
      setMessage({ type: 'error', text: errorMsg })
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-background to-surface flex items-center justify-center p-4">
      <div className="absolute top-4 left-4">
        <Button
          onClick={() => (window.location.href = '/admin/login')}
          variant="outline"
          size="sm"
          className="text-sm border-primary text-primary hover:bg-primary/10"
        >
          ← Back
        </Button>
      </div>

      <AuthCard
        title="Admin Account Management"
        description="Delete existing admin and create a fresh account"
      >
        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="flex gap-4">
            <div
              className={`flex-1 p-3 rounded-lg text-center cursor-pointer transition ${
                step === 'delete'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:bg-surface-dark'
              }`}
              onClick={() => !completed && setStep('delete')}
            >
              <p className="text-sm font-semibold">Step 1: Delete</p>
            </div>
            <div
              className={`flex-1 p-3 rounded-lg text-center cursor-pointer transition ${
                step === 'create'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:bg-surface-dark'
              }`}
              onClick={() => setStep('create')}
            >
              <p className="text-sm font-semibold">Step 2: Create</p>
            </div>
          </div>

          {/* STEP 1: DELETE USER */}
          {step === 'delete' && (
            <>
              {/* Warning Box */}
              <div className="bg-error-light border border-error/30 rounded-lg p-4">
                <p className="text-sm text-error">
                  <strong>⚠️ Warning:</strong>
                  <br />
                  <span className="text-xs">
                    Deleting a user is permanent and cannot be undone. Make sure you want to
                    delete this account.
                  </span>
                </p>
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="delete-email" className="text-sm font-semibold">
                  Email to Delete
                </Label>
                <Input
                  id="delete-email"
                  type="email"
                  placeholder="atal.app.ai@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="focus:ring-primary focus:border-primary"
                />
                <p className="text-xs text-text-secondary">
                  Enter the email of the user account to delete
                </p>
              </div>

              {/* Message Display */}
              {message && (
                <div
                  className={`flex gap-3 p-4 rounded-lg border ${
                    message.type === 'success'
                      ? 'bg-success-light border-success/30'
                      : 'bg-error-light border-error/30'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                  )}
                  <span className={message.type === 'success' ? 'text-success' : 'text-error'}>
                    {message.text}
                  </span>
                </div>
              )}

              {/* Delete Button */}
              <Button
                onClick={handleDeleteUser}
                disabled={isLoading || !email.trim()}
                className="w-full bg-error hover:bg-error/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete User
                  </>
                )}
              </Button>
            </>
          )}

          {/* STEP 2: CREATE USER */}
          {step === 'create' && (
            <>
              {/* Success Badge */}
              {completed && (
                <div className="bg-success-light border border-success/30 rounded-lg p-4">
                  <div className="flex gap-2">
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-success">
                      <strong>✓ Account Created Successfully!</strong>
                      <br />
                      <span className="text-xs">You can now login with these credentials.</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="create-email" className="text-sm font-semibold">
                  Admin Email
                </Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="atal.app.ai@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || completed}
                  className="focus:ring-primary focus:border-primary"
                />
                <p className="text-xs text-text-secondary">
                  This email will be used to login to the admin panel
                </p>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="create-password" className="text-sm font-semibold">
                  Password (min. 8 characters)
                </Label>
                <div className="relative">
                  <Input
                    id="create-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || completed}
                    className="focus:ring-primary focus:border-primary pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-semibold">
                  Confirm Password
                </Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading || completed}
                  className="focus:ring-primary focus:border-primary"
                />
              </div>

              {/* Message Display */}
              {message && (
                <div
                  className={`flex gap-3 p-4 rounded-lg border whitespace-pre-wrap ${
                    message.type === 'success'
                      ? 'bg-success-light border-success/30'
                      : 'bg-error-light border-error/30'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                  )}
                  <span
                    className={`text-sm ${
                      message.type === 'success' ? 'text-success' : 'text-error'
                    }`}
                  >
                    {message.text}
                  </span>
                </div>
              )}

              {/* Create Button */}
              {!completed ? (
                <Button
                  onClick={handleCreateAdmin}
                  disabled={isLoading || !email.trim() || !password || !confirmPassword}
                  className="w-full bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Admin Account'
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => (window.location.href = '/admin/login')}
                  className="w-full bg-success hover:bg-success/90"
                >
                  Go to Login Page
                </Button>
              )}

              {/* Security Notice */}
              <div className="bg-warning-light border border-warning/30 rounded-lg p-4">
                <p className="text-xs text-warning-dark">
                  <strong>🔒 Security:</strong> Store your admin password securely. You&apos;ll need it
                  to login to the admin panel.
                </p>
              </div>
            </>
          )}

          {/* Instructions Box */}
          <div className="bg-cyan-lightest border border-cyan/30 rounded-lg p-4">
            <p className="text-sm text-cyan-darkest font-semibold mb-2">📋 How It Works:</p>
            <ol className="text-xs text-cyan-dark space-y-1 list-decimal list-inside">
              <li>Delete the old admin user account</li>
              <li>Create a new admin account with email and password</li>
              <li>Go to /admin/login and login with your new credentials</li>
              <li>Access the admin panel</li>
            </ol>
          </div>
        </div>
      </AuthCard>
    </div>
  )
}
