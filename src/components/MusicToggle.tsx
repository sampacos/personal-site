import { useEffect, useRef, useState } from 'react';

export default function MusicToggle() {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          setIsPlaying(false);
        });
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, []);

  return (
    <div className="inline-flex items-center">
      {/* biome-ignore lint/a11y/useMediaCaption: Background music stream */}
      <audio ref={audioRef} src="/opening-suite.mp3" loop preload="none" />
      <button
        type="button"
        onClick={toggleAudio}
        aria-label={isPlaying ? 'Mute background music' : 'Play background music'}
        aria-pressed={isPlaying}
        title={isPlaying ? 'Mute music' : 'Play music'}
        className="flex cursor-pointer items-center justify-center rounded border border-gray-300 bg-white px-2 py-1 text-xs text-black transition-colors hover:bg-gray-50 focus:outline-2 focus:outline-blue-500 dark:border-[#444444] dark:bg-[#252525] dark:text-gray-200 dark:hover:bg-[#303030]"
      >
        <span aria-hidden="true">{isPlaying ? '🔊' : '🔇'}</span>
      </button>
    </div>
  );
}
