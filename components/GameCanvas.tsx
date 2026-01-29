import React, { useEffect, useRef } from 'react';
import { Entity, GameState, Player, GameWorld } from '../types';
import { SCREEN_WIDTH, SCREEN_HEIGHT, INITIAL_MAP, MAP_SIZE, WALL_HEIGHT_SCALE, TOTAL_KEYS, INITIAL_ENTITIES, SPAWN_POS, FOV } from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (s: GameState) => void;
  onUpdateHUD: (player: Player, msg: string | null) => void;
}

// Procedural Texture Generation Helpers
const TEXTURE_SIZE = 64;

// Helper to create color
const color = (r: number, g: number, b: number) => {
    return (255 << 24) | (b << 16) | (g << 8) | r;
};

// Texture generator
const getTextureColor = (type: number, texX: number, texY: number, side: number): number => {
    let col = 0;
    
    // 1: Concrete Slab (Brutalist Maze Style)
    if (type === 1) {
        const seamY = texY % 32 === 0 || texY % 32 === 31;
        const seamX = texX === 0 || texX === 63;
        
        if (seamY || seamX) {
            col = color(50, 55, 65); // Dark seam
        } else {
            const noise = ((texX * 17 + texY * 23) % 19) * 2;
            const stain = (Math.sin(texX * 0.2) > 0.8) ? 10 : 0;
            const r = 140 - noise - stain;
            const g = 145 - noise - stain;
            const b = 155 - noise - stain;
            col = color(r, g, b);
        }
    }
    // 2: Mossy/Old Wall
    else if (type === 2) {
        const noise = ((texX * 3 + texY * 7) % 13) * 4;
        const mossNoise = Math.sin(texX * 0.1) + Math.cos(texY * 0.1);
        if (mossNoise > 0.5) {
             const greenVar = (texX % 5) * 5;
             col = color(40 + greenVar, 80 + greenVar, 40);
        } else {
             col = color(80 - noise, 90 - noise, 100 - noise);
        }
    }
    // 3: Vine Wall
    else if (type === 3) {
        const vineStrand = Math.abs(Math.sin(texX * 0.3) * 10);
        const isLeaf = ((texY + Math.floor(vineStrand)) % 8) < 5;
        if (isLeaf) {
             const shade = ((texX * texY) % 3) * 20;
             col = color(30, 120 + shade, 40);
        } else {
             col = color(60, 65, 70);
        }
    }
    // 4: Locker (Industrial Metal)
    else if (type === 4) {
        if (texY > 10 && texY < 54 && texY % 6 < 2 && texX > 8 && texX < 56) {
            col = color(20, 20, 25); 
        } else {
            if (Math.random() > 0.98) col = color(100, 60, 50);
            else col = color(90, 95, 100);
            if (texX < 4 || texX > 60 || texY < 4 || texY > 60) col = color(60, 65, 70);
        }
    }
    else {
        col = 0xFFFF00FF; 
    }

    if (side === 1) {
        const r = (col & 0xFF) >> 1;
        const g = ((col >> 8) & 0xFF) >> 1;
        const b = ((col >> 16) & 0xFF) >> 1;
        return (255 << 24) | (b << 16) | (g << 8) | r;
    }
    return col;
};

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, onUpdateHUD }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const playerRef = useRef<Player>({
    x: SPAWN_POS.x, 
    y: SPAWN_POS.y,
    dirX: 1, dirY: 0,
    planeX: 0, planeY: FOV, // Updated FOV from constants
    z: 0,
    pitch: 0,
    health: 100,
    keysFound: 0,
    isCrouching: false,
    isInLocker: true,
    isClimbing: false,
    noiseLevel: 0,
    moveSpeed: 0.05,
    rotSpeed: 0.03
  });

  const worldRef = useRef<GameWorld>({
    map: JSON.parse(JSON.stringify(INITIAL_MAP)),
    floorMap: [],
    ceilMap: [],
    entities: JSON.parse(JSON.stringify(INITIAL_ENTITIES)) // Use generated entities
  });

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const lastMessage = useRef<string | null>(null);
  const messageTimer = useRef<number>(0);

  useEffect(() => {
    // Reset on game start
    if (gameState === GameState.PLAYING) {
       // Optional: Reset player pos if coming from menu fresh?
       // For now, keep state persistence or manual reset if needed.
    }
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
    
    const handleMouseMove = (e: MouseEvent) => {
        if (document.pointerLockElement === canvasRef.current && gameState === GameState.PLAYING) {
            const { movementX, movementY } = e;
            const ROTATION_SENSITIVITY = 0.002;
            const PITCH_SENSITIVITY = 2.0;
            const p = playerRef.current;
            
            const rot = movementX * ROTATION_SENSITIVITY;
            
            const oldDirX = p.dirX;
            p.dirX = p.dirX * Math.cos(rot) - p.dirY * Math.sin(rot);
            p.dirY = oldDirX * Math.sin(rot) + p.dirY * Math.cos(rot);
            const oldPlaneX = p.planeX;
            p.planeX = p.planeX * Math.cos(rot) - p.planeY * Math.sin(rot);
            p.planeY = oldPlaneX * Math.sin(rot) + p.planeY * Math.cos(rot);

            p.pitch -= movementY * PITCH_SENSITIVITY;
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

  const handleCanvasClick = () => {
      if (gameState === GameState.PLAYING) {
          canvasRef.current?.requestPointerLock();
      }
  };

  const update = () => {
    if (gameState !== GameState.PLAYING) return;

    const p = playerRef.current;
    const w = worldRef.current;
    let speed = p.moveSpeed;
    
    if (keysPressed.current['ShiftLeft']) speed *= 1.8;
    if (keysPressed.current['ControlLeft'] || keysPressed.current['KeyC']) {
      p.isCrouching = true;
      speed *= 0.5;
    } else {
      p.isCrouching = false;
    }

    if (p.isClimbing) {
        if (keysPressed.current['KeyW']) p.z = Math.min(p.z + 0.02, 1.0);
        if (keysPressed.current['KeyS']) p.z = Math.max(p.z - 0.02, 0);
        if (p.z <= 0.1 && keysPressed.current['KeyS']) {
             p.isClimbing = false;
             p.z = 0;
        }
    }

    if (p.isInLocker) {
      if (keysPressed.current['KeyE']) {
        p.isInLocker = false;
        setMessage("Escaped the Box. Stay quiet.");
        // We are already at spawn pos, just set state. 
        // Logic ensures we don't clip into wall if map gen is correct.
      }
    }

    if (!p.isInLocker) {
      const moveStep = speed * (p.isClimbing && p.z < 0.9 ? 0 : 1);
      let dx = 0;
      let dy = 0;

      if (keysPressed.current['KeyW']) { dx += p.dirX * moveStep; dy += p.dirY * moveStep; }
      if (keysPressed.current['KeyS']) { dx -= p.dirX * moveStep; dy -= p.dirY * moveStep; }
      if (keysPressed.current['KeyD']) { dx += p.planeX * moveStep; dy += p.planeY * moveStep; }
      if (keysPressed.current['KeyA']) { dx -= p.planeX * moveStep; dy -= p.planeY * moveStep; }

      const isMoving = Math.abs(dx) > 0 || Math.abs(dy) > 0;
      if (isMoving) {
        p.noiseLevel = keysPressed.current['ShiftLeft'] ? 1.0 : (p.isCrouching ? 0.1 : 0.4);
      } else {
        p.noiseLevel = p.noiseLevel * 0.9;
      }

      // Collision
      const canWalkOver = p.z > 0.8;
      if (!canWalkOver) {
        if (w.map[Math.floor(p.x + dx * 3)][Math.floor(p.y)] === 0 || 
            w.map[Math.floor(p.x + dx * 3)][Math.floor(p.y)] === 4 ||
            w.map[Math.floor(p.x + dx * 3)][Math.floor(p.y)] === 5) p.x += dx;
        if (w.map[Math.floor(p.x)][Math.floor(p.y + dy * 3)] === 0 || 
            w.map[Math.floor(p.x)][Math.floor(p.y + dy * 3)] === 4 ||
            w.map[Math.floor(p.x)][Math.floor(p.y + dy * 3)] === 5) p.y += dy;

        const mapX = Math.floor(p.x);
        const mapY = Math.floor(p.y);
        if (w.map[mapX][mapY] === 5) {
             p.health -= 0.5;
             setMessage("IT'S A TRAP! MOVE!");
             p.noiseLevel = 1.0;
        }
        
        // Check for climbable walls
        const frontX = Math.floor(p.x + p.dirX * 0.6);
        const frontY = Math.floor(p.y + p.dirY * 0.6);
        if (w.map[frontX][frontY] === 3 && keysPressed.current['Space'] && !p.isClimbing) {
             p.isClimbing = true;
             setMessage("Climbing...");
        }
      } else {
          p.x += dx; p.y += dy;
          if (w.map[Math.floor(p.x)][Math.floor(p.y)] === 0) {
              p.z -= 0.05;
              if (p.z <= 0) p.z = 0;
          }
      }
    }

    // Entity Logic
    w.entities.forEach(entity => {
      const dist = Math.hypot(entity.x - p.x, entity.y - p.y);
      if (entity.type === 'KEY') {
         if (dist < 0.5) { entity.x = -100; p.keysFound++; setMessage(`Found Key ${p.keysFound}/${TOTAL_KEYS}`); }
      }
      else if (entity.type === 'EXIT') {
          if (dist < 1.0 && p.keysFound >= TOTAL_KEYS) setGameState(GameState.VICTORY);
          else if (dist < 1.0 && Math.random() > 0.95) setMessage("Need all keys to escape!");
      }
    });

    if (p.health <= 0) setGameState(GameState.GAME_OVER);
    if (messageTimer.current > 0) {
        messageTimer.current--;
        if (messageTimer.current <= 0) { onUpdateHUD(p, null); lastMessage.current = null; }
    } else { onUpdateHUD(p, lastMessage.current); }
  };

  const setMessage = (msg: string) => {
      lastMessage.current = msg;
      messageTimer.current = 120;
      onUpdateHUD(playerRef.current, msg);
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
    
    // Fill Ceiling and Floor
    const horizon = Math.floor(SCREEN_HEIGHT / 2 + p.pitch);
    for (let y = 0; y < SCREEN_HEIGHT; y++) {
        const isSky = y < horizon;
        let col = isSky ? color(15, 23, 42) : color(30, 41, 59);
        if (isSky) {
             const fade = 1 - y / SCREEN_HEIGHT;
             col = color(Math.floor(15 * fade), Math.floor(23 * fade), Math.floor(42 * fade));
        } else {
             const fade = (y - horizon) / (SCREEN_HEIGHT - horizon);
             col = color(Math.floor(30 * fade), Math.floor(41 * fade), Math.floor(59 * fade));
        }

        const rowStart = y * SCREEN_WIDTH;
        for (let x=0; x<SCREEN_WIDTH; x++) buffer[rowStart + x] = col;
    }

    const zBuffer: number[] = new Array(SCREEN_WIDTH).fill(0);

    // Wall Casting
    for (let x = 0; x < SCREEN_WIDTH; x++) {
      const cameraX = 2 * x / SCREEN_WIDTH - 1;
      const rayDirX = p.dirX + p.planeX * cameraX;
      const rayDirY = p.dirY + p.planeY * cameraX;

      let mapX = Math.floor(p.x);
      let mapY = Math.floor(p.y);
      let sideDistX, sideDistY;
      const deltaDistX = Math.abs(1 / rayDirX);
      const deltaDistY = Math.abs(1 / rayDirY);
      let perpWallDist;
      let stepX, stepY;
      let hit = 0;
      let side = 0;

      if (rayDirX < 0) { stepX = -1; sideDistX = (p.x - mapX) * deltaDistX; }
      else { stepX = 1; sideDistX = (mapX + 1.0 - p.x) * deltaDistX; }
      if (rayDirY < 0) { stepY = -1; sideDistY = (p.y - mapY) * deltaDistY; }
      else { stepY = 1; sideDistY = (mapY + 1.0 - p.y) * deltaDistY; }

      let wallType = 0;
      // Safety break for larger maps to prevent infinite loop if escaped
      let steps = 0;
      while (hit === 0 && steps < 100) {
        if (sideDistX < sideDistY) { sideDistX += deltaDistX; mapX += stepX; side = 0; }
        else { sideDistY += deltaDistY; mapY += stepY; side = 1; }
        if(mapX < 0 || mapY < 0 || mapX >= MAP_SIZE || mapY >= MAP_SIZE) { hit = 1; }
        else {
            const tile = w.map[mapX][mapY];
            if (tile > 0 && tile !== 5) { hit = 1; wallType = tile; }
        }
        steps++;
      }

      if (side === 0) perpWallDist = (mapX - p.x + (1 - stepX) / 2) / rayDirX;
      else           perpWallDist = (mapY - p.y + (1 - stepY) / 2) / rayDirY;

      zBuffer[x] = perpWallDist;

      // Player Height Adjustment (Lowered by ~18% from 0.5 to 0.41)
      const camZ = 0.41 + p.z - (p.isCrouching ? 0.2 : 0);
      const lineHeight = Math.floor(SCREEN_HEIGHT / perpWallDist * WALL_HEIGHT_SCALE);
      const pitchOffset = p.pitch; 
      let drawStart = -lineHeight * (1 - camZ) + SCREEN_HEIGHT / 2 + pitchOffset;
      let drawEnd = lineHeight * camZ + SCREEN_HEIGHT / 2 + pitchOffset;

      let wallX; 
      if (side === 0) wallX = p.y + perpWallDist * rayDirY;
      else            wallX = p.x + perpWallDist * rayDirX;
      wallX -= Math.floor(wallX);

      let texX = Math.floor(wallX * TEXTURE_SIZE);
      if (side === 0 && rayDirX > 0) texX = TEXTURE_SIZE - texX - 1;
      if (side === 1 && rayDirY < 0) texX = TEXTURE_SIZE - texX - 1;

      let yStart = Math.max(0, Math.floor(drawStart));
      let yEnd = Math.min(SCREEN_HEIGHT - 1, Math.floor(drawEnd));

      for (let y = yStart; y < yEnd; y++) {
          const d = (y - pitchOffset - SCREEN_HEIGHT / 2 + lineHeight * (1 - camZ)) / lineHeight; 
          const texY = Math.floor(d * TEXTURE_SIZE) % TEXTURE_SIZE;
          const safeTexY = Math.max(0, Math.min(TEXTURE_SIZE-1, texY));
          
          let color = getTextureColor(wallType, texX, safeTexY, side);
          
          if (perpWallDist > 5) {
               const fog = Math.min(1, (perpWallDist - 5) / 20);
               if (fog > 0) {
                   const r = (color & 0xFF);
                   const g = (color >> 8) & 0xFF;
                   const b = (color >> 16) & 0xFF;
                   const fr = r * (1-fog) + 10 * fog;
                   const fg = g * (1-fog) + 15 * fog;
                   const fb = b * (1-fog) + 20 * fog;
                   color = (255 << 24) | (Math.floor(fb) << 16) | (Math.floor(fg) << 8) | Math.floor(fr);
               }
          }

          buffer[y * SCREEN_WIDTH + x] = color;
      }
    }
    
    ctx.putImageData(imgData, 0, 0);

    // --- SPRITES ---
    const spriteOrder = w.entities.map((e, i) => {
        return { 
            id: i, 
            dist: ((p.x - e.x) * (p.x - e.x) + (p.y - e.y) * (p.y - e.y)),
            type: e.type,
            x: e.x, y: e.y
        };
    }).sort((a, b) => b.dist - a.dist);

    for (const sprite of spriteOrder) {
        const spriteX = sprite.x - p.x;
        const spriteY = sprite.y - p.y;
        const invDet = 1.0 / (p.planeX * p.dirY - p.dirX * p.planeY);
        const transformX = invDet * (p.dirY * spriteX - p.dirX * spriteY);
        const transformY = invDet * (-p.planeY * spriteX + p.planeX * spriteY);

        if (transformY <= 0) continue;

        const spriteScreenX = Math.floor((SCREEN_WIDTH / 2) * (1 + transformX / transformY));
        const camZ = 0.41 + p.z - (p.isCrouching ? 0.2 : 0); // Matched player height
        const spriteHeight = Math.abs(Math.floor(SCREEN_HEIGHT / transformY));
        const pitchOffset = p.pitch;

        let drawStartY = -spriteHeight * (1 - camZ) + SCREEN_HEIGHT / 2 + pitchOffset;
        let drawEndY = spriteHeight * camZ + SCREEN_HEIGHT / 2 + pitchOffset;
        if (drawStartY < 0) drawStartY = 0;
        if (drawEndY >= SCREEN_HEIGHT) drawEndY = SCREEN_HEIGHT - 1;

        const spriteWidth = Math.abs(Math.floor(SCREEN_HEIGHT / transformY));
        let drawStartX = Math.floor(-spriteWidth / 2 + spriteScreenX);
        let drawEndX = spriteWidth / 2 + spriteScreenX;
        if (drawStartX < 0) drawStartX = 0;
        if (drawEndX >= SCREEN_WIDTH) drawEndX = SCREEN_WIDTH - 1;

        for (let stripe = drawStartX; stripe < drawEndX; stripe++) {
            if (transformY < zBuffer[stripe]) {
                 let r=255, g=255, b=255;
                 if (sprite.type === 'KEY') { r=234; g=179; b=8; } 
                 if (sprite.type === 'EXIT') { r=59; g=130; b=246; } 
                 
                 ctx.fillStyle = `rgb(${r},${g},${b})`;
                 let h = drawEndY - drawStartY;
                 let yS = drawStartY;
                 
                 if (sprite.type === 'KEY') {
                    yS += h * 0.4; h *= 0.2; 
                    if ((stripe + Date.now()/50)%20 < 10) ctx.fillStyle = '#fef08a';
                 }
                 ctx.fillRect(stripe, yS, 1, h);
            }
        }
    }
  };

  const loop = (time: number) => {
    update();
    draw();
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState]);

  return (
    <canvas 
        ref={canvasRef} 
        width={SCREEN_WIDTH} 
        height={SCREEN_HEIGHT} 
        onClick={handleCanvasClick}
        className="w-full h-full object-contain bg-slate-900 shadow-2xl cursor-crosshair"
    />
  );
};

export default GameCanvas;