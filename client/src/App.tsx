
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Layouts
import { AppLayout } from './layouts';

// Pages
import Dashboard from './pages/Dashboard/index';
import TranscribeLayout from './pages/Transcribe/Layout';
import TranscribeUpload from './pages/Transcribe/Upload';
import TranscribeWorkspace from './pages/Transcribe/index';
import PolishIndex from './pages/Polish';
import PolishWorkspace from './pages/Polish/Workspace';
import MergePage from './pages/Merge';
import FilesPage from './pages/Files';
import HistoryPage from './pages/History';
import SettingsPage from './pages/Settings';

function App() {
    return (
        <Router>
            <Routes>
                {/* All routes use the AppLayout wrapper */}
                <Route element={<AppLayout />}>
                    {/* Dashboard */}
                    <Route path="/" element={<Dashboard />} />

                    {/* Transcribe Module */}
                    <Route path="/transcribe" element={<TranscribeLayout />} />
                    <Route path="/transcribe/upload" element={<TranscribeUpload />} />
                    <Route path="/transcribe/:id" element={<TranscribeWorkspace />} />
                    <Route path="/transcribe/:id/merge" element={<MergePage />} />

                    {/* Polish Module */}
                    <Route path="/polish" element={<PolishIndex />} />
                    <Route path="/polish/:id" element={<PolishWorkspace />} />

                    {/* File Management */}
                    <Route path="/files" element={<FilesPage />} />

                    {/* History */}
                    <Route path="/history" element={<HistoryPage />} />

                    {/* Settings */}
                    <Route path="/settings" element={<SettingsPage />} />

                    {/* Legacy routes for backward compatibility */}
                    <Route path="/project/:id" element={<TranscribeWorkspace />} />
                    <Route path="/project/:id/transcribe" element={<TranscribeWorkspace />} />
                    <Route path="/project/:id/merge" element={<MergePage />} />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
