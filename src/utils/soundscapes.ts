/**
 * Synthesizes calming ambient soundscapes using the Web Audio API.
 * No external media file dependencies needed.
 */

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private currentType: string | null = null;
  private gainNode: GainNode | null = null;
  private nodes: AudioNode[] = [];
  private isPlaying = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public stop() {
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1);
    }
    setTimeout(() => {
      this.nodes.forEach((n) => {
        try {
          if ('stop' in n && typeof (n as AudioScheduledSourceNode).stop === 'function') {
            (n as AudioScheduledSourceNode).stop();
          }
          n.disconnect();
        } catch {
          // ignore
        }
      });
      this.nodes = [];
      this.isPlaying = false;
      this.currentType = null;
    }, 1000);
  }

  public getCurrentSoundscape() {
    return this.isPlaying ? this.currentType : null;
  }

  public play(type: 'binaural' | 'rain' | 'ocean' | 'forest' | 'zen') {
    this.initCtx();
    if (!this.ctx) return;

    if (this.isPlaying) {
      this.stop();
      if (this.currentType === type) {
        return; // toggle off
      }
    }

    this.isPlaying = true;
    this.currentType = type;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0.01, this.ctx.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 2);
    this.gainNode.connect(this.ctx.destination);

    if (type === 'binaural') {
      this.createBinauralAlpha();
    } else if (type === 'rain') {
      this.createSoftRain();
    } else if (type === 'ocean') {
      this.createOceanTides();
    } else if (type === 'forest') {
      this.createForestBreeze();
    } else if (type === 'zen') {
      this.createZenDrone();
    }
  }

  private createBinauralAlpha() {
    if (!this.ctx || !this.gainNode) return;

    // 210Hz left, 220Hz right -> 10Hz Alpha Brainwave State
    const oscL = this.ctx.createOscillator();
    const oscR = this.ctx.createOscillator();
    oscL.type = 'sine';
    oscR.type = 'sine';
    oscL.frequency.value = 210;
    oscR.frequency.value = 220;

    const merger = this.ctx.createChannelMerger(2);
    oscL.connect(merger, 0, 0);
    oscR.connect(merger, 0, 1);

    merger.connect(this.gainNode);
    oscL.start();
    oscR.start();

    this.nodes.push(oscL, oscR, merger);
  }

  private createZenDrone() {
    if (!this.ctx || !this.gainNode) return;

    // Rich harmonic chord: 136.1 Hz (Om Frequency) + harmonics
    const freqs = [136.1, 272.2, 408.3];
    freqs.forEach((f, i) => {
      if (!this.ctx || !this.gainNode) return;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      oscGain.gain.value = 1 / (i + 1);

      osc.connect(oscGain);
      oscGain.connect(this.gainNode);
      osc.start();
      this.nodes.push(osc, oscGain);
    });
  }

  private createSoftRain() {
    if (!this.ctx || !this.gainNode) return;

    // Pink noise generator for rain sound
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    whiteNoise.connect(filter);
    filter.connect(this.gainNode);
    whiteNoise.start();

    this.nodes.push(whiteNoise, filter);
  }

  private createOceanTides() {
    if (!this.ctx || !this.gainNode) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 1.0;

    // Low Frequency LFO to modulate filter for swell waves
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.1; // 10s wave period
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 300;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    noise.connect(filter);
    filter.connect(this.gainNode);

    lfo.start();
    noise.start();

    this.nodes.push(noise, filter, lfo, lfoGain);
  }

  private createForestBreeze() {
    if (!this.ctx || !this.gainNode) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.08;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;

    noise.connect(filter);
    filter.connect(this.gainNode);
    noise.start();

    this.nodes.push(noise, filter);
  }
}

export const soundEngine = new AmbientSoundEngine();
