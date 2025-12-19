/**
 * 落ち物パズルゲーム
 * TypeScript版 - WWS.jsを使わずsrc/libsを使用
 */

import "./style.css";

import {
  createContext,
  drawImg,
  drawImgC,
  fText,
  fTextN,
  lineW,
  loadImg,
  loadSound,
  playBgm,
  playSE,
  sCir,
  setAlpha,
  startGame,
  stopBgm,
  type GameContext,
} from "./libs";
import { int, rnd } from "./libs/utils";

// ========== アセットのインポート ==========
import bgImg from "./assets/image/bg.png";
import takoImg from "./assets/image/tako.png";
import wakameImg from "./assets/image/wakame.png";
import kurageImg from "./assets/image/kurage.png";
import sakanaImg from "./assets/image/sakana.png";
import uniImg from "./assets/image/uni.png";
import ikaImg from "./assets/image/ika.png";
import titleImg from "./assets/image/title.png";
import bgmSound from "./assets/sound/bgm.m4a";
import seSound from "./assets/sound/se.m4a";

// ========== 型定義 ==========

/** ゲームの状態 */
type GameState = {
  /** ゲームインデックス（0: タイトル, 1: プレイ中, 2: ゲームオーバー） */
  idx: number;
  /** タイマー */
  tmr: number;
};

/** パズルの状態 */
type PuzzleState = {
  /** マス目（13x9の二次元配列） */
  masu: number[][];
  /** 消すブロックの判定用配列 */
  kesu: number[][];
  /** プレイヤーが動かすブロック（0-2: 現在、3-5: 次） */
  block: number[];
  /** ブロックのX座標 */
  myBlockX: number;
  /** ブロックのY座標 */
  myBlockY: number;
  /** 落下速度 */
  dropSpd: number;
  /** 処理の流れを管理 */
  gameProc: number;
  /** 時間の進行を管理 */
  gameTime: number;
  /** ハイスコア */
  hisco: number;
  /** スコア */
  score: number;
  /** 連鎖回数 */
  rensa: number;
  /** ブロックを消した時の得点 */
  points: number;
  /** ブロックを消す演出時間 */
  eftime: number;
  /** エクステンドタイム */
  extend: number;
  /** タップ操作用のキー */
  tapKey: number[];
};

/** エフェクトの状態 */
type EffectState = {
  /** エフェクトのX座標 */
  effX: number[];
  /** エフェクトのY座標 */
  effY: number[];
  /** エフェクトの時間 */
  effT: number[];
  /** 現在のエフェクトインデックス */
  effN: number;
};

// ========== 定数 ==========

/** キャンバスサイズ */
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 1200;

/** キーコード */
const K_SPACE = 32;
const K_LEFT = 37;
const K_DOWN = 40;
const K_RIGHT = 39;

/** エフェクト最大数 */
const EFF_MAX = 100;

/** 虹色のカラー配列 */
const RAINBOW: string[] = [
  "#ff0000",
  "#e08000",
  "#c0e000",
  "#00ff00",
  "#00c0e0",
  "#0040ff",
  "#8000e0",
  "#ff00ff",
];

/** ブロック画像のURL配列 */
const BLOCK_IMAGES = [takoImg, wakameImg, kurageImg, sakanaImg, uniImg, ikaImg];

// ========== グローバル状態 ==========

/** ゲーム状態 */
const gameState: GameState = {
  idx: 0,
  tmr: 0,
};

/** パズル状態 */
const puzzleState: PuzzleState = {
  masu: [],
  kesu: [],
  block: [0, 0, 0, 1, 2, 3],
  myBlockX: 4,
  myBlockY: 1,
  dropSpd: 90,
  gameProc: 0,
  gameTime: 0,
  hisco: 5000,
  score: 0,
  rensa: 0,
  points: 0,
  eftime: 0,
  extend: 0,
  tapKey: [0, 0, 0, 0],
};

