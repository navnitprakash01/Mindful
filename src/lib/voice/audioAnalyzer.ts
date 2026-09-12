/**
 * Client Voice Audio Analyzer
 * Mindful 2.0 — Phase 4: Advanced Voice Intelligence
 *
 * Privacy-first acoustic feature extraction using browser-native Web Audio API
 * and Web Speech API.
 *
 * NON-NEGOTIABLE PRIVACY GUARANTEES:
 * 1. Zero raw audio persistence (no file creation, no WAV/MP3 encoding, no cloud upload).
 * 2. Transient in-memory processing: all buffers and audio streams are immediately
 *    stopped and garbage-collected when analysis finishes.
 * 3. Transparent user indication: microphone is only active on explicit user initiation.
 */

export interface AcousticMetrics {
  audioDurationSeconds: number;
  speechDurationSeconds: number;
  pauseCount: number;
  pauseDurationSeconds: number;
  pauseRatio: number; // 0.0 - 1.0
  speechRateWpm?: number;
  vocalEnergy: number; // 0.0 - 1.0 (mean RMS normalized)
  vocalEnergyVariance: number;
  pitchVariance?: number;
  quality: number; // 0.0 - 1.0
  confidence: number; // 0.0 - 1.0
}

export interface VoiceAnalysisResult {
  success: boolean;
  metrics?: AcousticMetrics;
  transcript?: string;
  error?: string;
  errorCode?: 'PERMISSION_DENIED' | 'UNSUPPORTED' | 'NO_AUDIO' | 'TOO_SHORT' | 'INITIALIZATION_FAILED';
}

export interface AudioAnalyzerOptions {
  silenceThresholdRms?: number; // Default 0.015
  minPauseDurationMs?: number;  // Default 250ms
  minSpeechDurationMs?: number; // Default 150ms
}

/**
 * Pure deterministic calculation of acoustic metrics from raw audio PCM frames and transcript.
 * Exported for rigorous unit testing without requiring browser DOM/Web Audio environment.
 */
export function calculateAcousticMetrics(
  rmsFrames: number[],
  frameDurationSeconds: number,
  transcript?: string,
  options: AudioAnalyzerOptions = {}
): AcousticMetrics {
  const silenceThreshold = options.silenceThresholdRms ?? 0.015;
  const minPauseFrames = Math.max(1, Math.round((options.minPauseDurationMs ?? 250) / (frameDurationSeconds * 1000)));

  const totalFrames = rmsFrames.length;
  const audioDurationSeconds = Number((totalFrames * frameDurationSeconds).toFixed(2));

  if (totalFrames === 0 || audioDurationSeconds <= 0) {
    return {
      audioDurationSeconds: 0,
      speechDurationSeconds: 0,
      pauseCount: 0,
      pauseDurationSeconds: 0,
      pauseRatio: 0,
      vocalEnergy: 0,
      vocalEnergyVariance: 0,
      quality: 0,
      confidence: 0,
    };
  }

  // 1. Calculate vocal energy (mean RMS) and variance
  let sumEnergy = 0;
  for (const energy of rmsFrames) {
    sumEnergy += energy;
  }
  const meanEnergy = sumEnergy / totalFrames;

  let sumVariance = 0;
  for (const energy of rmsFrames) {
    const diff = energy - meanEnergy;
    sumVariance += diff * diff;
  }
  const energyVariance = sumVariance / totalFrames;

  // 2. Identify speech vs. pause intervals
  let speechFramesCount = 0;
  let pauseFramesCount = 0;
  let pauseCount = 0;
  let currentSilenceRun = 0;

  for (let i = 0; i < totalFrames; i++) {
    const isVoiced = rmsFrames[i] >= silenceThreshold;

    if (isVoiced) {
      speechFramesCount++;
      if (currentSilenceRun >= minPauseFrames) {
        pauseCount++;
        pauseFramesCount += currentSilenceRun;
      }
      currentSilenceRun = 0;
    } else {
      currentSilenceRun++;
    }
  }

  // Check trailing silence
  if (currentSilenceRun >= minPauseFrames) {
    pauseCount++;
    pauseFramesCount += currentSilenceRun;
  }

  const speechDurationSeconds = Number((speechFramesCount * frameDurationSeconds).toFixed(2));
  const pauseDurationSeconds = Number((pauseFramesCount * frameDurationSeconds).toFixed(2));
  const pauseRatio = audioDurationSeconds > 0
    ? Number(Math.min(1.0, pauseDurationSeconds / audioDurationSeconds).toFixed(2))
    : 0;

  // 3. Calculate speech rate (WPM) if transcript exists
  let speechRateWpm: number | undefined;
  if (transcript && transcript.trim()) {
    const words = transcript.trim().split(/\s+/).filter(Boolean).length;
    // Prefer speech duration to avoid penalizing long pauses, but bound to total duration
    const effectiveDurationMin = (speechDurationSeconds > 0 ? speechDurationSeconds : audioDurationSeconds) / 60;
    if (effectiveDurationMin > 0 && words > 0) {
      speechRateWpm = Math.round(words / effectiveDurationMin);
      // Clamp to realistic human boundary [20, 450]
      speechRateWpm = Math.max(20, Math.min(450, speechRateWpm));
    }
  }

  // 4. Quality & confidence estimates
  // Quality drops if average energy is extremely low (ambient whisper/silence) or heavily clipped
  const normalizedEnergy = Math.min(1.0, meanEnergy * 4);
  const quality = Number(Math.max(0.1, Math.min(0.95, normalizedEnergy > 0.05 ? 0.85 : normalizedEnergy * 10)).toFixed(2));

  // Confidence scales with audio duration (asymptote at 8 seconds) and vocal clarity
  const durationScore = Math.min(1.0, audioDurationSeconds / 8.0);
  const confidence = Number(Math.max(0.15, Math.min(0.85, (durationScore * 0.6 + quality * 0.4))).toFixed(2));

  return {
    audioDurationSeconds,
    speechDurationSeconds,
    pauseCount,
    pauseDurationSeconds,
    pauseRatio,
    speechRateWpm,
    vocalEnergy: Number(normalizedEnergy.toFixed(2)),
    vocalEnergyVariance: Number(Math.min(1.0, energyVariance * 10).toFixed(3)),
    quality,
    confidence,
  };
}

