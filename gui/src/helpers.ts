import { playAsteroidExplosion, playGameOverSound, playVictorySound } from "./sounds";
import { Asteroid, Bullet, GameState, Spaceship } from "./types";

// Create random asteroid
export const createRandomAsteroid = (o: { width: number; height: number }) => {
  const position = {
    x: Math.random() * o.width,
    y: Math.random() * o.height,
  };
  const velocityMagnitude = 20 + Math.random() * 40;
  const angle = Math.random() * 2 * Math.PI;
  const velocity = {
    x: velocityMagnitude * Math.cos(angle),
    y: velocityMagnitude * Math.sin(angle),
  };
  const radius = 10 + Math.random() * 20;
  return {
    position,
    velocity,
    radius,
    color: getRandomColor(),
  };
};

const getRandomColor = () => {
  const r = 100 + Math.floor(Math.random() * 155);
  const g = 100 + Math.floor(Math.random() * 155);
  const b = 0 + Math.floor(Math.random() * 100);
  return `rgb(${r},${g},${b})`;
};

// Split asteroid (upon collision with bullet)
export const splitAsteroid = (a: Asteroid, b: Bullet): Asteroid[] => {
  if (a.radius < 15) return [];
  const newRadius = a.radius / 2;
  // twice the velocity
  const newVelocityMagnitude =
    Math.sqrt(a.velocity.x * a.velocity.x + a.velocity.y * a.velocity.y) * 2;
  // orthogonal direction to the bullet velocity
  const angle = Math.atan2(b.velocity.y, b.velocity.x) + Math.PI / 2;
  const newVelocity = {
    x: newVelocityMagnitude * Math.cos(angle),
    y: newVelocityMagnitude * Math.sin(angle),
  };
  return [
    {
      position: { x: a.position.x, y: a.position.y },
      velocity: newVelocity,
      radius: newRadius,
      color: a.color,
    },
    {
      position: { x: a.position.x, y: a.position.y },
      velocity: { x: -newVelocity.x, y: -newVelocity.y },
      radius: newRadius,
      color: a.color,
    },
  ];
};

// Create new bullets on firing
export const createNewBullets = (
  spaceship: Spaceship,
  bulletType: "normal" | "big"
): Bullet[] => {
  const velocityMag = bulletType === "normal" ? 300 : 50;
  const velocity = {
    x: velocityMag * Math.cos(spaceship.angle),
    y: velocityMag * Math.sin(spaceship.angle),
  };
  const bullet: Bullet = {
    position: { x: spaceship.position.x, y: spaceship.position.y },
    velocity,
    radius: bulletType === "normal" ? 3 : 30,
    color: "red",
  };
  return [bullet];
};

export const evolveSpaceship = (state: GameState, dt: number) => {
  const spaceship = state.spaceship;
  spaceship.angle += spaceship.rotation * dt;
  spaceship.velocity.x +=
    spaceship.acceleration * Math.cos(spaceship.angle) * dt;
  spaceship.velocity.y +=
    spaceship.acceleration * Math.sin(spaceship.angle) * dt;
  spaceship.position.x += spaceship.velocity.x * dt;
  spaceship.position.y += spaceship.velocity.y * dt;
  while (spaceship.position.x < 0) spaceship.position.x += state.width;
  while (spaceship.position.y < 0) {
    spaceship.position.y += state.height;
    spaceship.position.x = state.width - spaceship.position.x;
    spaceship.velocity.x *= -1;
    spaceship.angle = Math.PI - spaceship.angle;
  }
  while (spaceship.position.x >= state.width)
    spaceship.position.x -= state.width;
  while (spaceship.position.y >= state.height) {
    spaceship.position.y -= state.height;
    spaceship.position.x = state.width - spaceship.position.x;
    spaceship.velocity.x *= -1;
    spaceship.angle = Math.PI - spaceship.angle;
  }
  while (spaceship.angle < 0) spaceship.angle += 2 * Math.PI;
  while (spaceship.angle >= 2 * Math.PI) spaceship.angle -= 2 * Math.PI;
  // dampen the velocity based on dt at a rate of 0.8 per second
  spaceship.velocity.x *= Math.pow(0.8, dt);
  spaceship.velocity.y *= Math.pow(0.8, dt);
};

export const evolveBullets = (state: GameState, dt: number) => {
  state.bullets.forEach((bullet) => {
    bullet.position.x += bullet.velocity.x * dt;
    bullet.position.y += bullet.velocity.y * dt;
  });
  state.bullets = state.bullets.filter((bullet) => {
    return (
      bullet.position.x >= 0 &&
      bullet.position.x < state.width &&
      bullet.position.y >= 0 &&
      bullet.position.y < state.height
    );
  });
};

export const evolveAsteroids = (state: GameState, dt: number) => {
  state.asteroids.forEach((asteroid) => {
    asteroid.position.x += asteroid.velocity.x * dt;
    asteroid.position.y += asteroid.velocity.y * dt;
    while (asteroid.position.x < 0) asteroid.position.x += state.width;
    while (asteroid.position.y < 0) {
      asteroid.position.y += state.height;
      asteroid.position.x = state.width - asteroid.position.x;
      asteroid.velocity.x *= -1;
    }
    while (asteroid.position.x >= state.width)
      asteroid.position.x -= state.width;
    while (asteroid.position.y >= state.height) {
      asteroid.position.y -= state.height;
      asteroid.position.x = state.width - asteroid.position.x;
      asteroid.velocity.x *= -1;
    }
  });
};

export const destructAsteroids = (state: GameState) => {
  const newAstroids: Asteroid[] = [];
  state.asteroids.forEach((asteroid) => {
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
        bullet.velocity = { x: 0, y: 0 }; // stop the bullet
        break;
      }
    }
  });
  state.asteroids = [
    ...state.asteroids.filter((asteroid) => asteroid.radius > 0),
    ...newAstroids,
  ];
  state.bullets = state.bullets.filter(
    (bullet) => bullet.velocity.x !== 0 || bullet.velocity.y !== 0
  );
};

export const destructSpaceship = (state: GameState) => {
  const spaceship = state.spaceship;
  for (const asteroid of state.asteroids) {
    const dx = asteroid.position.x - spaceship.position.x;
    const dy = asteroid.position.y - spaceship.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < asteroid.radius + spaceship.radius) {
      playGameOverSound();
      state.alive = false;
      state.gameEndTime = Date.now();
      break;
    }
  }
};

export const checkWin = (state: GameState) => {
  if (state.asteroids.length === 0) {
    if (!state.won) {
      playVictorySound();
      state.won = true;
      state.gameEndTime = Date.now();
    }
  }
};

export const bounceAsteroids = (state: GameState) => {
  const asteroids = state.asteroids;
  for (let i1 = 0; i1 < asteroids.length; i1++) {
    for (let i2 = i1 + 1; i2 < asteroids.length; i2++) {
      if (i1 === i2) continue;
      const a1 = asteroids[i1];
      const a2 = asteroids[i2];
      const dx = a1.position.x - a2.position.x;
      const dy = a1.position.y - a2.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < a1.radius + a2.radius) {
        const v1 = { ...a1.velocity };
        const v2 = { ...a2.velocity };
        a1.velocity = v2;
        a2.velocity = v1;
        // make sure they are more than a1.radius + a2.radius apart after the bounce
        const overlap = a1.radius + a2.radius - distance;
        const angle = Math.atan2(dy, dx);
        a1.position.x += overlap * Math.cos(angle);
        a1.position.y += overlap * Math.sin(angle);
        a2.position.x -= overlap * Math.cos(angle);
      }
    }
  }
};
