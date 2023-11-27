import { Composer, Markup, Scenes } from 'telegraf';

import Replicate from 'replicate';

const replicate = new Replicate({
	auth: process.env.REPLICATE_API_TOKEN,
});

interface RestorePhotoWizardSession extends Scenes.WizardSessionData {
	mode: 'face_restoration' | 'colorize' | 'deblur';
}

export type RestorePhotoContext =
	Scenes.WizardContext<RestorePhotoWizardSession>;

const stepHandler = new Composer<RestorePhotoContext>();

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

// Models

async function deoldifyImage(url: string): Promise<string> {
	return await runReplicateModel(
		'arielreplicate/deoldify_image:0da600fab0c45a66211339f1c16b71345d22f26ef5fea3dca1bb90bb5711e950',
		{
			input_image: url,
			model_name: 'Artistic',
		},
	);
}

async function faceRestoration(url: string): Promise<string> {
	return await runReplicateModel(
		'tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3',
		{
			img: url,
			scale: 2,
			version: 'v1.4',
		},
	);
}

async function deblur(url: string): Promise<string> {
	return await runReplicateModel(
		'megvii-research/nafnet:018241a6c880319404eaa2714b764313e27e11f950a7ff0a7b5b37b27b74dcf7',
		{
			image: url,
			task_type: 'Image Debluring (REDS)',
		},
	);
}

async function runReplicateModel(
	model: `${string}/${string}:${string}`,
	input: Record<string, string | number>,
): Promise<string> {
	const output = await replicate.run(model, {
		input,
	});

	return output as unknown as string;
}
