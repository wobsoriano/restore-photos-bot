import { Context, Markup, Telegraf, session } from 'telegraf';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { development, production } from './core';
import { message } from 'telegraf/filters';

import { addCredits, addUser, deductCredits, getUser } from './lib/user';
import { deblur, deoldifyImage, faceRestoration } from './lib/models';

type TransformType = 'restore' | 'colorize' | 'deblur';

const DEFAULT_CREDITS = 5

interface SessionData {
	pendingTransformations: {
		[key: number]: TransformType;
	};
}

export interface MyContext extends Context {
	session?: SessionData;
}

const bot = new Telegraf<MyContext>(process.env.BOT_TOKEN as string);

const ENVIRONMENT = process.env.NODE_ENV || '';

bot.telegram.setMyCommands([
	{ command: 'start', description: 'List all available commands.' },
	{
		command: 'buy',
		description: 'Add credits to your account. 1 credit = 1 transformation.',
	},
	{ command: 'restore', description: 'Restore the faces in old photographs.' },
	{ command: 'colorize', description: 'Enhance old images by adding color.' },
	{ command: 'deblur', description: 'Remove blurriness from an image.' },
	{
		command: 'credits',
		description: 'Check how many credits you have left.',
	},
]);

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

bot.command(/^(restore|deblur|colorize)$/, async (ctx) => {
	let user = await getUser(ctx.from?.id as number);

	if (!user) {
		user = await addUser(ctx.from.id);
	}
	
	if (user && user.credits < 1) {
		await ctx.reply(
			'You don\'t have enough credits to perform this transformation. Buy more credits with /buy',
		);
		return;
	}

	const { message_id } = await ctx.reply('Reply with a photo to restore', {
		reply_markup: {
			force_reply: true,
		},
	});

	let command: TransformType;

	switch (ctx.message.text) {
		case '/restore':
			command = 'restore';
			break;
		case '/deblur':
			command = 'deblur';
			break;
		case '/colorize':
			command = 'colorize';
			break;
		default:
			throw new Error('Invalid command');
	}

	if (ctx.session) {
		ctx.session.pendingTransformations ??= {};
		ctx.session.pendingTransformations[message_id] = command;
	} else {
		ctx.session = {
			pendingTransformations: {
				[message_id]: command,
			},
		};
	}
});

bot.on(message('photo'), async (ctx) => {
	if (ctx.message.reply_to_message) {
		const { message_id } = ctx.message.reply_to_message;

		const transformType = ctx.session?.pendingTransformations?.[message_id];
		if (transformType) {
			await ctx.reply('Processing your photo');

			const { file_id: fileId } = ctx.message.photo[2];

			const fileLink = await ctx.telegram.getFileLink(fileId);

			let output: string;

			switch (transformType) {
				case 'restore':
					output = await faceRestoration(fileLink.href);
					break;
				case 'colorize':
					output = await deoldifyImage(fileLink.href);
					break;
				case 'deblur':
					output = await deblur(fileLink.href);
					break;
				default:
					output = '';
					break;
			}

			await ctx.sendChatAction('upload_photo');
			await ctx.replyWithPhoto(output);
			await deductCredits(ctx.from.id, 1);

			delete ctx.session?.pendingTransformations?.[message_id]
		}
	}
});

bot.command('credits', async (ctx) => {
	const user = await getUser(ctx.from.id);

	await ctx.reply(`You have ${user?.credits ?? DEFAULT_CREDITS} credits left.`);
})

bot.command('start', async (ctx) => {
	const commands = await bot.telegram.getMyCommands()
	let formattedCommands = 'Available Commands:\n\n';
  for (const command of commands) {
		formattedCommands += `Command: /${command.command}\nDescription: ${command.description}\n\n`;
	}
	await ctx.reply(formattedCommands);
})

// prod mode (Vercel)
export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
	await production(req, res, bot);
};

// dev mode
ENVIRONMENT !== 'production' && development(bot);
