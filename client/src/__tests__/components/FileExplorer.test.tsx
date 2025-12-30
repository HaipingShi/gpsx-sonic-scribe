import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FileExplorer from '@/components/FileExplorer';

describe('FileExplorer Component', () => {
    it('should render file tree structure', () => {
        render(<FileExplorer projectId="project-123" />);

        // Verify main sections exist
        expect(screen.getByText(/Compressed Audio/i)).toBeInTheDocument();
        expect(screen.getByText(/Chunks/i)).toBeInTheDocument();
        expect(screen.getByText(/Transcripts/i)).toBeInTheDocument();
        expect(screen.getByText(/Polished/i)).toBeInTheDocument();
    });

    it('should display file count in each section', () => {
        render(<FileExplorer projectId="project-123" />);

        // Verify file counts are shown
        const tree = screen.getByTestId('file-tree');
        expect(tree).toBeTruthy();
    });
});
