// ============================================================
// Application Constants
// ============================================================

/** Supported output resolutions */
export const OUTPUT_RESOLUTIONS = [
  { label: '1080p (Full HD)', width: 1920, height: 1080 },
  { label: '720p (HD)', width: 1280, height: 720 },
  { label: '480p (SD)', width: 854, height: 480 },
] as const;

/** Supported output formats */
export const OUTPUT_FORMATS = ['mp4', 'webm', 'mov'] as const;

/** Max upload file size (100MB) */
export const MAX_UPLOAD_SIZE = 104_857_600;

/** Allowed media MIME types */
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg'];

/** Built-in template names */
export const BUILT_IN_TEMPLATES = [
  'intro-body-climax-outro',
  'fast-paced-commentary',
  'cinematic-slow',
  'beat-sync-montage',
] as const;

/** AI analysis models */
export const AI_MODELS = {
  VISION: 'gpt-4o',
  WHISPER: 'whisper-1',
  EMBEDDING: 'text-embedding-3-small',
} as const;

/** JWT constants */
export const JWT_CONSTANTS = {
  EXPIRATION: '7d',
  SECRET_MIN_LENGTH: 32,
} as const;

/** API route prefixes */
export const API_PREFIX = 'api';
export const API_V1 = 'api/v1';