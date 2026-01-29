export const SCREEN_WIDTH = 640;
export const SCREEN_HEIGHT = 480;
export const FOV = 1.032; 
export const WALL_HEIGHT_SCALE = 5.0; // Higher walls for more looming feel

export const MAP_SIZE = 120;
export const TOTAL_KEYS = 3;

// Desaturated Horror Colors (Matching the image vibe)
export const COLORS = {
  ground: [18, 22, 25], 
  ceiling: [25, 28, 32], 
  wall: [45, 48, 52], 
  wallDark: [30, 32, 35],
  vine: [40, 50, 45], // Dark, almost grey-green
  locker: [20, 22, 25],
  trap: [40, 20, 20], 
  griever: [0, 0, 0], 
  key: [180, 180, 150], // Dull metallic
  exit: [100, 110, 130], // Cold grey-blue
};

const generateLevel = () => {
    const size = MAP_SIZE;
    const map = Array.from({ length: size }, () => Array(size).fill(1));
    const startX = Math.floor(size / 2);
    const startY = Math.floor(size / 2);
    const isValid = (x: number, y: number) => x > 2 && x < size - 3 && y > 2 && y < size - 3;

    const carve = (x: number, y: number) => {
        for(let ix = -1; ix <= 1; ix++) {
            for(let iy = -1; iy <= 1; iy++) {
                if (x + ix >= 0 && x + ix < size && y + iy >= 0 && y + iy < size) {
                    map[x + ix][y + iy] = 0;
                }
            }
        }
    };

    const visit = (x: number, y: number) => {
        carve(x, y);
        const dirs = [[0, -4], [0, 4], [-4, 0], [4, 0]].sort(() => Math.random() - 0.5);
        for (const [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            if (isValid(nx, ny) && map[nx][ny] === 1) {
                carve(x + dx / 2, y + dy / 2);
                carve(x + dx / 4, y + dy / 4);
                carve(x + 3 * dx / 4, y + 3 * dy / 4);
                visit(nx, ny);
            }
        }
    };
    
    visit(startX, startY);
    map[startX][startY] = 4;
    
    for (let i = 0; i < size * 3; i++) {
        const rx = Math.floor(Math.random() * (size - 6)) + 3;
        const ry = Math.floor(Math.random() * (size - 6)) + 3;
        if (map[rx][ry] === 1) {
             let emptyNeighbors = 0;
             if (map[rx+1][ry] === 0) emptyNeighbors++;
             if (map[rx-1][ry] === 0) emptyNeighbors++;
             if (map[rx][ry+1] === 0) emptyNeighbors++;
             if (map[rx][ry-1] === 0) emptyNeighbors++;
             if (emptyNeighbors >= 2) {
                 map[rx][ry] = 0;
                 map[rx+1][ry] = 0;
                 map[rx][ry+1] = 0;
             }
        }
    }

    for(let x=1; x<size-1; x++) {
        for(let y=1; y<size-1; y++) {
            if(map[x][y] === 1 && Math.random() > 0.9) {
                map[x][y] = (Math.random() > 0.5) ? 2 : 3;
            }
        }
    }

    const entities = [];
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

    let exitPlaced = false;
    while(!exitPlaced) {
         const rx = Math.floor(Math.random() * (size - 2)) + 1;
         const ry = Math.floor(Math.random() * (size - 2)) + 1;
         const dist = Math.hypot(rx - startX, ry - startY);
         if (map[rx][ry] === 0 && dist > size / 2.1) {
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