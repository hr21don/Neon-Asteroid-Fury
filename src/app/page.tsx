'use client';

import {useEffect, useRef, useState, useCallback} from 'react';
import {useRouter} from 'next/navigation';
import {generateGameOverMessage} from '@/ai/flows/generate-game-over-message';
import {generateVictoryMessage} from '@/ai/flows/generate-victory-message';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {getRandomArbitrary} from '@/lib/utils';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Icons} from '@/components/icons';
import { cn } from "@/lib/utils";

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const SPACESHIP_SIZE = 30;
const ASTEROID_SIZE = 50;
const PROJECTILE_SIZE = 5;
const ROTATION_SPEED = 1.5;
const THRUST_SPEED = 1.5;
const PROJECTILE_SPEED = 5;

interface Spaceship {
  x: number;
  y: number;
  rotation: number;
  thrust: number;
  lives: number;
}

interface Asteroid {
  x: number;
  y: number;
  size: number;
  xSpeed: number;
  ySpeed: number;
}

interface Projectile {
  x: number;
  y: number;
  rotation: number;
  speed: number;
}

const initialSpaceshipState: Spaceship = {
  x: GAME_WIDTH / 2,
  y: GAME_HEIGHT / 2,
  rotation: 0,
  thrust: 0,
  lives: 3,
};

