import { useWindowDimensions } from "@fi-sci/misc";
import "./App.css";

import { FunctionComponent, useCallback, useEffect, useReducer, useState } from "react";

function App() {
  const { width } = useWindowDimensions();
  const [okayToViewSmallScreen, setOkayToViewSmallScreen] = useState(true);  // set to false to enable the message
  if (width < 800 && !okayToViewSmallScreen) {
    return (
      <SmallScreenMessage
        onOkay={() => setOkayToViewSmallScreen(true)}
      />
    );
  }
  const width2 = Math.min(width, 600);
  const height2 = width2;
  const offsetLeft = (width - width2) / 2;
  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        left: offsetLeft,
        width: width2,
        height: height2,
      }}
    >
      <GameWindow
        width={width2}
        height={height2}
      />
    </div>
  );
}

type Asteroid = {
  position: { x: number, y: number },
  velocity: { x: number, y: number },
  radius: number,
  color: string,
}

type Bullet = {
  position: { x: number, y: number },
  velocity: { x: number, y: number },
  radius: number,
  color: string,
}

type Spaceship = {
  radius: number,
  color: string,
  position: { x: number, y: number },
  angle: number, // radians
  velocity: { x: number, y: number }, // pixels per second
  acceleration: number, // pixels per second squared
  rotation: number, // radians per second
}

type GameState = {
  alive: boolean,
  won: boolean,
  width: number,
  height: number,
  spaceship: Spaceship,
  asteroids: Asteroid[],
  bullets: Bullet[]
}

type GameAction = {
  type: "tick",
  dt: number
} | {
  type: "initialize"
  width: number,
  height: number,
  numAsteroids: number
} | {
  type: "setSpaceshipRotation",
  rotation: number
} | {
  type: "setSpaceshipAcceleration",
  acceleration: number
} | {
  type: "fireBullet"
}

const gameInitialState: GameState = {
  alive: true,
  won: false,
  width: 0,
  height: 0,
  spaceship: {
    radius: 15,
    color: "black",
    position: { x: 0, y: 0 },
    angle: 0,
    velocity: { x: 0, y: 0 },
    acceleration: 0,
    rotation: 0,
  },
  asteroids: [],
  bullets: []
}

const evolveSpaceship = (state: GameState, dt: number) => {
  const spaceship = state.spaceship;
  spaceship.angle += spaceship.rotation * dt;
  spaceship.velocity.x += spaceship.acceleration * Math.cos(spaceship.angle) * dt;
  spaceship.velocity.y += spaceship.acceleration * Math.sin(spaceship.angle) * dt;
  spaceship.position.x += spaceship.velocity.x * dt;
  spaceship.position.y += spaceship.velocity.y * dt;
  spaceship.position.x = (spaceship.position.x + state.width) % state.width;
  spaceship.position.y = (spaceship.position.y + state.height) % state.height;
  while (spaceship.position.x < 0) spaceship.position.x += state.width;
  while (spaceship.position.y < 0) spaceship.position.y += state.height;
  while (spaceship.position.x >= state.width) spaceship.position.x -= state.width;
  while (spaceship.position.y >= state.height) spaceship.position.y -= state.height;
  while (spaceship.angle < 0) spaceship.angle += 2 * Math.PI;
  while (spaceship.angle >= 2 * Math.PI) spaceship.angle -= 2 * Math.PI;
}

const evolveBullets = (state: GameState, dt: number) => {
  state.bullets.forEach(bullet => {
    bullet.position.x += bullet.velocity.x * dt;
    bullet.position.y += bullet.velocity.y * dt;
  });
  state.bullets = state.bullets.filter(bullet => {
    return bullet.position.x >= 0 && bullet.position.x < state.width &&
           bullet.position.y >= 0 && bullet.position.y < state.height;
  });
}

const evolveAsteroids = (state: GameState, dt: number) => {
  state.asteroids.forEach(asteroid => {
    asteroid.position.x += asteroid.velocity.x * dt;
    asteroid.position.y += asteroid.velocity.y * dt;
    while (asteroid.position.x < 0) asteroid.position.x += state.width;
    while (asteroid.position.y < 0) asteroid.position.y += state.height;
    while (asteroid.position.x >= state.width) asteroid.position.x -= state.width;
    while (asteroid.position.y >= state.height) asteroid.position.y -= state.height;
  });
}

