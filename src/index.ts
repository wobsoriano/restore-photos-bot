import { Scenes, Telegraf, session } from 'telegraf';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { development, production } from './core';

import {
	RestorePhotoContext,
	buyCreditsWizard,
	restorePhotoWizard,
} from './wizards';
import { addCredits } from './lib/user';

const bot = new Telegraf<RestorePhotoContext>(process.env.BOT_TOKEN as string);

const ENVIRONMENT = process.env.NODE_ENV || '';

const stage = new Scenes.Stage<RestorePhotoContext>(
	// @ts-expect-error: TODO: Multiple wizards type
	[restorePhotoWizard, buyCreditsWizard],
	{
		default: 'restore-photo-wizard',
	},
);

bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true));
bot.on('successful_payment', (ctx) => {
	const {
		from: { id: telegramId },
		successful_payment
	} = ctx.update.message

	if (successful_payment) {
		const { credits } = JSON.parse(successful_payment.invoice_payload)
		addCredits(telegramId, credits)
	}
});

bot.use(session());

bot.use(stage.middleware());

bot.command('start', (ctx) => ctx.scene.enter('restore-photo-wizard'));
bot.command('cancel', (ctx) => ctx.scene.enter('restore-photo-wizard'))
bot.on('message', (ctx) => ctx.reply('Try /start'));

// prod mode (Vercel)
export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
	await production(req, res, bot);
};

// dev mode
ENVIRONMENT !== 'production' && development(bot);
