import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

import projectRoutes from './routes/projectRoutes';
import { initializePipelineRecovery } from './services/soloModeService';

app.use(cors());
app.use(express.json());

// Serve storage files statically (for Aliyun transcription API)
app.use('/storage', express.static(path.join(__dirname, '..', 'storage')));

// Routes
app.use('/api/projects', projectRoutes);
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Auto-resume stuck pipelines
    await initializePipelineRecovery();
});
