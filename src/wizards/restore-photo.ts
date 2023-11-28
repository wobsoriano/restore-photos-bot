import { Composer, Markup, Scenes } from 'telegraf';
import { deblur, deoldifyImage, faceRestoration } from '../models';

interface RestorePhotoWizardSession extends Scenes.WizardSessionData {
	mode: 'face_restoration' | 'colorize' | 'deblur';
}

export type RestorePhotoContext =
	Scenes.WizardContext<RestorePhotoWizardSession>;

const stepHandler = new Composer<RestorePhotoContext>();

stepHandler.action('buy_credits', async (ctx) => {
	return await ctx.scene.enter('buy-credits-wizard')
});

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

stepHandler.action('deblur', async (ctx) => {
	ctx.scene.session.mode = 'deblur';
	await ctx.reply('Send me a photo to deblur');
	return ctx.wizard.next();
});

export const restorePhotoWizard = new Scenes.WizardScene(
	'restore-photo-wizard',
	async (ctx) => {
		await ctx.reply(
			'What do you want to do today?',
			Markup.inlineKeyboard(
				[
					Markup.button.callback('Buy credits', 'buy_credits'),
					Markup.button.callback('Face restoration', 'face_restoration'),
					Markup.button.callback('Colorize photo', 'colorize'),
					Markup.button.callback('Deblur photo', 'deblur'),
				],
				{
					wrap: (btn, index, currentRow) => currentRow.length >= 1,
				},
			),
		);
		return ctx.wizard.next();
	},
	stepHandler,
	async (ctx) => {
		// @ts-expect-error: TODO, type photo
		if (!ctx.message?.photo?.length) {
			await ctx.reply('Please upload a photo to continue');
			return ctx.scene.reenter();
		}

		await ctx.reply('Processing your photo');

		// @ts-expect-error: TODO, type photo
		const { file_id: fileId } = ctx.message.photo[2];

		const fileLink = await ctx.telegram.getFileLink(fileId);

		switch (ctx.scene.session.mode) {
			case 'face_restoration': {
				const outputFaceRestoration = await faceRestoration(fileLink.href);
				await ctx.sendChatAction('upload_photo');
				await ctx.replyWithPhoto(outputFaceRestoration);
				await ctx.reply('Photo restored. Thank you for using our service.');
				break;
			}
			case 'colorize': {
				const outputColorize = await deoldifyImage(fileLink.href);
				await ctx.sendChatAction('upload_photo');
				await ctx.replyWithPhoto(outputColorize);
				await ctx.reply('Photo colorized. Thank you for using our service.');
				break;
			}
			case 'deblur': {
				const outputDeblur = await deblur(fileLink.href);
				await ctx.sendChatAction('upload_photo');
				await ctx.replyWithPhoto(outputDeblur);
				await ctx.reply('Photo deblurred. Thank you for using our service.');
				break;
			}
			default:
				// Handle other cases or do nothing
				break;
		}

		return ctx.scene.leave();
	},
);
