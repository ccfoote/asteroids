import {
  bounceAsteroids,
  checkWin,
  createNewBullets,
  spawnRandomAsteroid,
  destructAsteroids,
  destructSpaceship,
  evolveAsteroids,
  evolveBullets,
  evolveSpaceship,
} from "./helpers";
import { playAccelerationSound, playAsteroidsBlip } from "./sounds";
import { GameAction, GameState } from "./types";

export const gameInitialState: GameState = {
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
  bullets: [],
  gameStartTime: Date.now(),
  gameEndTime: null,
  special: false,
};

export const gameReducer = (
  state: GameState,
  action: GameAction
): GameState => {
  switch (action.type) {
    case "evolve": {
      if (!state.alive) return state;
      const s = JSON.parse(JSON.stringify(state));
      evolveSpaceship(s, action.dt);
      evolveBullets(s, action.dt);
      evolveAsteroids(s, action.dt);
      destructAsteroids(s);
      destructSpaceship(s);
      bounceAsteroids(s);
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
          position: { x: width / 2, y: height / 2 },
        },
        asteroids: [...Array(numAsteroids)].map(() => {
          return spawnRandomAsteroid({ width, height });
        }),
        gameStartTime: Date.now(),
        gameEndTime: null,
      };
    }
    case "setSpaceshipRotation": {
      return {
        ...state,
        spaceship: {
          ...state.spaceship,
          rotation: action.rotation,
        },
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
          acceleration: action.acceleration,
        },
      };
    }
    case "fireBullet": {
      const spaceship = state.spaceship;
      let newBullets = createNewBullets(spaceship, action.bulletType);
      const numExistingBullets = state.bullets.filter((bullet) => {
        if (action.bulletType === "big") {
          return bullet.radius > 3;
        } else {
          return bullet.radius <= 3;
        }
      }).length;
      const maxNumActiveBullets = action.bulletType === "big" ? 1 : 10;
      if (newBullets.length > maxNumActiveBullets - numExistingBullets) {
        newBullets = newBullets.slice(
          0,
          maxNumActiveBullets - numExistingBullets
        );
      }
      if (newBullets.length > 0) {
        playAsteroidsBlip();
      }
      return {
        ...state,
        bullets: [...state.bullets, ...newBullets],
      };
    }
    case "setSpecial": {
      return {
        ...state,
        special: action.special,
      };
    }
  }
};
