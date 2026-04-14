import { Telegraf } from 'telegraf';

const botToken = process.env.TELEGRAM_BOT_TOKEN;

// Khởi tạo bot instance. 
// Chú ý: Ở môi trường serverless (như Vercel), chúng ta dùng webhook thay vì polling
export const bot = botToken ? new Telegraf(botToken) : null;
