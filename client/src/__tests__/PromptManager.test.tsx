import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PromptManager from '@/components/PromptManager';
import * as api from '@/services/api';

vi.mock('@/services/api', () => ({
    polishProject: vi.fn(),
    api: { post: vi.fn() }
}));

describe('PromptManager Component', () => {
    it('renders when open', () => {
        render(<PromptManager projectId="123" isOpen={true} onClose={() => { }} />);
        expect(screen.getByText('Intelligence Panel')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
        render(<PromptManager projectId="123" isOpen={false} onClose={() => { }} />);
        expect(screen.queryByText('Intelligence Panel')).not.toBeInTheDocument();
    });

    it('submits polish configuration', async () => {
        const onClose = vi.fn();
        render(<PromptManager projectId="123" isOpen={true} onClose={onClose} />);

        // Fill out form (these inputs don't exist yet, so this will fail)
        fireEvent.change(screen.getByLabelText(/Mode/i), { target: { value: 'rewrite' } });
        fireEvent.change(screen.getByLabelText(/Tone/i), { target: { value: 'professional' } });

        // Submit
        fireEvent.click(screen.getByText(/Run Polish/i));

        await waitFor(() => {
            expect(api.polishProject).toHaveBeenCalledWith('123', expect.objectContaining({
                mode: 'rewrite',
                tone: 'professional'
            }));
        });
    });
});
