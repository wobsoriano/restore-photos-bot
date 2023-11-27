import { Telegraf } from 'telegraf'
import { VercelRequest, VercelResponse } from '@vercel/node';
import { message } from 'telegraf/filters'
import { development, production } from './core';
import { restore } from './commands';

const bot = new Telegraf(process.env.BOT_TOKEN as string);

const ENVIRONMENT = process.env.NODE_ENV || '';

bot.on(message('text'), async (ctx) => {
  await ctx.reply('Hi there')
});

bot.on(message('photo'), restore());

// prod mode (Vercel)
export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
  await production(req, res, bot);
};

// dev mode
ENVIRONMENT !== 'production' && development(bot);
