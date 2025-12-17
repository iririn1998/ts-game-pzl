/**
 * Squash Game
 * TypeScript implementation using src/libs
 */

import "./style.css";
import bgImage from "./assets/image/bg.png";
import seSound from "./assets/sound/se.m4a";
import {
  canvasSize,
  createContext,
  drawImg,
  fRect,
  fText,
  type GameContext,
  lineW,
  loadImg,
  loadSound,
  playSE,
  rnd,
  sCir,
  setAlpha,
  sRect,
  startGame,
} from "./libs";

// ゲーム変数
let ballX = 600;
let ballY = 300;
let ballXp = 0;
let ballYp = 0;
let barX = 600;
const barY = 700;
let score = 0;
let scene = 0;

/**
 * 起動時の処理
 */
function setup(ctx: GameContext): void {
  canvasSize(ctx, 1200, 800);
  lineW(ctx, 3);
  loadImg(ctx, 0, bgImage);
  loadSound(ctx, 0, seSound);
}

/**
 * メインループ
 */
function mainloop(ctx: GameContext): void {
  // 背景画像
  drawImg(ctx, 0, 0, 0);

  // 半透明の黒い矩形
  setAlpha(ctx, 50);
  fRect(ctx, 250, 50, 700, 750, "black");
  setAlpha(ctx, 100);

  // 枠線
  sRect(ctx, 250, 50, 700, 760, "silver");

  // スコア表示
  fText(ctx, `SCORE ${score}`, 600, 25, 36, "white");

  // ボール
  sCir(ctx, ballX, ballY, 10, "lime");

  // バー
  sRect(ctx, barX - 50, barY - 10, 100, 20, "violet");

  if (scene === 0) {
    // タイトル画面
    fText(ctx, "Squash Game", 600, 200, 48, "cyan");
    fText(ctx, "Click to start!", 600, 600, 36, "gold");

    if (ctx.input.tapC === 1) {
      ballX = 600;
      ballY = 300;
      ballXp = 12;
      ballYp = 8;
      score = 0;
      scene = 1;
    }
  } else if (scene === 1) {
    // ゲームをプレイ中
    ballX = ballX + ballXp;
    ballY = ballY + ballYp;

    // 壁との衝突判定
    if (ballX <= 260 || ballX >= 940) {
      ballXp = -ballXp;
    }
    if (ballY <= 60) {
      ballYp = 8 + rnd(8);
    }
    if (ballY > 800) {
      scene = 2;
    }

    // バーの位置をマウス/タッチ位置に追従
    barX = ctx.input.tapX;
    if (barX < 300) barX = 300;
    if (barX > 900) barX = 900;

    // バーとボールの衝突判定
    if (barX - 60 < ballX && ballX < barX + 60 && barY - 30 < ballY && ballY < barY - 10) {
      ballYp = -8 - rnd(8);
      score = score + 100;
      playSE(ctx, 0);
    }
  } else if (scene === 2) {
    // ゲームオーバー
    fText(ctx, "GAME OVER", 600, 400, 36, "red");

    if (ctx.input.tapC === 1) {
      scene = 0;
      ctx.input.tapC = 0;
    }
  }
}

// ゲームコンテキストを作成して開始
const gameContext = createContext({
  canvasId: "canvas",
  width: 1200,
  height: 800,
  fps: 30,
  soundOn: true,
  debug: false,
});

if (gameContext) {
  startGame(gameContext, setup, mainloop);
}
