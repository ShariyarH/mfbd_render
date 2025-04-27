const { Telegraf } = require('telegraf');
const fs = require('fs');
require('dotenv').config();

const CHANNEL_ID = process.env.CHANNEL_ID;

const bot = new Telegraf(process.env.BOT_TOKEN);

// Load existing file database
let fileDb = {};
const dbPath = './files.json';
if (fs.existsSync(dbPath)) {
  fileDb = JSON.parse(fs.readFileSync(dbPath));
}

// Save uploaded file_id
function saveFileId(fileName, fileId, type) {
  fileDb[fileName] = { file_id: fileId, type: type };
  fs.writeFileSync(dbPath, JSON.stringify(fileDb, null, 2));
}

// Delete message after 5 min
function deleteAfter(chatId, messageId) {
  setTimeout(() => {
    bot.telegram.deleteMessage(chatId, messageId).catch(e => console.log("Already deleted"));
  }, 300000); // 5 min
}

// Start
bot.start((ctx) => {
  ctx.reply('👋 Welcome! Send /getfile to receive your file.');
});

// Command to get file
bot.command('getfile', async (ctx) => {
  const fileName = "ExampleVideo.mp4"; // Update this to your file
  const localPath = "./example.mp4"; // Your local file path
  const caption = `
📂 File: ${fileName}
✅ 5 Min Auto Delete Active
🚨 Forwarding Can Ban You!
`;

  try {
    if (fileDb[fileName]) {
      const fileData = fileDb[fileName];
      if (fileData.type === 'video') {
        const sent = await ctx.replyWithVideo(fileData.file_id, {
          caption,
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔗 DriveLink", url: "https://yourdomain.com" }],
              [{ text: "👥 Join Telegram", url: "https://t.me/yourchannel" }]
            ]
          }
        });
        deleteAfter(sent.chat.id, sent.message_id);
      }
    } else {
      const uploadMsg = await ctx.reply('⏳ Uploading file to server...');

      const uploaded = await bot.telegram.sendVideo(CHANNEL_ID, { source: localPath }, { caption: "Server Backup: " + fileName });

      saveFileId(fileName, uploaded.video.file_id, "video");

      const sent = await ctx.replyWithVideo(uploaded.video.file_id, {
        caption,
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔗 DriveLink", url: "https://yourdomain.com" }],
              [{ text: "👥 Join Telegram", url: "https://t.me/yourchannel" }]
          ]
        }
      });
      deleteAfter(sent.chat.id, sent.message_id);

      ctx.deleteMessage(uploadMsg.message_id);
    }
  } catch (error) {
    console.error(error);
    ctx.reply('❌ Error while sending file!');
  }
});

bot.launch();
