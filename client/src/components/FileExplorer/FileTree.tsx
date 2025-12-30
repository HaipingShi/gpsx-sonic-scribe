import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import FileListItem from './FileListItem';
import { FileStatus } from './StatusIcon';

interface FileNode {
    name: string;
    type: 'folder' | 'file';
    size?: number;
    status?: FileStatus;
    wordCount?: number;
    duration?: number;
    createdAt?: string;
    children?: FileNode[];
}

interface FileTreeProps {
    nodes: FileNode[];
    onFileClick?: (file: FileNode) => void;
    onDownload?: (file: FileNode) => void;
    onDelete?: (file: FileNode) => void;
}

const FileTreeNode: React.FC<{
    node: FileNode;
    depth?: number;
    onFileClick?: (file: FileNode) => void;
    onDownload?: (file: FileNode) => void;
    onDelete?: (file: FileNode) => void;
}> = ({ node, depth = 0, onFileClick, onDownload, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    // If node has children (folder OR file with children), make it expandable
    if (hasChildren) {
        return (
            <div className="mb-2">
                {/* Expandable Header (Folder or File with children) */}
                <div
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={cn(
                        'flex items-center gap-2 p-3 rounded-lg cursor-pointer',
                        'hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50',
                        'transition-all duration-200',
                        'border border-transparent hover:border-blue-200'
                    )}
                    style={{ paddingLeft: `${depth * 20 + 12}px` }}
                >
                    {/* Expand/Collapse Icon */}
                    <span
                        className={cn(
                            'text-gray-400 transition-transform duration-200',
                            isExpanded ? 'rotate-90' : 'rotate-0'
                        )}
                    >
                        ▶
                    </span>

                    {/* Icon - folder or audio file */}
                    <span className="text-xl">
                        {node.type === 'folder'
                            ? (isExpanded ? '📂' : '📁')
                            : '🎵'  // Audio file with chunks
                        }
                    </span>

                    {/* Name */}
                    <span className={cn(
                        'font-semibold',
                        node.type === 'folder' ? 'text-gray-700' : 'text-blue-700'
                    )}>
                        {node.name}
                    </span>

                    {/* Item Count Badge */}
                    <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                        {node.children!.length} items
                    </span>
                </div>

                {/* Children */}
                {isExpanded && (
                    <div className="mt-1 space-y-1">
                        {node.children!.map((child, index) => (
                            <FileTreeNode
                                key={index}
                                node={child}
                                depth={depth + 1}
                                onFileClick={onFileClick}
                                onDownload={onDownload}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Leaf File Node (no children)
    return (
        <div style={{ paddingLeft: `${depth * 20}px` }}>
            <FileListItem
                file={{
                    name: node.name,
                    size: node.size || 0,
                    status: node.status || 'complete',
                    wordCount: node.wordCount,
                    duration: node.duration,
                    createdAt: node.createdAt || new Date().toISOString(),
                }}
                onClick={() => onFileClick?.(node)}
                onDownload={() => onDownload?.(node)}
                onDelete={() => onDelete?.(node)}
            />
        </div>
    );
};

const FileTree: React.FC<FileTreeProps> = ({
    nodes,
    onFileClick,
    onDownload,
    onDelete,
}) => {
    return (
        <div className="space-y-2">
            {nodes.map((node, index) => (
                <FileTreeNode
                    key={index}
                    node={node}
                    onFileClick={onFileClick}
                    onDownload={onDownload}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
};

export default FileTree;