export default function Home() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spaceshipRef = useRef<Spaceship>({...initialSpaceshipState});
  const asteroidRef = useRef<Asteroid[]>([]);
  const projectileRef = useRef<Projectile[]>([]);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(120);
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [gameState, setGameState] = useState({...initialSpaceshipState});
  const [victoryMessage, setVictoryMessage] = useState<string>('');
  const [gameOverMessage, setGameOverMessage] = useState<string>('');
  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [playerName, setPlayerName] = useState('Player');
  const [mobileRotation, setMobileRotation] = useState(0);
  const [mobileThrust, setMobileThrust] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [isMobile, setIsMobile] = useState(false);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  useEffect(() => {
    setAudioUrl("/music/Walen-Night-Drive.mp3");
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!gameOver && !victory) {
        setTime(prevTime => {
          if (prevTime > 0) {
            return prevTime - 1;
          } else {
            endGame(false); // Time's up!
            clearInterval(timer);
            return 0;
          }
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [gameOver, victory]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        shootProjectile();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    resetGame();
  }, []);

  useEffect(() => {
    spaceshipRef.current = {...gameState};
  }, [gameState])

  useEffect(() => {
    let animationFrameId: number;

    const gameLoop = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      drawSpaceship(ctx);
      drawAsteroids(ctx);
      drawProjectiles(ctx);

      moveSpaceship();
      moveAsteroids();
      moveProjectiles();

      checkCollisions();

      if (spaceshipRef.current.lives <= 0 && !gameOver) {
        endGame(false);
        return;
      }

      if (asteroidRef.current.length === 0 && !victory && !gameOver) {
        endGame(true);
         return;
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameOver, victory]);

  const drawSpaceship = (ctx: CanvasRenderingContext2D) => {
    const s = spaceshipRef.current;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rotation);

    ctx.beginPath();
    ctx.moveTo(-SPACESHIP_SIZE / 2, SPACESHIP_SIZE / 2);
    ctx.lineTo(SPACESHIP_SIZE / 2, SPACESHIP_SIZE / 2);
    ctx.lineTo(0, -SPACESHIP_SIZE / 2);
    ctx.closePath();

    ctx.strokeStyle = '#7DF9FF';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (s.thrust > 0) {
      ctx.beginPath();
      ctx.moveTo(0, SPACESHIP_SIZE / 2);
      ctx.lineTo(-SPACESHIP_SIZE / 4, SPACESHIP_SIZE / 2 + 10);
      ctx.lineTo(SPACESHIP_SIZE / 4, SPACESHIP_SIZE / 2 + 10);
      ctx.closePath();
      ctx.fillStyle = '#FFFF00';
      ctx.fill();
    }

    ctx.restore();
  };

  const drawAsteroids = (ctx: CanvasRenderingContext2D) => {
    asteroidRef.current.forEach(asteroid => {
      ctx.beginPath();
      ctx.arc(asteroid.x, asteroid.y, asteroid.size, 0, 2 * Math.PI);
      ctx.fillStyle = '#32CD32';
      ctx.fill();
    });
  };

  const drawProjectiles = (ctx: CanvasRenderingContext2D) => {
    projectileRef.current.forEach(projectile => {
      ctx.save();
      ctx.translate(projectile.x, projectile.y);
      ctx.rotate(projectile.rotation);
      ctx.fillStyle = '#FF69B4';
      ctx.fillRect(-PROJECTILE_SIZE / 2, -PROJECTILE_SIZE / 2, PROJECTILE_SIZE, PROJECTILE_SIZE);
      ctx.restore();
    });
  };

  const moveSpaceship = () => {
    const s = spaceshipRef.current;

    if(isMobile){
      s.rotation += mobileRotation;
      s.thrust = mobileThrust
    }

    s.x += s.thrust * Math.cos(s.rotation - Math.PI / 2) * 5;
    s.y += s.thrust * Math.sin(s.rotation - Math.PI / 2) * 5;
    s.x = Math.max(0, Math.min(s.x, GAME_WIDTH));
    s.y = Math.max(0, Math.min(s.y, GAME_HEIGHT));
  };

  const moveAsteroids = () => {
    asteroidRef.current = asteroidRef.current.map(a => {
      let x = a.x + a.xSpeed;
      let y = a.y + a.ySpeed;
      if (x < 0) x = GAME_WIDTH;
      if (x > GAME_WIDTH) x = 0;
      if (y < 0) y = GAME_HEIGHT;
      if (y > GAME_HEIGHT) y = 0;
      return {...a, x, y};
    });
  };

  const moveProjectiles = () => {
    projectileRef.current = projectileRef.current
      .map(p => ({
        ...p,
        x: p.x + Math.cos(p.rotation - Math.PI / 2) * p.speed,
        y: p.y + Math.sin(p.rotation - Math.PI / 2) * p.speed,
      }))
      .filter(p => p.x > 0 && p.x < GAME_WIDTH && p.y > 0 && p.y < GAME_HEIGHT);
  };

  const shootProjectile = () => {
    const s = spaceshipRef.current;
    const p: Projectile = {
      x: s.x,
      y: s.y,
      rotation: s.rotation,
      speed: PROJECTILE_SPEED,
    };
    projectileRef.current.push(p);
  };

  const resetAsteroid = (asteroid: Asteroid) => {
    asteroid.x = Math.random() * GAME_WIDTH;
    asteroid.y = Math.random() * GAME_HEIGHT;
   };

  const checkCollisions = () => {
    asteroidRef.current.forEach(asteroid => {
      const dist = Math.hypot(spaceshipRef.current.x - asteroid.x, spaceshipRef.current.y - asteroid.y);
      if (dist < SPACESHIP_SIZE / 2 + asteroid.size) {
        spaceshipRef.current.lives--;
        resetAsteroid(asteroid);
        setGameState((prevGameState) => ({
          ...prevGameState,
          lives: spaceshipRef.current.lives,
        }));
        setScore(prevScore => Math.max(0, prevScore - 50));
      }
    });

    projectileRef.current.forEach(p => {
      asteroidRef.current.forEach(a => {
        const dist = Math.hypot(p.x - a.x, p.y - a.y);
        if (dist < PROJECTILE_SIZE / 2 + a.size) {
          setScore(prev => prev + 100);
          if (a.size > 20) {
            const a1 = {...a, size: a.size / 2, xSpeed: Math.random() - 0.5, ySpeed: Math.random() - 0.5};
            const a2 = {...a, size: a.size / 2, xSpeed: Math.random() - 0.5, ySpeed: Math.random() - 0.5};
            asteroidRef.current = asteroidRef.current.filter(x => x !== a).concat(a1, a2);
          } else {
            asteroidRef.current = asteroidRef.current.filter(x => x !== a);
          }
          projectileRef.current = projectileRef.current.filter(x => x !== p);
        }
      });
     });
   };

  const createAsteroid = (): Asteroid => {
    const size = ASTEROID_SIZE;
    return {
      x: Math.random() * (GAME_WIDTH - size * 2) + size,
      y: Math.random() * (GAME_HEIGHT - size * 2) + size,
      size,
      xSpeed: (Math.random() - 0.5) * 2,
      ySpeed: (Math.random() - 0.5) * 2,
    };
  };

  const resetGame = () => {
    const fetchMessages = async () => {
      const gameOverRes = await generateGameOverMessage({score: 0, survivalTime: 60});
      const minutes = Math.floor(time / 60);
      const seconds = (time % 60).toString().padStart(2, '0');
      setGameOverMessage(gameOverRes.message);
      const victoryRes = await generateVictoryMessage({playerName, score: score, time: `${minutes}:${seconds}`});
      setVictoryMessage(victoryRes.message);
    };
    
    fetchMessages();

    setGameOverMessage('');
    setVictoryMessage('');

    setGameOver(false);
    setVictory(false);
    setScore(0);
    setTime(120);

    spaceshipRef.current = {...initialSpaceshipState};
    setGameState({...initialSpaceshipState});
    asteroidRef.current = Array(5).fill(null).map(createAsteroid);
    projectileRef.current = [];
  };

  const endGame = (won: boolean) => {
    setIsDialogVisible(true);
    if (won) {
      setVictory(true);
    } else {
      setGameOver(true);
    }
  };

    const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
  
      const rect = canvas.getBoundingClientRect();
      const x = event.nativeEvent.offsetX;
      const y = event.nativeEvent.offsetY;
  
      const dx = x - spaceshipRef.current.x;
      const dy = y - spaceshipRef.current.y;
  
      spaceshipRef.current.rotation = Math.atan2(dy, dx) + Math.PI / 2;
      spaceshipRef.current.thrust = THRUST_SPEED;
  
    }, []);
  
    const handleMouseUp = useCallback(() => {
      spaceshipRef.current.thrust = 0;
    }, []);

    const handleTouchStart = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const touch = event.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const halfWidth = canvas.width / 2;

      if (x < halfWidth / 2) {
        setMobileRotation(-ROTATION_SPEED);
      } else if (x > halfWidth * 1.5) {
        setMobileRotation(ROTATION_SPEED);
      } else {
        setMobileThrust(1.0)
      }

    }, []);

    const handleTouchEnd = useCallback(() => {
        setMobileRotation(0);
        setMobileThrust(0);
    }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <div className="absolute top-4 left-4">
        <button
          className={cn(
            "w-20 h-10 rounded-md text-black font-bold transition-colors",
            isPlaying ? "bg-lime-400" : "bg-lime-500"
          )}
          onClick={togglePlay}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
      </div>
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} loop={false}/>
      )}
      <div className="text-2xl font-bold mb-4">Neon Asteroid Fury</div>

      <div className="flex justify-between w-full max-w-[800px] mb-2 px-4">
        <div>Score: {score}</div>
        <div>Lives: {gameState.lives}</div>
        <div>Time: {Math.floor(time / 60)}:{`${(time % 60).toString().padStart(2, '0')}`}</div>
      </div>

      <div className="flex flex-col items-center">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="border border-white max-w-full"
          style={{maxWidth: '100%', height: 'auto'}}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />
        {isMobile && (
          <div className="flex mt-2 space-x-2">
            <Button  unselectable="on" onClick={shootProjectile}>
              Shoot Projectile

            </Button>
          </div>
        )}
        <Card className="w-[350px] mt-4 md:absolute md:top-4 md:right-4 md:w-[350px] mt-4 w-full">
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5">
              {isMobile ? (
                <>
                  <li>Use the left half of the screen to rotate left, the right half to rotate right, and the middle to thrust.</li>
                  <li>Press the "shoot projectiles" button to shoot projectiles</li>
                </>
              ) : (
                <>
                  <li>Use left mouse click to rotate and thrust</li>
                  <li>Press spacebar to shoot projectiles</li>
                </>
              )}
              <li>Asteroids break into smaller pieces when hit, eventually disappearing</li>
              <li>Avoid collisions! If the ship hits an asteroid, it explodes and you lose a life</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4">
        <Button onClick={resetGame}>Reset Game</Button>
      </div>
      <Dialog open={isDialogVisible} onOpenChange={setIsDialogVisible}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{victory ? 'Victory!' : 'Game Over'}</DialogTitle>
            <DialogDescription>{gameOver && gameOverMessage ? gameOverMessage : victory && victoryMessage ? victoryMessage : ''}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => resetGame()}>Play Again</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
