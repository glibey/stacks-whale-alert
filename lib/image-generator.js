import { createCanvas, registerFont } from 'canvas';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';

const FONT_FAMILY = 'WhaleAlertSans';
const fontPaths = {
  regular: [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
    '/usr/share/fonts/opentype/noto/NotoSans-Regular.ttf',
    '/System/Library/Fonts/Supplemental/Arial.ttf',
    '/System/Library/Fonts/Supplemental/Helvetica.ttc',
  ],
  bold: [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/opentype/noto/NotoSans-Bold.ttf',
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    '/System/Library/Fonts/Helvetica.ttc',
  ],
};

let fontsRegistered = false;
let hasRegisteredFontFamily = false;

const registerFirstAvailableFont = (candidates, weight) => {
  const fontPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!fontPath) {
    return false;
  }

  registerFont(fontPath, { family: FONT_FAMILY, weight });
  return true;
};

const ensureFontsRegistered = () => {
  if (fontsRegistered) {
    return;
  }

  const regularRegistered = registerFirstAvailableFont(fontPaths.regular, 'normal');
  const boldRegistered = registerFirstAvailableFont(fontPaths.bold, 'bold');
  hasRegisteredFontFamily = regularRegistered || boldRegistered;

  if (!hasRegisteredFontFamily) {
    console.warn('[image] No explicit font file found, falling back to canvas sans-serif');
  }

  fontsRegistered = true;
};

const fontFamily = () => (hasRegisteredFontFamily ? `'${FONT_FAMILY}', sans-serif` : 'sans-serif');
const setFont = (ctx, size, weight = 'normal') => {
  ctx.font = `${weight} ${size}px ${fontFamily()}`;
};

export const generateWhaleAlertImage = async (data) => {
  ensureFontsRegistered();

  const width = 1200;
  const height = 675; // 16:9 aspect ratio for X
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background - Dark Gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#0f172a'); // slate-900
  grad.addColorStop(1, '#1e293b'); // slate-800
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle circles for texture
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.beginPath();
  ctx.arc(width * 0.8, height * 0.2, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width * 0.1, height * 0.8, 150, 0, Math.PI * 2);
  ctx.fill();

  // Draw Border/Frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 20;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // Logo/Title
  ctx.fillStyle = '#f8fafc';
  setFont(ctx, 40, 'bold');
  ctx.fillText('STX WHALE ALERT', 60, 80);

  // Divider
  ctx.strokeStyle = '#3b82f6'; // blue-500
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(60, 100);
  ctx.lineTo(200, 100);
  ctx.stroke();

  // Data Section
  const { amount, classification, usdAmount, sender, recipient, outputPath } = data;

  // Classification Header
  const classificationClean = classification.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
  ctx.fillStyle = '#60a5fa'; // blue-400
  setFont(ctx, 30);
  ctx.fillText(classificationClean.toUpperCase(), 60, 180);

  // Massive Amount
  ctx.fillStyle = '#ffffff';
  setFont(ctx, 120, 'bold');
  ctx.fillText(`${amount.toLocaleString()} STX`, 60, 300);

  // USD Amount
  ctx.fillStyle = '#94a3b8'; // slate-400
  setFont(ctx, 50);
  ctx.fillText(`≈ ${usdAmount}`, 60, 380);

  // From/To Details
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.strokeRect(60, 430, width - 120, 160);

  ctx.fillStyle = '#cbd5e1'; // slate-300
  setFont(ctx, 24);
  ctx.fillText('SENDER', 90, 470);
  ctx.fillStyle = '#ffffff';
  setFont(ctx, 30);
  ctx.fillText(sender, 90, 510);

  ctx.fillStyle = '#cbd5e1';
  setFont(ctx, 24);
  ctx.fillText('RECIPIENT', 600, 470);
  ctx.fillStyle = '#ffffff';
  setFont(ctx, 30);
  ctx.fillText(recipient, 600, 510);

  // Bottom Branding
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  setFont(ctx, 20);
  ctx.fillText('stacks-whale-alert.vercel.app', 60, height - 60);

  // Save to buffer
  const buffer = canvas.toBuffer('image/png');
  const tempPath = outputPath || path.join(os.tmpdir(), `whale-alert-${randomUUID()}.png`);
  fs.writeFileSync(tempPath, buffer);
  
  return tempPath;
};
