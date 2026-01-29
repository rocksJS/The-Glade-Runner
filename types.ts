export enum GameState {
  MENU,
  PLAYING,
  GAME_OVER,
  VICTORY
}

export interface Player {
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  planeX: number;
  planeY: number;
  z: number; // Vertical height (0 is ground)
  pitch: number; // Looking up/down
  health: number;
  keysFound: number;
  isCrouching: boolean;
  isInLocker: boolean;
  isClimbing: boolean;
  noiseLevel: number; // 0 to 1
  moveSpeed: number;
  rotSpeed: number;
}

export interface Entity {
  id: number;
  type: 'GRIEVER' | 'KEY' | 'EXIT';
  x: number;
  y: number;
  state?: 'IDLE' | 'CHASE' | 'ATTACK';
  texture?: number;
}

export interface GameWorld {
  map: number[][];
  floorMap: number[][];
  ceilMap: number[][];
  entities: Entity[];
}