export const SCREEN_WIDTH = 640;
export const SCREEN_HEIGHT = 480;
export const FOV = 0.86; // Increased by ~30% (was 0.66)
export const WALL_HEIGHT_SCALE = 4.0; 

// Map Codes: 
// 0: Empty
// 1: Concrete Wall
// 2: Mossy Wall
// 3: Vine Wall (Climbable)
// 4: Locker (Start)
// 5: Trap (Spikes)

export const MAP_SIZE = 80; // Significantly larger (was 24)
export const TOTAL_KEYS = 3;

// RGB colors for rendering
export const COLORS = {
  ground: [30, 41, 59], // Slate 800
  ceiling: [15, 23, 42], // Slate 900
  wall: [71, 85, 105], // Slate 600
  wallDark: [51, 65, 85], // Slate 700
  vine: [21, 128, 61], // Green 600
  locker: [60, 60, 60], // Dark metal
  trap: [127, 29, 29], // Red 900
  griever: [0, 0, 0], // Pure black
  key: [234, 179, 8], // Yellow 500
  exit: [59, 130, 246], // Blue 500
};

// Procedural Generation
const generateLevel = () => {
    const size = MAP_SIZE;
    // 1. Fill with walls
    const map = Array.from({ length: size }, () => Array(size).fill(1));
    
    // 2. Maze Generation (Recursive Backtracker for guaranteed solvability)
    const stack: [number, number][] = [];
    const startX = Math.floor(size / 2);
    const startY = Math.floor(size / 2);
    
    // Helper to check bounds and wall
    const isValid = (x: number, y: number) => x > 0 && x < size - 1 && y > 0 && y < size - 1;

    const visit = (x: number, y: number) => {
        map[x][y] = 0;
        // Randomize directions: Up, Down, Left, Right (step 2)
        const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]].sort(() => Math.random() - 0.5);
        
        for (const [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            if (isValid(nx, ny) && map[nx][ny] === 1) {
                map[x + dx / 2][y + dy / 2] = 0; // Carve path between
                visit(nx, ny);
            }
        }
    };
    
    visit(startX, startY);

    // 3. Set Center Locker
    map[startX][startY] = 4;
    
    // 4. Add Loops (remove some walls to make it less linear)
    for (let i = 0; i < size * 5; i++) {
        const rx = Math.floor(Math.random() * (size - 2)) + 1;
        const ry = Math.floor(Math.random() * (size - 2)) + 1;
        if (map[rx][ry] === 1) {
             let emptyNeighbors = 0;
             if (map[rx+1][ry] === 0) emptyNeighbors++;
             if (map[rx-1][ry] === 0) emptyNeighbors++;
             if (map[rx][ry+1] === 0) emptyNeighbors++;
             if (map[rx][ry-1] === 0) emptyNeighbors++;
             
             // If it connects two separate paths, remove it
             if (emptyNeighbors >= 2) map[rx][ry] = 0;
        }
    }

    // 5. Add Vines (Climbable walls)
    for(let x=1; x<size-1; x++) {
        for(let y=1; y<size-1; y++) {
            if(map[x][y] === 1 && Math.random() > 0.9) {
                let hasSpace = false;
                 if(map[x+1][y] === 0) hasSpace = true;
                 if(map[x-1][y] === 0) hasSpace = true;
                 if(map[x][y+1] === 0) hasSpace = true;
                 if(map[x][y-1] === 0) hasSpace = true;
                 if(hasSpace) map[x][y] = 3;
            }
        }
    }

    // 6. Generate Entities
    const entities = [];
    
    // Place Keys (Far from center)
    let keysPlaced = 0;
    while(keysPlaced < TOTAL_KEYS) {
        const rx = Math.floor(Math.random() * (size - 2)) + 1;
        const ry = Math.floor(Math.random() * (size - 2)) + 1;
        const dist = Math.hypot(rx - startX, ry - startY);
        if (map[rx][ry] === 0 && dist > size / 3) {
            entities.push({ id: keysPlaced + 1, type: 'KEY', x: rx + 0.5, y: ry + 0.5 });
            keysPlaced++;
        }
    }

    // Place Exit (Very far)
    let exitPlaced = false;
    while(!exitPlaced) {
         const rx = Math.floor(Math.random() * (size - 2)) + 1;
         const ry = Math.floor(Math.random() * (size - 2)) + 1;
         const dist = Math.hypot(rx - startX, ry - startY);
         // Exit acts as a gap in the wall or an object. 
         // Let's make it an object for now, or a special wall type?
         // In current renderer, EXIT is an entity sprite.
         if (map[rx][ry] === 0 && dist > size / 2.2) {
             entities.push({ id: 99, type: 'EXIT', x: rx + 0.5, y: ry + 0.5 });
             exitPlaced = true;
         }
    }

    return {
        map,
        entities,
        spawn: { x: startX + 0.5, y: startY + 0.5 }
    };
};

const levelData = generateLevel();
export const INITIAL_MAP = levelData.map;
export const INITIAL_ENTITIES = levelData.entities;
export const SPAWN_POS = levelData.spawn;