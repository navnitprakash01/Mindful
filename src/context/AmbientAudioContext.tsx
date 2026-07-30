import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const AUDIO_URL = '/audio/ambient.mp3';
const STORAGE_KEY = 'mindful_ambient_enabled';

interface AmbientAudioContextType {
  isPlaying: boolean;
  togglePlayback: () => void;
  setPlaying: (playing: boolean) => void;
}

const AmbientAudioContext = createContext<AmbientAudioContextType | undefined>(undefined);

export const AmbientAudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(AUDIO_URL);
    }
    const audio = audioRef.current;

    audio.loop = true;
    audio.volume = 0.3;
    audio.preload = 'auto';

    const onPlay = () => {
      setIsPlaying(true);
      localStorage.setItem(STORAGE_KEY, 'true');
    };
    const onPause = () => {
      setIsPlaying(false);
      localStorage.setItem(STORAGE_KEY, 'false');
    };
    const onError = (e: Event) => {
      console.error('Audio error', e);
    };
    const onEnded = () => {
      if (isPlaying) {
        audio.currentTime = 0;
        audio.play().catch((err) => {
          console.error('Audio ended play failed', err);
          setIsPlaying(false);
        });
      }
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);
    audio.addEventListener('ended', onEnded);

    const wasEnabled = localStorage.getItem(STORAGE_KEY) === 'true';
    if (wasEnabled) {
      audio.play().catch((err) => {
        console.error('Initial autoplay failed', err);
        setIsPlaying(false);
        localStorage.setItem(STORAGE_KEY, 'false');
      });
    }

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    console.log(audio.src);
    console.log(audio.readyState);
    console.log(audio.networkState);
    try {
      await audio.play();
    } catch (error) {
      console.error(error.name);
      console.error(error.message);
      setIsPlaying(false);
      localStorage.setItem(STORAGE_KEY, 'false');
    }
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
    localStorage.setItem(STORAGE_KEY, 'false');
  }, []);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      play();
    } else {
      pause();
    }
  }, [play, pause]);

  const setPlaying = useCallback((playing: boolean) => {
    if (playing) {
      play();
    } else {
      pause();
    }
  }, [play, pause]);

  return (
    <AmbientAudioContext.Provider value={{ isPlaying, togglePlayback, setPlaying }}>
      {children}
    </AmbientAudioContext.Provider>
  );
};

export const useAmbientAudio = () => {
  const context = useContext(AmbientAudioContext);
  if (!context) {
    throw new Error('useAmbientAudio must be used within an AmbientAudioProvider');
  }
  return context;
};