import axios from 'axios';

export const API_URL = 'http://localhost:3001/api';

export const api = axios.create({
    baseURL: API_URL,
});

export interface Segment {
    startTime: number;
    endTime: number;
    text: string;
}

export interface Chunk {
    id: string;
    startTime: number;
    endTime: number;
    status: string;
    draftSegments: Segment[];
    polishedSegments: Segment[];
}

export interface Project {
    id: string;
    originalFilename: string;
    status: string;
    mode?: 'SOLO' | 'MANUAL';
    checkpoint?: string;
    createdAt: string;
    chunks?: Chunk[]; // Optional in list view, present in detail view
}

export interface PolishConfig {
    mode: string;
    tone: string;
    cleaningRules: string[];
    customInstructions: string;
}

export const uploadProject = async (file: File): Promise<Project> => {
    const formData = new FormData();
    formData.append('audio', file);

    const response = await api.post<Project>('/projects', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getProjects = async (): Promise<Project[]> => {
    const response = await api.get<Project[]>('/projects');
    return response.data;
};

export const getProject = async (id: string): Promise<Project> => {
    const response = await api.get<Project>(`/projects/${id}`);
    return response.data;
};


export const polishProject = async (id: string, config: PolishConfig): Promise<void> => {
    await api.post(`/projects/${id}/polish`, config);
};

export const transcribeProject = async (id: string): Promise<void> => {
    await api.post(`/projects/${id}/transcribe`);
};

export const deleteProject = async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
};

export const getDownloadUrl = (id: string): string => {
    return `http://localhost:3001/api/projects/${id}/download`;
};

export const analyzeText = async (text: string): Promise<{
    recommendedStrategy: string;
    recommendedTone: string;
    suggestedHotwords: string[];
    summary: string;
}> => {
    const response = await api.post('/projects/polish/analyze', { text });
    return response.data;
};

// Manual Mode: Single Chunk Operations
export const transcribeSingleChunk = async (projectId: string, chunkId: string): Promise<{ success: boolean; transcription: string }> => {
    const response = await api.post(`/projects/${projectId}/chunks/${chunkId}/transcribe`);
    return response.data;
};

export const polishSingleChunk = async (
    projectId: string,
    chunkId: string,
    config?: PolishConfig,
    model?: 'deepseek' | 'gemini'
): Promise<{ success: boolean; polishedText: string; model?: string }> => {
    const response = await api.post(`/projects/${projectId}/chunks/${chunkId}/polish`, { config, model });
    return response.data;
};

export const retrySingleChunk = async (projectId: string, chunkId: string): Promise<{ success: boolean; transcription: string }> => {
    const response = await api.post(`/projects/${projectId}/chunks/${chunkId}/retry`);
    return response.data;
};

// Re-transcription
export const retranscribeProject = async (projectId: string, mode: 'SOLO' | 'MANUAL' = 'SOLO') => {
    const response = await api.post(`/projects/${projectId}/retranscribe`, { mode });
    return response.data;
};


// ============================================
// V4 API Endpoints
// ============================================

import { ProjectState, ProcessingPhase } from '@/types/project';

export interface ValidationResult {
    hasHallucination: boolean;
    confidence: number;
    issues: string[];
    recommendation?: 'retry' | 'accept';
}

export interface QueueStatus {
    active: JobInfo[];
    pending: JobInfo[];
    failed: JobInfo[];
    concurrencyLimit: number;
    concurrencyUsed: number;
}

export interface JobInfo {
    id: string;
    chunkId: string;
    type: 'transcribe' | 'polish' | 'validate';
    status: 'queued' | 'running' | 'failed';
    retryCount: number;
    retryAt?: Date;
}

export interface MergeResult {
    downloadUrl: string;
    filename: string;
}

// Project State Management
export const getProjectState = async (id: string): Promise<ProjectState> => {
    const response = await api.get<ProjectState>(`/projects/${id}/state`);
    return response.data;
};

export const pauseProject = async (id: string): Promise<void> => {
    await api.post(`/projects/${id}/pause`);
};

export const resumeProject = async (
    id: string,
    from?: ProcessingPhase
): Promise<void> => {
    await api.post(`/projects/${id}/resume`, { from });
};

export const abortProject = async (id: string): Promise<void> => {
    await api.post(`/projects/${id}/abort`);
};

// Chunk Operations
export const retryChunk = async (
    projectId: string,
    chunkId: string
): Promise<void> => {
    await api.post(`/projects/${projectId}/chunks/${chunkId}/retry`);
};

export const validateHallucination = async (
    chunkId: string,
    transcript: string
): Promise<ValidationResult> => {
    const response = await api.post<ValidationResult>('/validate', {
        chunkId,
        transcript
    });
    return response.data;
};

export const getQueueStatus = async (projectId: string): Promise<QueueStatus> => {
    const response = await api.get<QueueStatus>(`/projects/${projectId}/queue-status`);
    return response.data;
};

// Merge & Export
export const updatePolishedSegment = async (
    chunkId: string,
    data: { polishedText: string; source: string }
): Promise<void> => {
    await api.put(`/chunks/${chunkId}/polished`, data);
};

export const saveMergedDocument = async (
    projectId: string,
    config: {
        content: string;
        format: string;
        metadata: {
            totalChunks: number;
            modifiedChunks: number;
            totalWords: number;
        };
    }
): Promise<MergeResult> => {
    const response = await api.post<MergeResult>(
        `/projects/${projectId}/merge`,
        config
    );
    return response.data;
};

// ============================================
// Solo Mode API Endpoints
// ============================================

export interface SoloModeStatus {
    checkpoint: string;
    mode: string;
    transcribeActive: number;
    transcribePending: number;
    validateActive: number;
    validatePending: number;
    polishActive: number;
    polishPending: number;
    failedChunks: Array<{
        chunkId: string;
        error: string;
        retryAttempt: number;
    }>;
}

/**
 * Start Solo Mode automation for a project
 */
export const startSoloMode = async (projectId: string): Promise<{ message: string; projectId: string; status: string }> => {
    const response = await api.post(`/projects/${projectId}/solo/start`);
    return response.data;
};

/**
 * Resume Solo Mode from last checkpoint
 */
export const resumeSoloMode = async (projectId: string): Promise<{ message: string; projectId: string; checkpoint: string }> => {
    const response = await api.post(`/projects/${projectId}/solo/resume`);
    return response.data;
};

/**
 * Pause Solo Mode automation
 */
export const pauseSoloMode = async (projectId: string): Promise<{ message: string; projectId: string }> => {
    const response = await api.post(`/projects/${projectId}/solo/pause`);
    return response.data;
};

/**
 * Get Solo Mode real-time status
 */
export const getSoloModeStatus = async (projectId: string): Promise<SoloModeStatus> => {
    const response = await api.get<SoloModeStatus>(`/projects/${projectId}/solo/status`);
    return response.data;
};

// =====================
// Settings API
// =====================

export interface PromptTemplate {
    id: string;
    name: string;
    description: string;
    prompt: string;
    isSystem?: boolean;
}

export interface AppSettings {
    aliyunApiKey?: string;
    deepseekApiKeys?: string[];
    defaultMode?: string;
    defaultLanguage?: string;
    autoPolish?: boolean;
    chunkStrategy?: string;
    hotwords?: string[];
    promptTemplates?: PromptTemplate[];
    defaultTemplateId?: string;
    defaultPolishModel?: 'deepseek' | 'gemini';
    runtime?: {
        geminiModel: string;
        asrProvider: string;
        mode: string;
    };
}

export const getSettings = async (): Promise<AppSettings> => {
    const response = await api.get<AppSettings>('/projects/settings');
    return response.data;
};

export const updateSettings = async (settings: Partial<AppSettings>): Promise<{ success: boolean; settings: AppSettings }> => {
    const response = await api.put('/projects/settings', settings);
    return response.data;
};

export const getTemplates = async (): Promise<PromptTemplate[]> => {
    const response = await api.get<PromptTemplate[]>('/projects/settings/templates');
    return response.data;
};

export const updateTemplate = async (id: string, template: Partial<PromptTemplate>): Promise<{ success: boolean; template: PromptTemplate }> => {
    const response = await api.put(`/projects/settings/templates/${id}`, template);
    return response.data;
};

export const deleteTemplate = async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/projects/settings/templates/${id}`);
    return response.data;
};