/** エフェクト状態 */
const effectState: EffectState = {
  effX: new Array(EFF_MAX).fill(0),
  effY: new Array(EFF_MAX).fill(0),
  effT: new Array(EFF_MAX).fill(0),
  effN: 0,
};

// ========== 初期化関数 ==========

/**
 * マス目を初期化
 */
const clrBlock = (): void => {
  // 二次元配列の作成
  puzzleState.masu = [];
  puzzleState.kesu = [];

  for (let y = 0; y < 13; y++) {
    puzzleState.masu[y] = new Array(9).fill(-1);
    puzzleState.kesu[y] = new Array(9).fill(0);
  }

  // 内側を0で埋める
  for (let y = 1; y <= 11; y++) {
    for (let x = 1; x <= 7; x++) {
      puzzleState.masu[y][x] = 0;
      puzzleState.kesu[y][x] = 0;
    }
  }
};

/**
 * 変数の初期化
 */
const initVar = (): void => {
  puzzleState.myBlockX = 4;
  puzzleState.myBlockY = 1;
  puzzleState.dropSpd = 90;

  // 現在のブロック
  puzzleState.block[0] = 1;
  puzzleState.block[1] = 2;
  puzzleState.block[2] = 3;

  // 次のブロック
  puzzleState.block[3] = 2;
  puzzleState.block[4] = 3;
  puzzleState.block[5] = 4;

  puzzleState.gameProc = 0;
  puzzleState.gameTime = 30 * 60 * 3; // 約3分
  puzzleState.score = 0;
};

// ========== エフェクト関数 ==========

/**
 * エフェクトをセット
 */
const setEffect = (x: number, y: number): void => {
  effectState.effX[effectState.effN] = x;
  effectState.effY[effectState.effN] = y;
  effectState.effT[effectState.effN] = 20;
  effectState.effN = (effectState.effN + 1) % EFF_MAX;
};

/**
 * エフェクトを描画
 */
const drawEffect = (ctx: GameContext): void => {
  lineW(ctx, 20);
  for (let i = 0; i < EFF_MAX; i++) {
    if (effectState.effT[i] > 0) {
      setAlpha(ctx, effectState.effT[i] * 5);
      sCir(
        ctx,
        effectState.effX[i],
        effectState.effY[i],
        110 - effectState.effT[i] * 5,
        RAINBOW[(effectState.effT[i] + 0) % 8]
      );
      sCir(
        ctx,
        effectState.effX[i],
        effectState.effY[i],
        90 - effectState.effT[i] * 4,
        RAINBOW[(effectState.effT[i] + 1) % 8]
      );
      sCir(
        ctx,
        effectState.effX[i],
        effectState.effY[i],
        70 - effectState.effT[i] * 3,
        RAINBOW[(effectState.effT[i] + 2) % 8]
      );
      effectState.effT[i]--;
    }
  }
  setAlpha(ctx, 100);
  lineW(ctx, 1);
};

// ========== 描画関数 ==========

/**
 * タイトル画面を描画
 */
const drawTitle = (ctx: GameContext): void => {
  // 背景
  drawImg(ctx, 0, 0, 0);

  // ハイスコアのみ表示
  fTextN(ctx, `HI-SC\n${puzzleState.hisco}`, 800, 840, 70, 60, "white");
};

/**
 * ゲーム画面を描画
 */
