import { createCanvas, registerFont } from 'canvas';
import fs from 'fs';
import path from 'path';

export const generateWhaleAlertImage = async (data) => {
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
  ctx.font = 'bold 40px Arial';
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
  ctx.font = '30px Arial';
  ctx.fillText(classificationClean.toUpperCase(), 60, 180);

  // Massive Amount
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 120px Arial';
  ctx.fillText(`${amount.toLocaleString()} STX`, 60, 300);

  // USD Amount
  ctx.fillStyle = '#94a3b8'; // slate-400
  ctx.font = '50px Arial';
  ctx.fillText(`≈ ${usdAmount}`, 60, 380);

  // From/To Details
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.strokeRect(60, 430, width - 120, 160);

  ctx.fillStyle = '#cbd5e1'; // slate-300
  ctx.font = '24px Arial';
  ctx.fillText('SENDER', 90, 470);
  ctx.fillStyle = '#ffffff';
  ctx.font = '30px Arial';
  ctx.fillText(sender, 90, 510);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '24px Arial';
  ctx.fillText('RECIPIENT', 600, 470);
  ctx.fillStyle = '#ffffff';
  ctx.font = '30px Arial';
  ctx.fillText(recipient, 600, 510);

  // Bottom Branding
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '20px Arial';
  ctx.fillText('stacks-whale-alert.vercel.app', 60, height - 60);

  // Save to buffer
  const buffer = canvas.toBuffer('image/png');
  const tempPath = outputPath || path.join(process.cwd(), `whale-alert-${Date.now()}.png`);
  fs.writeFileSync(tempPath, buffer);
  
  return tempPath;
};
