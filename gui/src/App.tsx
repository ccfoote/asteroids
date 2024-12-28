import { useWindowDimensions } from "@fi-sci/misc";
import "./App.css";

import { FunctionComponent, useCallback, useEffect, useReducer, useState } from "react";
import { playAsteroidsBlip, playAsteroidExplosion, playGameOverSound, playAccelerationSound, playVictorySound } from './sounds';

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
  type: "evolve",
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

// Create random asteroid
const createRandomAsteroid = (o: { width: number, height: number }) => {
  const position = {
    x: Math.random() * o.width,
    y: Math.random() * o.height
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
}

// Split asteroid (upon collision with bullet)
const splitAsteroid = (a: Asteroid, b: Bullet): Asteroid[] => {
  if (a.radius < 15) return [];
  const newRadius = a.radius / 2;
  // twice the velocity
  const newVelocityMagnitude = Math.sqrt(a.velocity.x * a.velocity.x + a.velocity.y * a.velocity.y) * 2;
  // orthogonal direction to the bullet velocity
  const angle = Math.atan2(b.velocity.y, b.velocity.x) + Math.PI / 2;
  const newVelocity = {
    x: newVelocityMagnitude * Math.cos(angle),
    y: newVelocityMagnitude * Math.sin(angle)
  };
  return [
    {
      position: { x: a.position.x, y: a.position.y },
      velocity: newVelocity,
      radius: newRadius,
      color: a.color
    },
    {
      position: { x: a.position.x, y: a.position.y },
      velocity: { x: -newVelocity.x, y: -newVelocity.y },
      radius: newRadius,
      color: a.color
    }
  ];
}

// Create new bullets on firing
const createNewBullets = (spaceship: Spaceship): Bullet[] => {
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
  return [bullet];
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
  // dampen the velocity based on dt at a rate of 0.8 per second
  spaceship.velocity.x *= Math.pow(0.8, dt);
  spaceship.velocity.y *= Math.pow(0.8, dt);
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
        const asteroids = splitAsteroid(asteroid, bullet);
        for (const a of asteroids) {
          newAstroids.push(a);
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
    case "evolve": {
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
          return createRandomAsteroid({width, height});
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
      const newBullets = createNewBullets(spaceship)
      return {
        ...state,
        bullets: [...state.bullets, ...newBullets]
      }
    }
  }
}

const GameWindow: FunctionComponent<{ width: number, height: number }> = ({ width, height }) => {
  const [gameState, gameDispatch] = useReducer(gameReducer, gameInitialState);

  useEffect(() => {
    gameDispatch({ type: "initialize", width, height, numAsteroids: 5 });
  }, [width, height]);
  useEffect(() => {
    const intervalId = setInterval(() => {
      gameDispatch({ type: "evolve", dt: 0.05 });
    }, 50);
    return () => clearInterval(intervalId);
  }, []);
  const handleKey = useCallback((key: string, down: boolean) => {
    if (!gameState.alive) return;
    if (key === "ArrowLeft") {
      gameDispatch({ type: "setSpaceshipRotation", rotation: down ? -Math.PI * 0.6 : 0 });
    } else if (key === "ArrowRight") {
      gameDispatch({ type: "setSpaceshipRotation", rotation: down ? Math.PI * 0.6 : 0 });
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
