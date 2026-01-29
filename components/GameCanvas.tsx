
import React, { useEffect, useRef } from 'react';
import { Entity, GameState, Player, GameWorld } from '../types';
import { SCREEN_WIDTH, SCREEN_HEIGHT, INITIAL_MAP, MAP_SIZE, WALL_HEIGHT_SCALE, TOTAL_KEYS, INITIAL_ENTITIES, SPAWN_POS, FOV } from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (s: GameState) => void;
  onUpdateHUD: (player: Player, msg: string | null) => void;
}

const TEXTURE_SIZE = 256;

const hash = (n: number) => {
    n = (n << 13) ^ n;
    return (1.0 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0);
};

const color = (r: number, g: number, b: number) => {
    return (255 << 24) | (Math.floor(b) << 16) | (Math.floor(g) << 8) | Math.floor(Math.max(0, Math.min(255, r)));
};

const getTextureColor = (type: number, texX: number, texY: number, side: number): number => {
    const nx = texX / TEXTURE_SIZE;
    const ny = texY / TEXTURE_SIZE;
    
    const noise1 = Math.abs(hash(texX * 13 + texY * 57));
    const noise2 = Math.abs(hash(texX * 121 + texY * 193));
    const grain = (noise1 * 0.4 + noise2 * 0.6);
    
    const cracks = Math.pow(Math.max(0, Math.sin(nx * 40 + ny * 10) * Math.cos(ny * 30 - nx * 20)), 12) * 50;

    if (type === 1 || type === 2 || type === 3) {
        let r, g, b;
        const base = 40 + (grain * 20) - cracks;
        r = base; g = base; b = base + 3;

        if (type === 2 || type === 3) {
            const slimeFactor = Math.abs(Math.sin(nx * 15 + ny * 15 + Date.now() * 0.001));
            const highlight = Math.pow(grain, 15) * 120;
            r = (r * 0.3) + highlight * 0.5;
            g = (g * 0.3) + slimeFactor * 10 + highlight;
            b = (b * 0.3) + slimeFactor * 15 + highlight * 0.8;
        }

        if (side === 1) { r *= 0.5; g *= 0.5; b *= 0.5; }
        return color(r, g, b);
    }
    
    if (type === 4) {
        const isFrame = texX < 4 || texX > 251 || texY < 4 || texY > 251;
        const metalBase = 30 + (grain * 5);
        if (isFrame) return color(metalBase * 0.5, metalBase * 0.5, metalBase * 0.5);
        return color(metalBase, metalBase, metalBase + 2);
    }

    return color(0, 0, 0);
};

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, onUpdateHUD }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const playerRef = useRef<Player>({
    x: SPAWN_POS.x, y: SPAWN_POS.y, dirX: 1, dirY: 0,
    planeX: 0, planeY: FOV, z: 0, pitch: 0, health: 100, keysFound: 0,
    isCrouching: false, isInLocker: true, isClimbing: false,
    noiseLevel: 0, moveSpeed: 0.05, rotSpeed: 0.03
  });

  const worldRef = useRef<GameWorld>({
    map: JSON.parse(JSON.stringify(INITIAL_MAP)),
    floorMap: [], ceilMap: [], entities: JSON.parse(JSON.stringify(INITIAL_ENTITIES)) 
  });

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const lastMessage = useRef<string | null>(null);
  const messageTimer = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
    const handleMouseMove = (e: MouseEvent) => {
        if (document.pointerLockElement === canvasRef.current && gameState === GameState.PLAYING) {
            const { movementX, movementY } = e;
            const p = playerRef.current;
            const rot = movementX * 0.002;
            const oldDirX = p.dirX;
            p.dirX = p.dirX * Math.cos(rot) - p.dirY * Math.sin(rot);
            p.dirY = oldDirX * Math.sin(rot) + p.dirY * Math.cos(rot);
            const oldPlaneX = p.planeX;
            p.planeX = p.planeX * Math.cos(rot) - p.planeY * Math.sin(rot);
            p.planeY = oldPlaneX * Math.sin(rot) + p.planeY * Math.cos(rot);
            p.pitch -= movementY * 2.0;
            p.pitch = Math.max(-SCREEN_HEIGHT / 2, Math.min(SCREEN_HEIGHT / 2, p.pitch));
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gameState]);

  const setMessage = (msg: string) => { lastMessage.current = msg; messageTimer.current = 120; };

  const update = () => {
    if (gameState !== GameState.PLAYING) return;
    const p = playerRef.current;
    const w = worldRef.current;
    
    // Check exit locker
    if (p.isInLocker && keysPressed.current['KeyE']) { 
        p.isInLocker = false; 
        setMessage("STASIS DISRUPTED // RUN");
    }

    if (!p.isInLocker) {
      let speed = p.moveSpeed;
      if (keysPressed.current['ShiftLeft']) speed *= 1.8;
      if (keysPressed.current['ControlLeft']) { p.isCrouching = true; speed *= 0.5; } else { p.isCrouching = false; }

      let dx = 0, dy = 0;
      if (keysPressed.current['KeyW']) { dx += p.dirX * speed; dy += p.dirY * speed; }
      if (keysPressed.current['KeyS']) { dx -= p.dirX * speed; dy -= p.dirY * speed; }
      if (keysPressed.current['KeyD']) { dx += p.planeX * speed; dy += p.planeY * speed; }
      if (keysPressed.current['KeyA']) { dx -= p.planeX * speed; dy -= p.planeY * speed; }

      // Collision logic: Allow movement if tile is 0 (empty) or 4 (locker)
      const checkX = Math.floor(p.x + dx * 2);
      const checkY = Math.floor(p.y + dy * 2);
      
      if (w.map[checkX][Math.floor(p.y)] === 0 || w.map[checkX][Math.floor(p.y)] === 4) p.x += dx;
      if (w.map[Math.floor(p.x)][checkY] === 0 || w.map[Math.floor(p.x)][checkY] === 4) p.y += dy;
      
      p.noiseLevel = (Math.abs(dx) > 0 || Math.abs(dy) > 0) ? (keysPressed.current['ShiftLeft'] ? 1.0 : (p.isCrouching ? 0.1 : 0.4)) : p.noiseLevel * 0.8;
    }

    w.entities.forEach(entity => {
      const dist = Math.hypot(entity.x - p.x, entity.y - p.y);
      if (entity.type === 'KEY' && dist < 0.7) { entity.x = -100; p.keysFound++; setMessage(`KEY OBTAINED ${p.keysFound}/${TOTAL_KEYS}`); }
      if (entity.type === 'EXIT' && dist < 1.2 && p.keysFound >= TOTAL_KEYS) setGameState(GameState.VICTORY);
    });

    if (messageTimer.current > 0) messageTimer.current--;
    onUpdateHUD(p, messageTimer.current > 0 ? lastMessage.current : null);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const p = playerRef.current;
    const w = worldRef.current;
    const imgData = ctx.createImageData(SCREEN_WIDTH, SCREEN_HEIGHT);
    const buffer = new Uint32Array(imgData.data.buffer);
    
    const fogColor = color(25, 28, 32);
    buffer.fill(fogColor);

    const zBuffer = new Float32Array(SCREEN_WIDTH);

    for (let x = 0; x < SCREEN_WIDTH; x++) {
      const cameraX = 2 * x / SCREEN_WIDTH - 1;
      const rayDirX = p.dirX + p.planeX * cameraX;
      const rayDirY = p.dirY + p.planeY * cameraX;
      let mapX = Math.floor(p.x), mapY = Math.floor(p.y);
      const deltaX = Math.abs(1 / rayDirX), deltaY = Math.abs(1 / rayDirY);
      let stepX, stepY, sideDistX, sideDistY;

      if (rayDirX < 0) { stepX = -1; sideDistX = (p.x - mapX) * deltaX; }
      else { stepX = 1; sideDistX = (mapX + 1.0 - p.x) * deltaX; }
      if (rayDirY < 0) { stepY = -1; sideDistY = (p.y - mapY) * deltaY; }
      else { stepY = 1; sideDistY = (mapY + 1.0 - p.y) * deltaY; }

      let hit = 0, side = 0, steps = 0, wallType = 0;
      while (hit === 0 && steps < 150) {
        if (sideDistX < sideDistY) { sideDistX += deltaX; mapX += stepX; side = 0; }
        else { sideDistY += deltaY; mapY += stepY; side = 1; }
        if(mapX < 0 || mapY < 0 || mapX >= MAP_SIZE || mapY >= MAP_SIZE) hit = 1;
        else { const t = w.map[mapX][mapY]; if (t > 0 && t !== 5) { hit = 1; wallType = t; } }
        steps++;
      }

      const perpDist = side === 0 ? (mapX - p.x + (1 - stepX) / 2) / rayDirX : (mapY - p.y + (1 - stepY) / 2) / rayDirY;
      zBuffer[x] = perpDist;

      const lineHeight = Math.floor(SCREEN_HEIGHT / perpDist * WALL_HEIGHT_SCALE);
      const camZ = 0.41 + p.z - (p.isCrouching ? 0.2 : 0);
      const pitch = p.pitch;
      let dStart = Math.max(0, Math.floor(-lineHeight * (1 - camZ) + SCREEN_HEIGHT / 2 + pitch));
      let dEnd = Math.min(SCREEN_HEIGHT - 1, Math.floor(lineHeight * camZ + SCREEN_HEIGHT / 2 + pitch));

      let wallX = (side === 0 ? p.y + perpDist * rayDirY : p.x + perpDist * rayDirX) % 1;
      let texX = Math.floor(wallX * TEXTURE_SIZE);

      const fogIntensity = Math.min(1, Math.max(0, (perpDist - 2.0) / 10.0));

      for (let y = dStart; y < dEnd; y++) {
          const d = (y - pitch - SCREEN_HEIGHT / 2 + lineHeight * (1 - camZ)) / lineHeight;
          const texY = Math.floor(d * TEXTURE_SIZE) % TEXTURE_SIZE;
          let col = getTextureColor(wallType, texX, texY, side);
          
          if (fogIntensity > 0) {
              const r = (col & 0xFF), g = (col >> 8) & 0xFF, b = (col >> 16) & 0xFF;
              const fr = r * (1-fogIntensity) + 25 * fogIntensity;
              const fg = g * (1-fogIntensity) + 28 * fogIntensity;
              const fb = b * (1-fogIntensity) + 32 * fogIntensity;
              col = color(fr, fg, fb);
          }
          
          if (Math.random() > 0.96) {
              const r = (col & 0xFF), g = (col >> 8) & 0xFF, b = (col >> 16) & 0xFF;
              col = color(r+12, g+12, b+12);
          }
          buffer[y * SCREEN_WIDTH + x] = col;
      }
    }
    
    ctx.putImageData(imgData, 0, 0);

    w.entities.sort((a,b) => Math.hypot(b.x-p.x, b.y-p.y) - Math.hypot(a.x-p.x, a.y-p.y)).forEach(s => {
        const sx = s.x - p.x, sy = s.y - p.y;
        const invD = 1.0 / (p.planeX * p.dirY - p.dirX * p.planeY);
        const tx = invD * (p.dirY * sx - p.dirX * sy), ty = invD * (-p.planeY * sx + p.planeX * sy);
        if (ty <= 0) return;
        const sScrX = Math.floor((SCREEN_WIDTH / 2) * (1 + tx / ty));
        const sSize = Math.abs(Math.floor(SCREEN_HEIGHT / ty));
        const camZ = 0.41 + p.z - (p.isCrouching ? 0.2 : 0);
        let dStY = Math.max(0, Math.floor(-sSize * (1-camZ) + SCREEN_HEIGHT / 2 + p.pitch));
        let dEnY = Math.min(SCREEN_HEIGHT - 1, Math.floor(sSize * camZ + SCREEN_HEIGHT / 2 + p.pitch));
        let dStX = Math.max(0, Math.floor(-sSize / 2 + sScrX));
        let dEnX = Math.min(SCREEN_WIDTH - 1, Math.floor(sSize / 2 + sScrX));

        const fog = Math.min(1, Math.max(0, (ty - 2.0) / 10.0));

        for (let x = dStX; x < dEnX; x++) {
            if (x >= 0 && x < SCREEN_WIDTH && ty < zBuffer[x]) {
                ctx.fillStyle = s.type === 'KEY' ? `rgba(180,180,150,${1-fog})` : `rgba(100,110,130,${1-fog})`;
                ctx.fillRect(x, dStY + (dEnY-dStY)*0.4, 1, (dEnY-dStY)*0.2);
            }
        }
    });
  };

  const loop = () => { update(); draw(); requestRef.current = requestAnimationFrame(loop); };
  useEffect(() => { requestRef.current = requestAnimationFrame(loop); return () => cancelAnimationFrame(requestRef.current); }, [gameState]);

  return <canvas ref={canvasRef} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} onClick={() => canvasRef.current?.requestPointerLock()} className="w-full h-full object-contain bg-black cursor-crosshair" />;
};

export default GameCanvas;
