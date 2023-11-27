import { Composer, Input, Markup, Scenes, Telegraf, session } from 'telegraf';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { message } from 'telegraf/filters';
import { development, production } from './core';
import { restore } from './commands';

import Replicate from 'replicate';

const replicate = new Replicate({
	auth: process.env.REPLICATE_API_TOKEN,
});

const bot = new Telegraf(process.env.BOT_TOKEN as string);

const ENVIRONMENT = process.env.NODE_ENV || '';

interface MyWizardSession extends Scenes.WizardSessionData {
	mode: 'face_restoration' | 'colorize';
}

type MyContext = Scenes.WizardContext<MyWizardSession>;

const stepHandler = new Composer<MyContext>();

stepHandler.action('face_restoration', async (ctx) => {
	ctx.scene.session.mode = 'face_restoration';
	await ctx.reply('Send me a photo to restore');
	return ctx.wizard.next();
});

stepHandler.action('colorize', async (ctx) => {
	ctx.scene.session.mode = 'colorize';
	await ctx.reply('Send me a photo to colorize');
	return ctx.wizard.next();
});

const superWizard = new Scenes.WizardScene(
	'ai-wizard',
	async (ctx) => {
		await ctx.reply(
			'What do you want to do today?',
			Markup.inlineKeyboard([
				Markup.button.callback('Face restoration', 'face_restoration'),
				Markup.button.callback('Colorize photo', 'colorize'),
			]),
		);
		return ctx.wizard.next();
	},
	stepHandler,
	async (ctx) => {
		if (!ctx.message?.photo?.length) {
			await ctx.reply('Please upload a photo to continue');
			// return await ctx.scene.leave();
			return ctx.scene.reenter();
		}

		await ctx.reply('Processing your photo');

		const { file_id: fileId } = ctx.message?.photo[2];

		const fileLink = await ctx.telegram.getFileLink(fileId);

		if (ctx.scene.session.mode === 'face_restoration') {
			const output = await replicate.run(
				'tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3',
				{
					input: {
						img: fileLink.href,
						scale: 2,
						version: 'v1.4',
					},
				},
			);

			await ctx.replyWithPhoto(output as unknown as string);
			await ctx.reply('Photo restored. Thank you for using our service.');
		} else {
			const output = await replicate.run(
				'arielreplicate/deoldify_image:0da600fab0c45a66211339f1c16b71345d22f26ef5fea3dca1bb90bb5711e950',
				{
					input: {
						input_image: fileLink.href,
						model_name: 'Artistic',
					},
				},
			);

			await ctx.sendChatAction('upload_photo');

			await ctx.replyWithPhoto(output as unknown as string);

			await ctx.reply('Photo colorized. Thank you for using our service.');
		}

		return ctx.scene.leave();
	},
);

const stage = new Scenes.Stage<MyContext>([superWizard], {
	default: 'ai-wizard',
});

bot.use(session());
bot.use(stage.middleware());

bot.command('start', (ctx) => ctx.scene.enter('ai-wizard'));

bot.on('message', (ctx) => ctx.reply('Try /start'));

// prod mode (Vercel)
export const startVercel = async (req: VercelRequest, res: VercelResponse) => {
	await production(req, res, bot);
};

// dev mode
ENVIRONMENT !== 'production' && development(bot);
