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
        className="text-xs px-2 py-1 bg-white hover:bg-gray-50 dark:bg-[#252525] dark:hover:bg-[#303030] text-black dark:text-gray-200 border border-gray-300 dark:border-[#444444] rounded cursor-pointer flex items-center justify-center transition-colors focus:outline-2 focus:outline-blue-500"
      >
        <span aria-hidden="true">{isPlaying ? '🔊' : '🔇'}</span>
      </button>
    </div>
  );
}
