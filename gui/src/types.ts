export type Asteroid = {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  radius: number;
  color: string;
};

export type Bullet = {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  radius: number;
  color: string;
};

export type Spaceship = {
  radius: number;
  color: string;
  position: { x: number; y: number };
  angle: number; // radians
  velocity: { x: number; y: number }; // pixels per second
  acceleration: number; // pixels per second squared
  rotation: number; // radians per second
};

export type GameState = {
  alive: boolean;
  won: boolean;
  width: number;
  height: number;
  spaceship: Spaceship;
  asteroids: Asteroid[];
  bullets: Bullet[];
  gameStartTime: number;
  gameEndTime: number | null;
  special: boolean;
};

export type GameAction =
  | {
      type: "evolve";
      dt: number;
    }
  | {
      type: "initialize";
      width: number;
      height: number;
      numAsteroids: number;
    }
  | {
      type: "setSpaceshipRotation";
      rotation: number;
    }
  | {
      type: "setSpaceshipAcceleration";
      acceleration: number;
    }
  | {
      type: "fireBullet";
      bulletType: "normal" | "big";
    } |
    {
      type: "setSpecial";
      special: boolean;
    }