const destructAsteroids = (state: GameState) => {
  const newAstroids: Asteroid[] = [];
  state.asteroids.forEach(asteroid => {
    let destruct = false;
    for (const bullet of state.bullets) {
      const dx = asteroid.position.x - bullet.position.x;
      const dy = asteroid.position.y - bullet.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < asteroid.radius + bullet.radius) {
        destruct = true;
      }
      if (destruct) {
        playAsteroidExplosion();
        if (asteroid.radius > 15) {
          const newRadius = asteroid.radius / 2;
          // new velocity should be orthogonal to original velocity with twice the magnitude-
          const angle = Math.atan2(asteroid.velocity.y, asteroid.velocity.x);
          const newAngle1 = angle + Math.PI / 2;
          const newAngle2 = angle - Math.PI / 2;
          const newVelocityMagnitude = Math.sqrt(asteroid.velocity.x * asteroid.velocity.x + asteroid.velocity.y * asteroid.velocity.y) * 2;
          const newVelocity1 = {
            x: newVelocityMagnitude * Math.cos(newAngle1),
            y: newVelocityMagnitude * Math.sin(newAngle1)
          };
          const newVelocity2 = {
            x: newVelocityMagnitude * Math.cos(newAngle2),
            y: newVelocityMagnitude * Math.sin(newAngle2)
          };
          newAstroids.push({
            position: { x: asteroid.position.x, y: asteroid.position.y },
            velocity: newVelocity1,
            radius: newRadius,
            color: asteroid.color
          });
          newAstroids.push({
            position: { x: asteroid.position.x, y: asteroid.position.y },
            velocity: newVelocity2,
            radius: newRadius,
            color: asteroid.color
          });
        }
        asteroid.radius = 0;
        bullet.velocity = { x: 0, y: 0 };  // stop the bullet
        break
      }
    }
  });
  state.asteroids = [...state.asteroids.filter(asteroid => asteroid.radius > 0), ...newAstroids];
  state.bullets = state.bullets.filter(bullet => bullet.velocity.x !== 0 || bullet.velocity.y !== 0);
}

const destructSpaceship = (state: GameState) => {
  const spaceship = state.spaceship;
  for (const asteroid of state.asteroids) {
    const dx = asteroid.position.x - spaceship.position.x;
    const dy = asteroid.position.y - spaceship.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < asteroid.radius + spaceship.radius) {
      playGameOverSound();
      state.alive = false;
      break;
    }
  }
}

const checkWin = (state: GameState) => {
  if (state.asteroids.length === 0) {
    if (!state.won) {
      playVictorySound();
      state.won = true;
    }
  }
}

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case "tick": {
      if (!state.alive) return state;
      const s = JSON.parse(JSON.stringify(state));
      evolveSpaceship(s, action.dt);
      evolveBullets(s, action.dt);
      evolveAsteroids(s, action.dt);
      destructAsteroids(s);
      destructSpaceship(s);
      checkWin(s);
      return s;
    }
    case "initialize": {
      const width = action.width;
      const height = action.height;
      const numAsteroids = action.numAsteroids;
      return {
        ...gameInitialState,
        width: width,
        height: height,
        spaceship: {
          ...gameInitialState.spaceship,
          position: { x: width / 2, y: height / 2 }
        },
        asteroids: [...Array(numAsteroids)].map(() => {
          const position = {
            x: Math.random() * width,
            y: Math.random() * height
          };
          const velocityMagnitude = 20 + Math.random() * 40;
          const angle = Math.random() * 2 * Math.PI;
          const velocity = {
            x: velocityMagnitude * Math.cos(angle),
            y: velocityMagnitude * Math.sin(angle)
          };
          const radius = 10 + Math.random() * 20;
          return {
            position,
            velocity,
            radius,
            color: "gray"
          };
        })
      }
    }
    case "setSpaceshipRotation": {
      return {
        ...state,
        spaceship: {
          ...state.spaceship,
          rotation: action.rotation
        }
      };
    }
    case "setSpaceshipAcceleration": {
      if (action.acceleration > 0) {
        playAccelerationSound();
      }
      return {
        ...state,
        spaceship: {
          ...state.spaceship,
          acceleration: action.acceleration
        }
      };
    }
    case "fireBullet": {
      const spaceship = state.spaceship;
      const velocity = {
        x: 300 * Math.cos(spaceship.angle),
        y: 300 * Math.sin(spaceship.angle)
      };
      const bullet: Bullet = {
        position: { x: spaceship.position.x, y: spaceship.position.y },
        velocity,
        radius: 3,
        color: "red"
      };
      return {
        ...state,
        bullets: [...state.bullets, bullet]
      };
    }
  }
}

