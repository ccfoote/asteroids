import { useWindowDimensions } from "@fi-sci/misc";
import "./App.css";

import { FunctionComponent, useCallback, useEffect, useReducer, useState } from "react";
import { GameState, GameAction } from "./types";
import { gameInitialState, gameReducer } from "./gameReducer";

function App() {
  const { width } = useWindowDimensions();
  const [okayToViewSmallScreen, setOkayToViewSmallScreen] = useState(true);
  const [gameState, gameDispatch] = useReducer(gameReducer, gameInitialState);

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
        height: height2 + 40,
      }}
    >
      <GameWindow
        width={width2}
        height={width2}
        gameState={gameState}
        gameDispatch={gameDispatch}
      />
      <div
        style={{
          width: width2,
          height: 40,
          backgroundColor: '#f0f0f0',
          borderLeft: '1px solid black',
          borderRight: '1px solid black',
          borderBottom: '1px solid black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 15px',
          fontFamily: 'monospace'
        }}
      >
        <div>
          Asteroids: {gameState.asteroids.length}
        </div>
        <div>
          {gameState.gameEndTime ?
            `Time: ${((gameState.gameEndTime - gameState.gameStartTime) / 1000).toFixed(1)}s` :
            `Time: ${((Date.now() - gameState.gameStartTime) / 1000).toFixed(1)}s`
          }
        </div>
        {(!gameState.alive || gameState.won) && (
          <button
            onClick={() => gameDispatch({ type: 'initialize', width: width2, height: width2, numAsteroids: 5 })}
            style={{
              padding: '5px 10px',
              cursor: 'pointer',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            Restart
          </button>
        )}
      </div>
    </div>
  );
}

const GameWindow: FunctionComponent<{
  width: number,
  height: number,
  gameState: GameState,
  gameDispatch: React.Dispatch<GameAction>
}> = ({ width, height, gameState, gameDispatch }) => {

  useEffect(() => {
    gameDispatch({ type: "initialize", width, height, numAsteroids: 5 });
  }, [width, height, gameDispatch]);
  useEffect(() => {
    const intervalId = setInterval(() => {
      gameDispatch({ type: "evolve", dt: 0.05 });
    }, 50);
    return () => clearInterval(intervalId);
  }, [gameDispatch]);
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
        gameDispatch({ type: "fireBullet", bulletType: "normal" });
      }
    } else if (key === "b") {
      if (down) {
        gameDispatch({ type: "fireBullet", bulletType: "big" });
      }
    }
  }, [gameState.alive, gameDispatch]);
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

    // Check if any asteroid is too close
    let isAsteroidClose = false;
    for (const asteroid of asteroids) {
      const dx = asteroid.position.x - spaceship.position.x;
      const dy = asteroid.position.y - spaceship.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 100) {
        isAsteroidClose = true;
        break;
      }
    }

    // draw spaceship
    ctx.save();
    ctx.translate(spaceship.position.x, spaceship.position.y);

    // Add red glow if asteroid is close
    if (isAsteroidClose) {
      ctx.shadowColor = 'red';
      ctx.shadowBlur = 20;
    }

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
  }, [divElement, width, height, spaceship, asteroids, bullets, gameState.won]);
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
