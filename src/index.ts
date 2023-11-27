import { Telegraf } from 'telegraf'
import { VercelRequest, VercelResponse } from '@vercel/node';
import { development, production } from './core';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN as string);

const ENVIRONMENT = process.env.NODE_ENV || '';

bot.on('message', (ctx) => {
  ctx.reply('Hi there')
});

// prod mode (Vercel)
export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
  await production(req, res, bot);
};

// dev mode
ENVIRONMENT !== 'production' && development(bot);
