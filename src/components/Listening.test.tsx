import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Listening from './Listening';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('Listening Component', () => {
  it('renders Currently listening header and idle state when no track data is returned', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ isPlaying: false }),
    } as Response);

    render(<Listening />);
    expect(screen.getByText(/Currently Listening to on Spotify/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Spotify: not playing right now/i)).toBeInTheDocument();
    });
  });

  it('renders active track when Spotify is playing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isPlaying: true,
        title: 'Song For The Dead',
        artist: 'Queens of the Stone Age',
        album: 'Songs for the Deaf',
        songUrl: 'https://open.spotify.com/track/12345',
      }),
    } as Response);

    render(<Listening />);

    await waitFor(() => {
      expect(screen.getByText('Song For The Dead')).toBeInTheDocument();
      expect(screen.getByText(/Queens of the Stone Age/i)).toBeInTheDocument();
      expect(screen.getByText('▶')).toBeInTheDocument();
    });
  });

  it('renders last played track when Spotify is idle', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isPlaying: false,
        title: 'Kid Myself',
        artist: 'John Morgan',
        album: 'Carolina Blue',
        songUrl: 'https://open.spotify.com/track/67890',
      }),
    } as Response);

    render(<Listening />);

    await waitFor(() => {
      expect(screen.getByText('Kid Myself')).toBeInTheDocument();
      expect(screen.getByText(/John Morgan/i)).toBeInTheDocument();
      expect(screen.getByText('⏸ (last played)')).toBeInTheDocument();
    });
  });
});