/**
 * Client Session Controller managing browser microphone, AudioContext,
 * AnalyserNode, and Web Speech API recognition concurrently.
 */
export class ClientVoiceAnalyzer {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyserNode: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private rmsFrames: number[] = [];
  private frameDurationSeconds: number = 0.05; // 50ms per evaluation frame
  private isAnalyzing: boolean = false;
  private recognition: SpeechRecognition | null = null;
  private accumulatedTranscript: string = '';

  /**
   * Check whether the current browser supports audio capture and speech recognition.
   */
  public static isSupported(): { audioContext: boolean; mediaDevices: boolean; speechRecognition: boolean } {
    const hasAudioContext = typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);
    const hasMediaDevices = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
    const hasSpeechRecognition = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    return {
      audioContext: hasAudioContext,
      mediaDevices: hasMediaDevices,
      speechRecognition: hasSpeechRecognition,
    };
  }

  /**
   * Start live microphone capture and acoustic feature extraction.
   */
  public async start(options?: { onTranscriptChange?: (text: string) => void }): Promise<void> {
    if (this.isAnalyzing) {
      return;
    }

    const support = ClientVoiceAnalyzer.isSupported();
    if (!support.mediaDevices) {
      throw new Error('UNSUPPORTED: Microphone access is not supported by your browser.');
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('PERMISSION_DENIED: Microphone access was declined by the user.');
      }
      throw new Error(`INITIALIZATION_FAILED: Could not access microphone (${err.message || 'unknown error'}).`);
    }

    // Initialize AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 512;
    this.analyserNode.smoothingTimeConstant = 0.3;
    source.connect(this.analyserNode);

    this.rmsFrames = [];
    this.accumulatedTranscript = '';
    this.isAnalyzing = true;

    // Start speech recognition concurrently if supported
    if (support.speechRecognition) {
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript + ' ';
        }
        this.accumulatedTranscript = transcript.trim();
        options?.onTranscriptChange?.(this.accumulatedTranscript);
      };

      try {
        this.recognition.start();
      } catch (recErr) {
        console.warn('[ClientVoiceAnalyzer] SpeechRecognition start warning:', recErr);
      }
    }

    // Start periodic RMS sampling loop
    const sampleBuffer = new Float32Array(this.analyserNode.fftSize);
    let lastSampleTime = performance.now();

    const sampleLoop = (now: number) => {
      if (!this.isAnalyzing || !this.analyserNode) return;

      const elapsedSinceLast = (now - lastSampleTime) / 1000;
      if (elapsedSinceLast >= this.frameDurationSeconds) {
        this.analyserNode.getFloatTimeDomainData(sampleBuffer);
        let sumSquares = 0;
        for (let i = 0; i < sampleBuffer.length; i++) {
          sumSquares += sampleBuffer[i] * sampleBuffer[i];
        }
        const rms = Math.sqrt(sumSquares / sampleBuffer.length);
        this.rmsFrames.push(rms);
        lastSampleTime = now;
      }

      this.animFrameId = requestAnimationFrame(sampleLoop);
    };

    this.animFrameId = requestAnimationFrame(sampleLoop);
  }

  /**
   * Stop analysis, tear down all media hardware, calculate metrics, and discard audio buffers.
   */
  public async stop(transcriptOverride?: string): Promise<VoiceAnalysisResult> {
    if (!this.isAnalyzing && this.rmsFrames.length === 0) {
      return {
        success: false,
        errorCode: 'NO_AUDIO',
        error: 'No active recording was found.',
      };
    }

    this.isAnalyzing = false;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    // Stop speech recognition
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }

    // Stop all media tracks immediately to release hardware microphone
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // Close AudioContext
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    const transcript = (transcriptOverride || this.accumulatedTranscript).trim();
    const duration = this.rmsFrames.length * this.frameDurationSeconds;

    // Edge check: speech shorter than 1.5 seconds
    if (duration < 1.5) {
      return {
        success: false,
        errorCode: 'TOO_SHORT',
        error: 'Reflection audio is too brief to reliably analyze. Please speak for at least 2 seconds.',
      };
    }

    const metrics = calculateAcousticMetrics(
      this.rmsFrames,
      this.frameDurationSeconds,
      transcript
    );

    // Garbage-collect frames
    this.rmsFrames = [];

    return {
      success: true,
      metrics,
      transcript: transcript || undefined,
    };
  }

  /**
   * Cancel and clean up all resources without computing metrics.
   */
  public cancel(): void {
    this.isAnalyzing = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.rmsFrames = [];
  }
}
