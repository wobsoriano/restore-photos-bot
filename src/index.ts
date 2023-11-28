import { Scenes, Telegraf, session } from 'telegraf';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { development, production } from './core';

import { RestorePhotoContext, buyCreditsWizard, restorePhotoWizard } from './wizards';

const bot = new Telegraf<RestorePhotoContext>(process.env.BOT_TOKEN as string);

const ENVIRONMENT = process.env.NODE_ENV || '';

const stage = new Scenes.Stage<RestorePhotoContext>([restorePhotoWizard, buyCreditsWizard], {
	default: 'restore-photo-wizard',
});

bot.on('pre_checkout_query', ctx => ctx.answerPreCheckoutQuery(true));
bot.on("successful_payment", (ctx) => {
	console.log(ctx.state)
	// console.log(ctx.message)
	// {
	// 	message_id: 724,
	// 	from: {
	// 		id: 5154043582,
	// 		is_bot: false,
	// 		first_name: 'PuppyPopper',
	// 		username: 'puppypopper',
	// 		language_code: 'en'
	// 	},
	// 	chat: {
	// 		id: 5154043582,
	// 		first_name: 'PuppyPopper',
	// 		username: 'puppypopper',
	// 		type: 'private'
	// 	},
	// 	date: 1701129970,
	// 	successful_payment: {
	// 		currency: 'USD',
	// 		total_amount: 500,
	// 		invoice_payload: '{"coupon":"BLACK FRIDAY"}',
	// 		telegram_payment_charge_id: '6968190809_5154043582_1630',
	// 		provider_payment_charge_id: 'ch_3OHEoVJy44bACo51129pZSNo'
	// 	}
	// }
});

bot.use(session());
bot.use(stage.middleware());

bot.on('message', (ctx) => ctx.reply('Try /start'));

// prod mode (Vercel)
export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
	await production(req, res, bot);
};

// dev mode
ENVIRONMENT !== 'production' && development(bot);
