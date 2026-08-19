import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminBlogManager from './AdminBlogManager';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('AdminBlogManager Component', () => {
  it('renders blog post form, fetches posts, and allows editing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        posts: [
          {
            id: 'post-1',
            slug: 'welcome',
            title: 'welcome to pacos.nyc',
            description: 'A test welcome post.',
            content: 'Hello world',
            publishedAt: new Date().toISOString(),
          },
        ],
      }),
    } as Response);

    render(<AdminBlogManager />);

    expect(screen.getByText('+ Compose New Blog Post')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('welcome to pacos.nyc')).toBeInTheDocument();
      expect(screen.getByText('A test welcome post.')).toBeInTheDocument();
    });

    // Click edit button
    const editBtn = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editBtn);

    expect(screen.getByText('✏️ Edit Blog Post')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update blog post/i })).toBeInTheDocument();
  });
});
