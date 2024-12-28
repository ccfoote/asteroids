export function playAsteroidsBlip() {
  const audioCtx = new (window.AudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  // Configure oscillator
  oscillator.type = 'square'; // Retro sound
  oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 note for the blip

  // Configure gain for a short blip
  gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

  // Connect nodes
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  // Play the sound
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.1); // Stop after 100ms

  // Clean up
  setTimeout(() => audioCtx.close(), 1000);
}

export function playAsteroidExplosion() {
  const audioCtx = new (window.AudioContext)();
  const oscillator = audioCtx.createOscillator();
  const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.2, audioCtx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);

  // Generate white noise for explosion
  for (let i = 0; i < noiseBuffer.length; i++) {
      noiseData[i] = Math.random() * 2 - 1; // Random values between -1 and 1
  }

  // Create noise source
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  // Create gain for envelope
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime); // Start louder
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4); // Fade out

  // Optionally add a low rumble
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(80, audioCtx.currentTime); // Low frequency rumble
  oscillator.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.4); // Decrease frequency over time

  // Connect nodes
  noiseSource.connect(gainNode);
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  // Play sounds
  noiseSource.start();
  noiseSource.stop(audioCtx.currentTime + 0.4);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.4);

  // Clean up
  setTimeout(() => audioCtx.close(), 1000);
}

export function playGameOverSound() {
  const audioCtx = new (window.AudioContext)();

  // Oscillator for descending tone
  const oscillator = audioCtx.createOscillator();
  oscillator.type = 'triangle'; // Dramatic and retro
  oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // Start at A4
  oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 1); // Descend over 1 second

  // White noise for static
  const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 1, audioCtx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseBuffer.length; i++) {
      noiseData[i] = Math.random() * 2 - 1; // Random values between -1 and 1
  }
  const noiseSource = audioCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  // Gain for envelope
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0.6, audioCtx.currentTime); // Start loud
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1); // Fade out over 1 second

  // Connect nodes
  oscillator.connect(gainNode);
  noiseSource.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  // Play sound
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 1); // Stop after 1 second
  noiseSource.start();
  noiseSource.stop(audioCtx.currentTime + 1); // Stop after 1 second

  // Clean up
  setTimeout(() => audioCtx.close(), 1000);
}

export function playAccelerationSound() {
  const audioCtx = new (window.AudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  // Configure the oscillator for a "thrust" sound
  oscillator.type = 'sawtooth'; // Retro engine-like sound
  oscillator.frequency.setValueAtTime(200, audioCtx.currentTime); // Start low for a "thrust" sound
  oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.2); // Slight ramp up

  // Configure gain for a pulsing sound
  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Start louder
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3); // Fade out

  // Connect nodes
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  // Play sound
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.3); // Stop after 300ms

  // Clean up
  setTimeout(() => audioCtx.close(), 1000);
}

export function playVictorySound() {
  const audioCtx = new (window.AudioContext)();

  // Create a gain node for volume control
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime); // Start with medium volume
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2); // Fade out over 2 seconds

  // Create the first bell tone
  const oscillator1 = audioCtx.createOscillator();
  oscillator1.type = 'sine'; // Bell-like pure tone
  oscillator1.frequency.setValueAtTime(440, audioCtx.currentTime); // Start with A5
  oscillator1.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 2); // Descend to A4

  // Create the second bell tone for harmony
  const oscillator2 = audioCtx.createOscillator();
  oscillator2.type = 'sine';
  oscillator2.frequency.setValueAtTime(330, audioCtx.currentTime); // Start with E5
  oscillator2.frequency.exponentialRampToValueAtTime(660, audioCtx.currentTime + 2); // Descend to E4

  // Connect oscillators to gain node and destination
  oscillator1.connect(gainNode);
  oscillator2.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  // Play the oscillators
  oscillator1.start();
  oscillator1.stop(audioCtx.currentTime + 2); // Stop after 2 seconds
  oscillator2.start();
  oscillator2.stop(audioCtx.currentTime + 2); // Stop after 2 seconds

  // Clean up
  setTimeout(() => audioCtx.close(), 10000);
}
