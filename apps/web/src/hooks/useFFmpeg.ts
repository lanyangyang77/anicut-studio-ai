import { useState, useEffect, useCallback } from 'react';
import { ffmpegService, ProgressEvent } from '../lib/ffmpeg.service';

export function useFFmpeg() {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    setAvailable(ffmpegService.isAvailable);

    const onProgress = (event: ProgressEvent) => {
      setProgress(Math.round(event.progress * 100));
    };
    ffmpegService.onProgress(onProgress);

    return () => {
      // cleanup
    };
  }, []);

  const load = useCallback(async () => {
    if (ffmpegService.isLoaded || ffmpegService.isLoading) return;
    setLoading(true);
    setError(null);
    try {
      await ffmpegService.load();
      setLoaded(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load FFmpeg');
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  return { loaded, loading, progress, error, available, load };
}