const drawPzl = (ctx: GameContext): void => {
  // 背景
  drawImg(ctx, 0, 0, 0);

  // 次のブロック
  for (let x = 0; x < 3; x++) {
    drawImg(ctx, puzzleState.block[3 + x], 672 + 80 * x, 50);
  }

  // UI表示
  fTextN(ctx, `TIME\n${puzzleState.gameTime}`, 800, 280, 70, 60, "white");
  fTextN(ctx, `SCORE\n${puzzleState.score}`, 800, 560, 70, 60, "white");
  fTextN(ctx, `HI-SC\n${puzzleState.hisco}`, 800, 840, 70, 60, "white");

  // マス目上のブロック
  for (let y = 1; y <= 11; y++) {
    for (let x = 1; x <= 7; x++) {
      if (puzzleState.masu[y][x] > 0) {
        drawImgC(ctx, puzzleState.masu[y][x], 80 * x, 80 * y);
      }
    }
  }

  // プレイヤーが動かすブロック
  if (puzzleState.gameProc === 0) {
    for (let x = -1; x <= 1; x++) {
      drawImgC(
        ctx,
        puzzleState.block[1 + x],
        80 * (puzzleState.myBlockX + x),
        80 * puzzleState.myBlockY - 2
      );
    }
  }

  // 消す処理中の表示
  if (puzzleState.gameProc === 3) {
    fText(
      ctx,
      `${puzzleState.points}pts`,
      320,
      120,
      50,
      RAINBOW[gameState.tmr % 8]
    );
    if (puzzleState.extend > 0) {
      fText(
        ctx,
        `TIME+${puzzleState.extend}!`,
        320,
        240,
        50,
        RAINBOW[gameState.tmr % 8]
      );
    }
  }
};

// ========== ゲーム処理関数 ==========

/**
 * ゲーム中の処理
 * @returns ゲームタイム（0でゲームオーバー）
 */
