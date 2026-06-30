// ============================================================
// API DTOs
// ============================================================

// --- Auth ---
export interface RegisterDto {
  username: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: import('../types').User;
}

// --- Media ---
export interface UploadMediaDto {
  type: 'video' | 'image' | 'audio';
  tags?: string[];
}

export interface CreateTagDto {
  name: string;
  category: string;
}

export interface UpdateMediaDto {
  tags?: CreateTagDto[];
}

// --- Project ---
export interface CreateProjectDto {
  name: string;
  description?: string;
  script?: string;
  clipStyle: import('../types').ClipStyle;
  targetDuration?: number;
  templateId?: string;
  templateMode?: import('../types').TemplateMode;
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  script?: string;
  clipStyle?: import('../types').ClipStyle;
  targetDuration?: number;
}

// --- Editor ---
export interface UpdateSceneDto {
  mediaId?: string;
  startTime?: number;
  endTime?: number;
  transition?: import('../types').TransitionType;
  transitionDuration?: number;
  duration?: number;
}

export interface ReorderScenesDto {
  sceneIds: string[];
}

export interface AiEditInstructionDto {
  instruction: string;
  sceneIds?: string[];
}

// --- Template ---
export interface CreateTemplateDto {
  name: string;
  description?: string;
  referenceVideoId?: string;
  mode: import('../types').TemplateMode;
}

// --- Render ---
export interface StartRenderDto {
  projectId: string;
  format?: string;
  resolution?: string;
}