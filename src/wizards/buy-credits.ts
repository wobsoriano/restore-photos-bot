import { Composer, Markup, Scenes } from 'telegraf';

const stepHandler = new Composer<Scenes.WizardContext>();

const baseInvoice = {
	provider_token: process.env.PAYMENT_PROVIDER_TOKEN as string,
	start_parameter: 'time-machine-sku',
	currency: 'usd',
	photo_url:
		'https://img.clipartfest.com/5a7f4b14461d1ab2caaa656bcee42aeb_future-me-fredo-and-pidjin-the-webcomic-time-travel-cartoon_390-240.png',
	is_flexible: false,
	need_shipping_address: false,
};

stepHandler.action('50_credits', async (ctx) => {
	await ctx.replyWithInvoice({
		...baseInvoice,
		title: '50 credits',
		description: 'Add 50 credits to your account',
		prices: [{ label: '50 credits', amount: 500 }],
		payload: JSON.stringify({
			credits: 50,
		}),
	});
	return ctx.wizard.next();
});

stepHandler.action('100_credits', async (ctx) => {
	await ctx.replyWithInvoice({
		...baseInvoice,
		title: '100 credits',
		description: 'Add 100 credits to your account',
		prices: [{ label: '100 credits', amount: 900 }],
		payload: JSON.stringify({
			credits: 100,
		}),
	});
	return ctx.wizard.next();
});

stepHandler.action('250_credits', async (ctx) => {
	await ctx.replyWithInvoice({
		...baseInvoice,
		title: '250 credits',
		description: 'Add 250 credits to your account',
		prices: [{ label: '250 credits', amount: 2000 }],
		payload: JSON.stringify({
			credits: 250,
		}),
	});
	return ctx.wizard.next();
});

export const buyCreditsWizard = new Scenes.WizardScene(
	'buy-credits-wizard',
	async (ctx) => {
		await ctx.reply(
			'Buy credits',
			Markup.inlineKeyboard(
				[
					Markup.button.callback('50 credits - $5', '50_credits'),
					Markup.button.callback('100 credits - $9', '100_credits'),
					Markup.button.callback('250 credits - $20', '250_credits'),
				],
				{
					wrap: (_btn, _index, currentRow) => currentRow.length >= 1,
				},
			),
		);
		return ctx.wizard.next();
	},
	stepHandler,
	async (ctx) => {
		// await ctx.reply('pay success')
		return await ctx.scene.leave();
	},
);