const procPzl = (ctx: GameContext): number => {
  // タップ操作
  if (
    ctx.input.tapC > 0 &&
    960 < ctx.input.tapY &&
    ctx.input.tapY < 1200
  ) {
    const c = int(ctx.input.tapX / 240);
    if (0 <= c && c <= 3) {
      puzzleState.tapKey[c]++;
    }
  } else {
    for (let i = 0; i < 4; i++) {
      puzzleState.tapKey[i] = 0;
    }
  }

  switch (puzzleState.gameProc) {
    case 0: // ブロックの移動
      if (gameState.tmr < 10) break;

      // キーでの操作
      if (ctx.input.key[K_LEFT] === 1 || ctx.input.key[K_LEFT] > 4) {
        ctx.input.key[K_LEFT]++;
        if (puzzleState.masu[puzzleState.myBlockY][puzzleState.myBlockX - 2] === 0) {
          puzzleState.myBlockX--;
        }
      }
      if (ctx.input.key[K_RIGHT] === 1 || ctx.input.key[K_RIGHT] > 4) {
        ctx.input.key[K_RIGHT]++;
        if (puzzleState.masu[puzzleState.myBlockY][puzzleState.myBlockX + 2] === 0) {
          puzzleState.myBlockX++;
        }
      }
      if (ctx.input.key[K_SPACE] === 1 || ctx.input.key[K_SPACE] > 4) {
        ctx.input.key[K_SPACE]++;
        // ブロックの入れ替え
        const temp = puzzleState.block[2];
        puzzleState.block[2] = puzzleState.block[1];
        puzzleState.block[1] = puzzleState.block[0];
        puzzleState.block[0] = temp;
      }

      // タップでの操作
      if (puzzleState.tapKey[0] === 1 || puzzleState.tapKey[0] > 8) {
        if (puzzleState.masu[puzzleState.myBlockY][puzzleState.myBlockX - 2] === 0) {
          puzzleState.myBlockX--;
        }
      }
      if (puzzleState.tapKey[2] === 1 || puzzleState.tapKey[2] > 8) {
        if (puzzleState.masu[puzzleState.myBlockY][puzzleState.myBlockX + 2] === 0) {
          puzzleState.myBlockX++;
        }
      }
      if (puzzleState.tapKey[3] === 1 || puzzleState.tapKey[3] > 8) {
        // ブロックの入れ替え
        const temp = puzzleState.block[2];
        puzzleState.block[2] = puzzleState.block[1];
        puzzleState.block[1] = puzzleState.block[0];
        puzzleState.block[0] = temp;
      }

      // 下に落とす
      if (
        puzzleState.gameTime % puzzleState.dropSpd === 0 ||
        ctx.input.key[K_DOWN] > 0 ||
        puzzleState.tapKey[1] > 1
      ) {
        const belowSum =
          puzzleState.masu[puzzleState.myBlockY + 1][puzzleState.myBlockX - 1] +
          puzzleState.masu[puzzleState.myBlockY + 1][puzzleState.myBlockX] +
          puzzleState.masu[puzzleState.myBlockY + 1][puzzleState.myBlockX + 1];

        if (belowSum === 0) {
          puzzleState.myBlockY++;
        } else {
          // ブロックをマス目上に置く
          puzzleState.masu[puzzleState.myBlockY][puzzleState.myBlockX - 1] =
            puzzleState.block[0];
          puzzleState.masu[puzzleState.myBlockY][puzzleState.myBlockX] =
            puzzleState.block[1];
          puzzleState.masu[puzzleState.myBlockY][puzzleState.myBlockX + 1] =
            puzzleState.block[2];
          puzzleState.rensa = 1;
          puzzleState.gameProc = 1;
        }
      }
      break;

    case 1: // 下のマスが空いているブロックを落とす
      {
        let dropped = 0;
        for (let y = 10; y >= 1; y--) {
          for (let x = 1; x <= 7; x++) {
            if (
              puzzleState.masu[y][x] > 0 &&
              puzzleState.masu[y + 1][x] === 0
            ) {
              puzzleState.masu[y + 1][x] = puzzleState.masu[y][x];
              puzzleState.masu[y][x] = 0;
              dropped = 1;
            }
          }
        }
        if (dropped === 0) {
          puzzleState.gameProc = 2;
        }
      }
      break;

    case 2: // ブロックが揃ったかの判定
      {
        for (let y = 1; y <= 11; y++) {
          for (let x = 1; x <= 7; x++) {
            const c = puzzleState.masu[y][x];
            if (c > 0) {
              // 縦に揃っている
              if (
                c === puzzleState.masu[y - 1][x] &&
                c === puzzleState.masu[y + 1][x]
              ) {
                puzzleState.kesu[y][x] = 1;
                puzzleState.kesu[y - 1][x] = 1;
                puzzleState.kesu[y + 1][x] = 1;
              }
              // 横に揃っている
              if (
                c === puzzleState.masu[y][x - 1] &&
                c === puzzleState.masu[y][x + 1]
              ) {
                puzzleState.kesu[y][x] = 1;
                puzzleState.kesu[y][x - 1] = 1;
                puzzleState.kesu[y][x + 1] = 1;
              }
              // 斜め／に揃っている
              if (
                c === puzzleState.masu[y + 1][x - 1] &&
                c === puzzleState.masu[y - 1][x + 1]
              ) {
                puzzleState.kesu[y][x] = 1;
                puzzleState.kesu[y + 1][x - 1] = 1;
                puzzleState.kesu[y - 1][x + 1] = 1;
              }
              // 斜め＼に揃っている
              if (
                c === puzzleState.masu[y - 1][x - 1] &&
                c === puzzleState.masu[y + 1][x + 1]
              ) {
                puzzleState.kesu[y][x] = 1;
                puzzleState.kesu[y - 1][x - 1] = 1;
                puzzleState.kesu[y + 1][x + 1] = 1;
              }
            }
          }
        }

        // 揃ったブロックを数える
        let n = 0;
        for (let y = 1; y <= 11; y++) {
          for (let x = 1; x <= 7; x++) {
            if (puzzleState.kesu[y][x] === 1) {
              n++;
              setEffect(80 * x, 80 * y);
            }
          }
        }

        // 揃った時のスコア計算
        if (n > 0) {
          playSE(ctx, 1);
          if (puzzleState.rensa === 1 && puzzleState.dropSpd > 5) {
            puzzleState.dropSpd--;
          }
          puzzleState.points = 50 * n * puzzleState.rensa;
          puzzleState.score += puzzleState.points;
          if (puzzleState.score > puzzleState.hisco) {
            puzzleState.hisco = puzzleState.score;
          }
          puzzleState.extend = 0;
          if (n % 5 === 0) {
            puzzleState.extend = 300;
          }
          puzzleState.gameTime += puzzleState.extend;
          puzzleState.rensa = puzzleState.rensa * 2;
          puzzleState.eftime = 0;
          puzzleState.gameProc = 3;
        } else {
          puzzleState.myBlockX = 4;
          puzzleState.myBlockY = 1;

          // ブロックが最上段にある
          const topSum =
            puzzleState.masu[puzzleState.myBlockY][puzzleState.myBlockX - 1] +
            puzzleState.masu[puzzleState.myBlockY][puzzleState.myBlockX] +
            puzzleState.masu[puzzleState.myBlockY][puzzleState.myBlockX + 1];
          if (topSum > 0) {
            return 0;
          }

          // 次のブロックをセット
          puzzleState.block[0] = puzzleState.block[3];
          puzzleState.block[1] = puzzleState.block[4];
          puzzleState.block[2] = puzzleState.block[5];

          // ブロックの種類を決定
          let blockTypes = 4;
          if (puzzleState.score > 10000) blockTypes = 5;
          if (puzzleState.score > 20000) blockTypes = 6;

          puzzleState.block[3] = 1 + rnd(blockTypes);
          puzzleState.block[4] = 1 + rnd(blockTypes);
          puzzleState.block[5] = 1 + rnd(blockTypes);

          puzzleState.gameProc = 0;
          gameState.tmr = 0;
        }
      }
      break;

    case 3: // ブロックを消す処理
      puzzleState.eftime++;
      if (puzzleState.eftime === 20) {
        for (let y = 1; y <= 11; y++) {
          for (let x = 1; x <= 7; x++) {
            if (puzzleState.kesu[y][x] === 1) {
              puzzleState.kesu[y][x] = 0;
              puzzleState.masu[y][x] = 0;
            }
          }
        }
        puzzleState.gameProc = 1;
      }
      break;
  }

  puzzleState.gameTime--;
  return puzzleState.gameTime;
};

