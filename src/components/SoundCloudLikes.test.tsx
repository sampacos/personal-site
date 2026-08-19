import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SoundCloudLikes from './SoundCloudLikes';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('SoundCloudLikes Component', () => {
  it('fetches and renders liked tracks list', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          title: 'Silhouettes',
          artist: 'belmontg',
          url: 'https://soundcloud.com/belmontg/silhouettes',
        },
        {
          title: 'tourniquet',
          artist: 'tourniquet1000',
          url: 'https://soundcloud.com/tourniquet1000/tourniquet',
        },
      ],
    } as Response);

    render(<SoundCloudLikes />);

    await waitFor(() => {
      expect(screen.getByText('Silhouettes')).toBeInTheDocument();
      expect(screen.getByText(/by belmontg/i)).toBeInTheDocument();
      expect(screen.getByText('tourniquet')).toBeInTheDocument();
    });
  });

  it('updates active player track when track is clicked', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          title: 'Silhouettes',
          artist: 'belmontg',
          url: 'https://soundcloud.com/belmontg/silhouettes',
        },
        {
          title: 'tourniquet',
          artist: 'tourniquet1000',
          url: 'https://soundcloud.com/tourniquet1000/tourniquet',
        },
      ],
    } as Response);

    render(<SoundCloudLikes />);

    await waitFor(() => {
      expect(screen.getByText('tourniquet')).toBeInTheDocument();
    });

    const tourniquetButton = screen.getByRole('button', { name: 'tourniquet' });
    fireEvent.click(tourniquetButton);

    const iframe = screen.getByTitle('SoundCloud Player - tourniquet');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      'src',
      expect.stringContaining(
        encodeURIComponent('https://soundcloud.com/tourniquet1000/tourniquet'),
      ),
    );
  });
});
