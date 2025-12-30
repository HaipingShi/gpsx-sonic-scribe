import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
    createProject,
    listProjects,
    getProject,
    startTranscription,
    startPolishing,
    deleteProject,
    downloadResult,
    downloadBatchZip,
    startSoloMode,
    resumeSoloMode,
    pauseSoloMode,
    getSoloModeStatus,
    getMergedDocument,
    analyzeText,
    transcribeSingleChunk,
    polishSingleChunk,
    retrySingleChunk,
    retranscribeProject,
} from '../controllers/projectController';
import {
    getSettings,
    updateSettings,
    getTemplates,
    updateTemplate,
    deleteTemplate,
} from '../controllers/settingsController';

const router = Router();

// Configure Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'storage', 'uploads');
        // Ensure dir exists
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

// Settings Routes (MUST be before /:id routes to prevent matching 'settings' as ID)
router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.get('/settings/templates', getTemplates);
router.put('/settings/templates/:id', updateTemplate);
router.delete('/settings/templates/:id', deleteTemplate);

// Polish Modules (no :id prefix)
router.post('/polish/analyze', analyzeText);

// Batch Download Route (MUST be before /:id routes)
router.post('/download-batch', downloadBatchZip);

// Core Routes
router.post('/', upload.single('audio'), createProject);
router.get('/', listProjects);
router.delete('/:id', deleteProject);
router.get('/:id', getProject);
router.post('/:id/transcribe', startTranscription);
router.post('/:id/polish', startPolishing);
router.get('/:id/download', downloadResult);

// Solo Mode Routes
router.post('/:id/solo/start', startSoloMode);
router.post('/:id/solo/resume', resumeSoloMode);
router.post('/:id/solo/pause', pauseSoloMode);
router.get('/:id/solo/status', getSoloModeStatus);

// Merged Document Route
router.get('/:id/merged', getMergedDocument);

// Single Chunk Operations (Manual Mode)
router.post('/:projectId/chunks/:chunkId/transcribe', transcribeSingleChunk);
router.post('/:projectId/chunks/:chunkId/polish', polishSingleChunk);
router.post('/:projectId/chunks/:chunkId/retry', retrySingleChunk);

// Re-transcription
router.post('/:id/retranscribe', retranscribeProject);

export default router;
