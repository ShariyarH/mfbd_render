const { Telegraf } = require('telegraf');
const fs = require('fs');
require('dotenv').config();

// Load Environment Variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!BOT_TOKEN || !CHANNEL_ID) {
  console.error("❌ BOT_TOKEN or CHANNEL_ID not set in environment variables.");
  process.exit(1);
}

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);

// File database path
const dbPath = './files.json';
let fileDb = {};

// Load existing database
if (fs.existsSync(dbPath)) {
  fileDb = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

// Save new file info to db
function saveFile(fileName, fileId, type) {
  fileDb[fileName] = { file_id: fileId, type };
  fs.writeFileSync(dbPath, JSON.stringify(fileDb, null, 2));
}

// Auto delete message after 5 minutes
function autoDelete(chatId, messageId) {
  setTimeout(() => {
    bot.telegram.deleteMessage(chatId, messageId).catch(err => console.log('Message already deleted.'));
  }, 5 * 60 * 1000); // 5 minutes
}

// Bot start
bot.start((ctx) => {
  ctx.reply('👋 Welcome! Send /getfile to get your file!');
});

// /getfile command
bot.command('getfile', async (ctx) => {
  const fileName = "ExampleVideo.mp4"; // Example filename
  const localPath = "./example.mp4";   // Local file

  const caption = `
📂 File: ${fileName}
✅ Auto delete in 5 minutes
🚨 Forwarding Can Ban You!
`;

  try {
    if (fileDb[fileName]) {
      // File already uploaded before
      const file = fileDb[fileName];
      const sent = await ctx.replyWithVideo(file.file_id, {
        caption,
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔗 Download Now", url: "https://yourdomain.com" }],
            [{ text: "🌐 Visit Website", url: "https://t.me/yourchannel" }]
          ]
        }
      });
      autoDelete(sent.chat.id, sent.message_id);
    } else {
      // Uploading file to channel
      const uploading = await ctx.reply('⏳ Uploading to server, please wait...');

      const uploaded = await bot.telegram.sendVideo(CHANNEL_ID, { source: localPath }, { caption: `Backup: ${fileName}` });

      saveFile(fileName, uploaded.video.file_id, 'video');

      const sent = await ctx.replyWithVideo(uploaded.video.file_id, {
        caption,
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔗 Download Now", url: "https://yourdomain.com" }],
            [{ text: "🌐 Visit Website", url: "https://t.me/yourchannel" }]
          ]
        }
      });
      autoDelete(sent.chat.id, sent.message_id);

      await ctx.deleteMessage(uploading.message_id).catch(() => {});
    }
  } catch (err) {
    console.error(err);
    ctx.reply('❌ Failed to send the file.');
  }
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Launch
bot.launch();
