import React, { useState } from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { polishProject, PolishConfig } from '@/services/api';

interface PromptManagerProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const PromptManager: React.FC<PromptManagerProps> = ({ projectId, isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState<PolishConfig>({
        mode: 'rewrite',
        tone: 'professional',
        cleaningRules: [],
        customInstructions: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async () => {
        try {
            setLoading(true);
            await polishProject(projectId, config);
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to start polishing", error);
            alert("Failed to start polishing task");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        Intelligence Panel
                    </h2>
                    <button onClick={onClose} aria-label="Close">
                        <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Mode Selector */}
                    <div>
                        <label htmlFor="mode" className="block text-sm font-medium text-gray-700 mb-1">Polishing Mode</label>
                        <select
                            id="mode"
                            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={config.mode}
                            onChange={e => setConfig({ ...config, mode: e.target.value })}
                        >
                            <option value="clean">Clean Only (Fix Grammar/Stutter)</option>
                            <option value="rewrite">Rewrite & Polish (Enhance Flow)</option>
                            <option value="structure">Structure & Format (Organize)</option>
                            <option value="summarize">Summarize (Key Points)</option>
                        </select>
                    </div>

                    {/* Tone Selector */}
                    <div>
                        <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-1">Target Tone</label>
                        <select
                            id="tone"
                            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={config.tone}
                            onChange={e => setConfig({ ...config, tone: e.target.value })}
                        >
                            <option value="professional">Professional</option>
                            <option value="casual">Casual / Conversational</option>
                            <option value="academic">Academic</option>
                            <option value="journalistic">Journalistic</option>
                        </select>
                    </div>

                    {/* Custom Instructions */}
                    <div>
                        <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">Custom Instructions</label>
                        <textarea
                            id="instructions"
                            rows={4}
                            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., Use bullet points for lists, highlight key terms in bold..."
                            value={config.customInstructions}
                            onChange={e => setConfig({ ...config, customInstructions: e.target.value })}
                        />
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Run Polish
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PromptManager;
