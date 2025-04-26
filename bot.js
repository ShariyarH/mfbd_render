// File: /api/bot.js
import { Telegraf } from 'telegraf';
import fs from 'fs';
import path from 'path';

const bot = new Telegraf('7418863126:AAE81U_N7-GmuE4JUn0AtpZoualmyzcqn4k');

bot.start(async (ctx) => {
  const text = ctx.message.text;
  const args = text.split(' ');

  if (args.length > 1) {
    const fileId = args[1];
    const metaPath = path.join(process.cwd(), 'public', 'cache', `telegram_meta_${fileId}.json`);

    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const fileTitle = meta.title || 'Unknown File';
      const fileSize = meta.size || 'Unknown Size';
      const mimeType = meta.mime || 'Unknown Type';
      const fileLink = `https://drive.sourcefoxit.com/file/${fileId}`;

      await ctx.reply(
        `📁 *${fileTitle}*\n\n🗂 Type: \`${mimeType}\`\n📦 Size: \`${fileSize}\`\n\n🔗 [Download Now](${fileLink})`,
        {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        }
      );
    } else {
      await ctx.reply('❌ File not found.');
    }
  } else {
    await ctx.reply('👋 Send me a file link or use the website to start download!');
  }
});

// Export as Vercel serverless
export default async function handler(req, res) {
  if (req.method === 'POST') {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } else {
    res.status(403).send('Forbidden');
  }
}
