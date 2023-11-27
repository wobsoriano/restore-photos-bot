import { Scenes, Telegraf, session } from 'telegraf';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { development, production } from './core';

import { RestorePhotoContext, restorePhotoWizard } from './wizards';

const bot = new Telegraf<RestorePhotoContext>(process.env.BOT_TOKEN as string);

const ENVIRONMENT = process.env.NODE_ENV || '';

const stage = new Scenes.Stage<RestorePhotoContext>([restorePhotoWizard], {
	default: 'restore-photo-wizard',
});

bot.use(session());
bot.use(stage.middleware());

bot.command('start', (ctx) => ctx.scene.enter('restore-photo-wizard'));
bot.command('cancel', (ctx) => ctx.scene.leave());

// bot.command('pay', (ctx) => {
//   ctx.sendInvoice()
// })

bot.on('message', (ctx) => ctx.reply('Try /start'));

// prod mode (Vercel)
export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
	await production(req, res, bot);
};

// dev mode
ENVIRONMENT !== 'production' && development(bot);
