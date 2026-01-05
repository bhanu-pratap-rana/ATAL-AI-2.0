/**
 * Browser API Type Definitions
 * 
 * Provides TypeScript types for Web APIs that don't have complete type definitions
 * in the standard lib.dom.d.ts
 */

// ============================================================================
// Speech Recognition API
// ============================================================================

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
  readonly interpretation: Record<string, unknown>;
  readonly emma: Document | null;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: 
    | 'no-speech'
    | 'aborted'
    | 'audio-capture'
    | 'network'
    | 'not-allowed'
    | 'service-not-allowed'
    | 'bad-grammar'
    | 'language-not-supported';
  readonly message: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognition extends EventTarget {
  // Properties
  grammars: SpeechGrammarList;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  serviceURI: string;

  // Event handlers
  onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;

  // Methods
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechGrammarList {
  readonly length: number;
  item(index: number): SpeechGrammar;
  addFromURI(src: string, weight?: number): void;
  addFromString(string: string, weight?: number): void;
  [index: number]: SpeechGrammar;
}

interface SpeechGrammar {
  src: string;
  weight: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

// ============================================================================
// Network Information API
// ============================================================================

type EffectiveConnectionType = 'slow-2g' | '2g' | '3g' | '4g';

type ConnectionType = 
  | 'bluetooth'
  | 'cellular'
  | 'ethernet'
  | 'mixed'
  | 'none'
  | 'other'
  | 'unknown'
  | 'wifi'
  | 'wimax';

interface NetworkInformation extends EventTarget {
  /**
   * Effective bandwidth estimate in megabits per second
   */
  readonly downlink?: number;

  /**
   * Maximum downlink speed, in megabits per second (Mbps)
   */
  readonly downlinkMax?: number;

  /**
   * Effective connection type: 'slow-2g', '2g', '3g', or '4g'
   */
  readonly effectiveType?: EffectiveConnectionType;

  /**
   * Estimated effective round-trip time of the current connection, in milliseconds
   */
  readonly rtt?: number;

  /**
   * Returns the type of connection a device is using to communicate with the network
   */
  readonly type?: ConnectionType;

  /**
   * True if the user has set a reduced data usage option on the user agent
   */
  readonly saveData?: boolean;

  /**
   * Event handler for when connection information changes
   */
  onchange: ((this: NetworkInformation, ev: Event) => void) | null;
}

// Extend Navigator interface with connection properties
interface Navigator {
  /**
   * Returns a NetworkInformation object containing information about the network connection
   */
  readonly connection?: NetworkInformation;
  
  /**
   * Mozilla-prefixed version
   */
  readonly mozConnection?: NetworkInformation;
  
  /**
   * WebKit-prefixed version
   */
  readonly webkitConnection?: NetworkInformation;
}

// ============================================================================
// Playwright Detection
// ============================================================================

declare global {
  /**
   * Playwright sets this flag when running automated tests
   */
  var __PLAYWRIGHT__: boolean | undefined;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if Speech Recognition API is available
 */
export function isSpeechRecognitionSupported(): boolean {
  return typeof globalThis !== 'undefined' &&
         ('SpeechRecognition' in globalThis || 'webkitSpeechRecognition' in globalThis);
}

/**
 * Type guard to check if Network Information API is available
 */
export function isNetworkInformationSupported(): boolean {
  return typeof navigator !== 'undefined' && 
         ('connection' in navigator || 
          'mozConnection' in navigator || 
          'webkitConnection' in navigator);
}

/**
 * Get Speech Recognition constructor (handles prefixes)
 */
export function getSpeechRecognition(): typeof SpeechRecognition | null {
  if (typeof globalThis === 'undefined') return null;

  const global = globalThis as typeof globalThis & {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  };

  return global.SpeechRecognition || global.webkitSpeechRecognition || null;
}

/**
 * Get Network Information object (handles prefixes)
 */
export function getNetworkInformation(): NetworkInformation | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.connection || 
         navigator.mozConnection || 
         navigator.webkitConnection || 
         null;
}

export {};

