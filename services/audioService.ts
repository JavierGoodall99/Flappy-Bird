


class AudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    // Initialize on user interaction to comply with browser policies
    this.init = this.init.bind(this);
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.5; // Master volume
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playJump() {
    if (!this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playScore() {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playCrash() {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playGlassBreak() {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.type = 'square'; 
    osc.frequency.setValueAtTime(800 + Math.random() * 500, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
    
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(3000, this.ctx.currentTime);
    gain2.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc2.start();
    osc2.stop(this.ctx.currentTime + 0.15);
  }

  playShrink() {
    if (!this.ctx || !this.masterGain) return;
    this.playPowerupSound(600, 1200, 'sine');
  }

  playGrow() {
    if (!this.ctx || !this.masterGain) return;
    this.playPowerupSound(300, 150, 'square');
  }

  playSlowMo() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    // Warping down sound
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 1.0);
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 1.0);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 1.0);
  }

  playShieldUp() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    // Rising "charging" sound
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.2);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  playShieldBreak() {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    // Quick shattering noise
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playGhost() {
    if (!this.ctx || !this.masterGain) return;
    this.playPowerupSound(1000, 1000, 'sine', 0.1, 0.5); // Ethereal ping
  }

  private playPowerupSound(startFreq: number, endFreq: number, type: OscillatorType, duration: number = 0.2, volume: number = 0.3) {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, this.ctx!.currentTime);
    osc.frequency.linearRampToValueAtTime(endFreq, this.ctx!.currentTime + duration);
    
    gain.gain.setValueAtTime(volume, this.ctx!.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx!.currentTime + duration);
    
    osc.start();
    osc.stop(this.ctx!.currentTime + duration);
  }
}

export const audioService = new AudioController();
