import express from 'express'
import { Telegraf } from 'telegraf'

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN as string);
const app = express();

// Set the bot API endpoint
app.use(await bot.createWebhook({ domain: process.env.WEBHOOK_DOMAIN as string }));

bot.on('text', ctx => ctx.reply("Hello"));

export default app
