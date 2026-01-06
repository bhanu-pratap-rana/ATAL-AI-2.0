/**
 * Barrel export file for school actions
 * Re-exports all school functions for backward compatibility
 */

// Teacher verification
export {
  verifyTeacher,
  type VerifyTeacherParams,
  type VerifyTeacherResult
} from './teacher-verification'

// School search
export {
  searchSchools,
  getSchoolByCode
} from './school-search'

// Staff PIN management
export {
  rotateStaffPin,
  getStaffPinRotationInfo
} from './staff-pin-management'

// Admin authorization
export {
  checkAdminAuth
} from './admin-auth'

// Shared utilities and types
export {
  normalizeSchoolCode,
  handleZodValidationError,
  type SchoolData,
  type VerifyTeacherParams as VerifyTeacherParamsUtil,
  type VerifyTeacherResult as VerifyTeacherResultUtil
} from './school-utils'
