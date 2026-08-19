import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MusicToggle from './MusicToggle';

beforeEach(() => {
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = vi.fn();
});

describe('MusicToggle Component', () => {
  it('renders initial muted state with speaker symbol', () => {
    render(<MusicToggle />);
    const button = screen.getByRole('button', { name: /play background music/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('🔇')).toBeInTheDocument();
  });

  it('toggles playback and speaker symbol on click', async () => {
    render(<MusicToggle />);
    const button = screen.getByRole('button', { name: /play background music/i });

    fireEvent.click(button);
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();

    // After play resolves:
    expect(await screen.findByText('🔊')).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('aria-label', 'Mute background music');

    // Click again to mute
    fireEvent.click(button);
    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(screen.getByText('🔇')).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });
});
