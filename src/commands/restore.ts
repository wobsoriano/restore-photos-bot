import { Context, NarrowedContext } from 'telegraf';
import createDebug from 'debug';
import Replicate from 'replicate';
import { Message, Update } from 'telegraf/typings/core/types/typegram';

const debug = createDebug('bot:restore_command');

const replicate = new Replicate({
	auth: process.env.REPLICATE_API_TOKEN,
});

const restore = () => async (ctx: Context<any>) => {
	debug('Triggered "restore" text command');

	const { file_id: fileId } = ctx.message?.photo[2];

	const fileLink = await ctx.telegram.getFileLink(fileId);

	// const output = await replicate.run(
	//   "tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3",
	//   {
	//     input: {
	//       img: fileLink.href,
	//       scale: 2,
	//       version: 'v1.4'
	//     }
	//   }
	// );
	const output = await replicate.run(
		'microsoft/bringing-old-photos-back-to-life:c75db81db6cbd809d93cc3b7e7a088a351a3349c9fa02b6d393e35e0d51ba799',
		{
			input: {
				image: fileLink.href,
				with_scratch: true,
			},
		},
	);

	console.log(output);
	await ctx.replyWithPhoto(output as unknown as string);
	// await ctx.reply('done processing')
};

export { restore };
