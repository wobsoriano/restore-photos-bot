import { Markup, Scenes, Telegraf, session } from 'telegraf';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { development, production } from './core';
import { message } from 'telegraf/filters';

import {
	DEFAULT_CREDITS,
	addCredits,
	addUser,
	deductCredits,
	getUser,
} from './lib/user';
import { deblur, deoldifyImage, faceRestoration, nightEnhancement } from './lib/models';

const transformWizard = new Scenes.WizardScene(
	'transform-wizard',
	async (ctx) => {
		await ctx.reply(
			'Reply with a photo you want to fix or type /cancel to cancel',
		);
		return ctx.wizard.next();
	},
	async (ctx) => {
		if (ctx.has(message('photo'))) {
			const photo = ctx.message.photo[2];

			const fileLink = await ctx.telegram.getFileLink(photo.file_id);

			await ctx.reply('Processing your photo');

			let output: string;

			// @ts-expect-error: TODO
			switch (ctx.scene.state.command) {
				case 'restore':
					output = await faceRestoration(fileLink.href);
					break;
				case 'colorize':
					output = await deoldifyImage(fileLink.href);
					break;
				case 'deblur':
					output = await deblur(fileLink.href);
					break;
				case 'brighten':
					output = await nightEnhancement(fileLink.href);
					break;
				default:
					output = '';
					break;
			}

			await ctx.sendChatAction('upload_photo');
			await ctx.replyWithPhoto(output);

			await deductCredits(ctx.from.id, 1);

			return await ctx.scene.leave();
		}

		await ctx.reply(
			'Please reply with a photo to continue your request or type /cancel to cancel',
		);
	},
);

transformWizard.command('cancel', async (ctx) => {
	await ctx.reply('Request cancelled');
	return ctx.scene.leave();
});

const bot = new Telegraf<Scenes.WizardContext>(process.env.BOT_TOKEN as string);

const ENVIRONMENT = process.env.NODE_ENV || '';

bot.telegram.setMyCommands([
	{ command: 'start', description: 'List all available commands.' },
	{ command: 'restore', description: 'Restore the faces in old photographs.' },
	{ command: 'colorize', description: 'Enhance old images by adding color.' },
	{ command: 'deblur', description: 'Remove blurriness from an image.' },
	{ command: 'brighten', description: 'Night image enhancement.' },
	{
		command: 'buy',
		description: 'Add credits to your account. 1 credit = 1 transformation.',
	},
	{
		command: 'credits',
		description: 'Check how many credits you have left.',
	},
]);

bot.telegram.setMyDescription(`
Restore Photos Bot is here to help you restore, add colors, and deblur your precious memories.

dev @puppypopper
`);

bot.use(session());

bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true));
bot.on('successful_payment', (ctx) => {
	const {
		from: { id: telegramId },
		successful_payment,
	} = ctx.update.message;

	if (successful_payment) {
		const { credits } = JSON.parse(successful_payment.invoice_payload);
		addCredits(telegramId, credits);
	}
});

bot.action(/add_credits_+/, async (ctx) => {
	const credits = Number(ctx.match.input.split('_')[2]);

	const creditsMap: Record<number, number> = {
		50: 500,
		100: 900,
		250: 2_000,
	};

	await ctx.replyWithInvoice({
		provider_token: process.env.PAYMENT_PROVIDER_TOKEN as string,
		start_parameter: 'time-machine-sku', // todo
		currency: 'usd',
		photo_url: '',
		is_flexible: false,
		need_shipping_address: false,
		title: `${credits} credits`,
		description: `Add ${credits} credits to your account`,
		prices: [{ label: `${credits} credits`, amount: creditsMap[credits] }],
		payload: JSON.stringify({
			credits,
		}),
	});
});

bot.command('buy', async (ctx) => {
	await ctx.reply(
		'Buy credits',
		Markup.inlineKeyboard(
			[
				Markup.button.callback('50 credits - $5', 'add_credits_50'),
				Markup.button.callback('100 credits - $9', 'add_credits_100'),
				Markup.button.callback('250 credits - $20', 'add_credits_250'),
			],
			{
				wrap: (_btn, _index, currentRow) => currentRow.length >= 1,
			},
		),
	);
});

// @ts-expect-error: TODO
const stage = new Scenes.Stage<Scenes.WizardContext>([transformWizard]);

bot.use(stage.middleware());

bot.command(/^(restore|deblur|colorize|brighten)$/, async (ctx) => {
	const user = await getUser(ctx.from?.id as number);
	const noCreditsMessage = `You don't have enough credits to perform this transformation. Buy more credits with /buy`

	if (!user) {
		await ctx.reply(noCreditsMessage);
		return
	}

	if (user && user.credits < 1) {
		await ctx.reply(noCreditsMessage);
		return;
	}

	ctx.scene.enter('transform-wizard', {
		command: ctx.command,
	});
});

bot.command('credits', async (ctx) => {
	const user = await getUser(ctx.from.id);

	await ctx.reply(`You have ${user?.credits ?? DEFAULT_CREDITS} credits left.`);
});

bot.command('start', async (ctx) => {
	const commands = await bot.telegram.getMyCommands();
	let formattedCommands = 'Available Commands:\n\n';
	for (const command of commands) {
		formattedCommands += `Command: /${command.command}\nDescription: ${command.description}\n\n`;
	}
	await ctx.reply(formattedCommands);
});

// prod mode (Vercel)
export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
	await production(req, res, bot);
};

// dev mode
ENVIRONMENT !== 'production' && development(bot);