// ========== セットアップ ==========

/**
 * 起動時の処理
 */
const setup = (ctx: GameContext): void => {
  clrBlock();

  // 画像の読み込み（インポートしたアセットURLを使用）
  loadImg(ctx, 0, bgImg);
  for (let i = 0; i < 6; i++) {
    loadImg(ctx, 1 + i, BLOCK_IMAGES[i]);
  }
  loadImg(ctx, 7, titleImg);

  // サウンドの読み込み（インポートしたアセットURLを使用）
  loadSound(ctx, 0, bgmSound);
  loadSound(ctx, 1, seSound);
};

// ========== メインループ ==========

/**
 * メインループ
 */
const mainloop = (ctx: GameContext): void => {
  gameState.tmr++;

  switch (gameState.idx) {
    case 0: // タイトル画面
      drawTitle(ctx);
      drawImgC(ctx, 7, 480, 400);
      if (gameState.tmr % 40 < 20) {
        fText(ctx, "TAP TO START.", 480, 680, 80, "pink");
      }
      if (ctx.input.key[K_SPACE] > 0 || ctx.input.tapC > 0) {
        clrBlock();
        initVar();
        playBgm(ctx, 0);
        gameState.idx = 1;
        gameState.tmr = 0;
      }
      break;

    case 1: // ゲームをプレイ
      drawPzl(ctx);
      drawEffect(ctx);
      if (procPzl(ctx) === 0) {
        stopBgm(ctx);
        gameState.idx = 2;
        gameState.tmr = 0;
      }
      break;

    case 2: // ゲームオーバー
      drawPzl(ctx);
      drawEffect(ctx);
      fText(ctx, "GAME OVER", 480, 420, 100, "violet");
      if (gameState.tmr > 30 * 5) {
        gameState.idx = 0;
      }
      break;
  }
};

// ========== ゲーム開始 ==========

const gameContext = createContext({
  canvasId: "canvas",
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  fps: 30,
  soundOn: true,
  debug: false,
});

if (gameContext) {
  startGame(gameContext, setup, mainloop);
}