function playAsteroidsBlip() {
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

function playAsteroidExplosion() {
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

function playGameOverSound() {
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

function playAccelerationSound() {
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

function playVictorySound() {
  const audioCtx = new (window.AudioContext)();

  // Create a gain node for volume control
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime); // Start with medium volume
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 2); // Fade out over 2 seconds

  // Create the first bell tone
  const oscillator1 = audioCtx.createOscillator();
  oscillator1.type = 'sine'; // Bell-like pure tone
  oscillator1.frequency.setValueAtTime(880, audioCtx.currentTime); // Start with A5
  oscillator1.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 2); // Descend to A4

  // Create the second bell tone for harmony
  const oscillator2 = audioCtx.createOscillator();
  oscillator2.type = 'sine';
  oscillator2.frequency.setValueAtTime(660, audioCtx.currentTime); // Start with E5
  oscillator2.frequency.exponentialRampToValueAtTime(330, audioCtx.currentTime + 2); // Descend to E4

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

const GameWindow: FunctionComponent<{ width: number, height: number }> = ({ width, height }) => {
  const [gameState, gameDispatch] = useReducer(gameReducer, gameInitialState);

  useEffect(() => {
    gameDispatch({ type: "initialize", width, height, numAsteroids: 5 });
  }, [width, height]);
  useEffect(() => {
    const intervalId = setInterval(() => {
      gameDispatch({ type: "tick", dt: 0.05 });
    }, 50);
    return () => clearInterval(intervalId);
  }, []);
  const handleKey = useCallback((key: string, down: boolean) => {
    if (!gameState.alive) return;
    if (key === "ArrowLeft") {
      gameDispatch({ type: "setSpaceshipRotation", rotation: down ? -Math.PI : 0 });
    } else if (key === "ArrowRight") {
      gameDispatch({ type: "setSpaceshipRotation", rotation: down ? Math.PI : 0 });
    } else if (key === "ArrowUp") {
      gameDispatch({ type: "setSpaceshipAcceleration", acceleration: down ? 100 : 0 });
    } else if (key === " ") {
      if (down) {
        playAsteroidsBlip();
        gameDispatch({ type: "fireBullet" });
      }
    }
  }, [gameState.alive]);
  return (
    <div
      style={{
        position: "relative",
        width: width,
        height: height,
        border: "1px solid black",
      }}
    >
      <GameCanvas
        width={width}
        height={height}
        gameState={gameState}
        onKey={handleKey}
      />
    </div>
  );
}

type GameCanvasProps = {
  width: number,
  height: number,
  gameState: GameState,
  onKey: (key: string, down: boolean) => void
}

const GameCanvas: FunctionComponent<GameCanvasProps> = ({ width, height, gameState, onKey }) => {
  const { spaceship, asteroids, bullets } = gameState;
  const [divElement, setDivElement] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    divElement?.focus();
  }, [divElement]);

  useEffect(() => {
    if (!divElement) return;
    const ctx = divElement.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    // if win, then background should be green
    if (gameState.won) {
      ctx.fillStyle = "green";
      ctx.fillRect(0, 0, width, height);
    }

    // draw spaceship
    ctx.save();
    ctx.translate(spaceship.position.x, spaceship.position.y);

    // Draw the circle
    ctx.beginPath();
    ctx.arc(0, 0, spaceship.radius, 0, 2 * Math.PI);
    ctx.strokeStyle = spaceship.color;
    ctx.stroke();

    // Draw the direction triangle inside
    ctx.rotate(spaceship.angle - Math.PI / 2);
    ctx.fillStyle = spaceship.color;
    ctx.beginPath();
    ctx.moveTo(-spaceship.radius / 2, -spaceship.radius / 2);
    ctx.lineTo(spaceship.radius / 2, -spaceship.radius / 2);
    ctx.lineTo(0, spaceship.radius);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    asteroids.forEach(asteroid => {
      ctx.fillStyle = asteroid.color;
      ctx.beginPath();
      ctx.arc(asteroid.position.x, asteroid.position.y, asteroid.radius, 0, 2 * Math.PI);
      ctx.fill();
    });
    bullets.forEach(bullet => {
      ctx.fillStyle = bullet.color;
      ctx.beginPath();
      ctx.arc(bullet.position.x, bullet.position.y, bullet.radius, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [divElement, width, height, spaceship, asteroids, bullets]);
  return (
    <canvas
      ref={elm => setDivElement(elm)}
      width={width}
      height={height}
      tabIndex={0}
      onKeyDown={e => onKey(e.key, true)}
      onKeyUp={e => onKey(e.key, false)}
    />
  );
}

const SmallScreenMessage: FunctionComponent<{ onOkay: () => void }> = ({ onOkay }) => {
  return (
    <div style={{padding: 20}}>
      <p>
        This page is not optimized for small screens or mobile devices. Please use a larger
        screen or expand your browser window width.
      </p>
      <p>
        <button onClick={onOkay}>
          I understand, continue anyway
        </button>
      </p>
    </div>
  );
}

export default App;
