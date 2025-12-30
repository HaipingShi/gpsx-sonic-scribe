import React, { useState } from 'react';
import FileTree from './FileTree';
import FilePreview from './FilePreview';
import { cn } from '@/lib/utils';

interface FileExplorerProps {
  projectId: string;
}

// Mock file structure - hierarchical: Audio > Chunks > Transcripts/Polished
const mockFileStructure = [
  {
    name: 'project_compressed.wav',
    type: 'file' as const,
    size: 15340000,
    status: 'complete' as const,
    duration: 1800,
    createdAt: new Date().toISOString(),
    children: [
      {
        name: 'Chunks',
        type: 'folder' as const,
        children: [
          {
            name: 'chunk_001.wav',
            type: 'file' as const,
            size: 3068000,
            status: 'complete' as const,
            duration: 600,
            createdAt: new Date().toISOString(),
            children: [
              {
                name: 'Transcripts',
                type: 'folder' as const,
                children: [
                  { name: 'chunk_001_raw.txt', type: 'file' as const, size: 1200, status: 'complete' as const, wordCount: 150, createdAt: new Date().toISOString() },
                  { name: 'chunk_001_polished.md', type: 'file' as const, size: 1800, status: 'complete' as const, wordCount: 180, createdAt: new Date().toISOString() },
                ],
              },
            ],
          },
          {
            name: 'chunk_002.wav',
            type: 'file' as const,
            size: 3068000,
            status: 'complete' as const,
            duration: 600,
            createdAt: new Date().toISOString(),
            children: [
              {
                name: 'Transcripts',
                type: 'folder' as const,
                children: [
                  { name: 'chunk_002_raw.txt', type: 'file' as const, size: 1350, status: 'complete' as const, wordCount: 175, createdAt: new Date().toISOString() },
                  { name: 'chunk_002_polished.md', type: 'file' as const, size: 2100, status: 'complete' as const, wordCount: 210, createdAt: new Date().toISOString() },
                ],
              },
            ],
          },
          {
            name: 'chunk_003.wav',
            type: 'file' as const,
            size: 3068000,
            status: 'processing' as const,
            duration: 600,
            createdAt: new Date().toISOString(),
            children: [
              {
                name: 'Transcripts',
                type: 'folder' as const,
                children: [
                  { name: 'chunk_003_raw.txt', type: 'file' as const, size: 1100, status: 'processing' as const, wordCount: 142, createdAt: new Date().toISOString() },
                ],
              },
            ],
          },
          { name: 'chunk_004.wav', type: 'file' as const, size: 3068000, status: 'pending' as const, duration: 600, createdAt: new Date().toISOString() },
          { name: 'chunk_005.wav', type: 'file' as const, size: 3068000, status: 'pending' as const, duration: 600, createdAt: new Date().toISOString() },
        ],
      },
    ],
  },
];

const FileExplorer: React.FC<FileExplorerProps> = ({ projectId }) => {
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    content: string;
    type: string;
  } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleFileClick = (file: any) => {
    // Mock content for demonstration
    const mockContent = `This is the content of ${file.name}.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\n\nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.`;

    setPreviewFile({
      name: file.name,
      content: mockContent,
      type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
    });
    setIsPreviewOpen(true);
  };

  const handleDownload = (file: any) => {
    console.log('Download file:', file.name);
    // Implement download logic
  };

  const handleDelete = (file: any) => {
    console.log('Delete file:', file.name);
    // Implement delete logic
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className={cn(
          'bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6'
        )}>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            File Explorer
          </h1>
          <p className="text-gray-600">
            Project: {projectId}
          </p>
        </div>
      </div>

      {/* File Tree */}
      <div className="max-w-7xl mx-auto">
        <div className={cn(
          'bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 p-6'
        )}>
          <div className="flex items-center gap-2 mb-6">
            <span className="text-2xl">📁</span>
            <h2 className="text-xl font-bold text-gray-900">Project Files</h2>
          </div>

          <FileTree
            nodes={mockFileStructure}
            onFileClick={handleFileClick}
            onDownload={handleDownload}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* File Preview Modal */}
      <FilePreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        file={previewFile}
      />
    </div>
  );
};

export default FileExplorer;
