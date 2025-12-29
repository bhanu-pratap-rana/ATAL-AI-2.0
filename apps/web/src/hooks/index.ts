/**
 * Hooks - Export all custom React hooks
 */

// Auth State Management
export {
  useAuthState,
  type AuthState,
  type AuthActions,
  type AuthStep,
  type SignInTab,
  type SignUpTab,
  type PhoneOtpStep,
} from './useAuthState';

// Network Status
export {
  useNetworkStatus,
  hasNetworkInformation,
  type NetworkStatus,
  type ConnectionType,
} from './useNetworkStatus';

// Offline Sync
export { useOfflineSync } from './useOfflineSync';

// Input Hooks
export { useOTPInput, type UseOTPInputReturn } from './useOTPInput';
export { usePhoneInput, type UsePhoneInputReturn } from './usePhoneInput';

// Form State Management
export {
  useFormHandler,
  type MessageType,
  type FormMessage,
  type UseFormHandlerReturn,
} from './useFormHandler';
