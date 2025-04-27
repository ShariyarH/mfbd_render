import { Telegraf } from 'telegraf';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import bodyParser from 'body-parser';

// Setup __dirname for ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const BOT_TOKEN = '7418863126:AAH4VWj8PAgXYCb3Du6uznfL2uhnH2Iy6og';
const CHANNEL_ID = '-1002644073048';

const bot = new Telegraf(BOT_TOKEN);

// Create cache folder
const cacheFolder = path.join(__dirname, 'cache');
if (!fs.existsSync(cacheFolder)) {
  fs.mkdirSync(cacheFolder, { recursive: true });
}

// Start command
bot.start(async (ctx) => {
  const text = ctx.message.text;
  const args = text.split(' ');

  if (args.length > 1) {
    const fileUrl = args[1];
    const fileName = `file_${Date.now()}`;
    const cachePath = path.join(cacheFolder, `${fileName}.json`);

    if (fs.existsSync(cachePath)) {
      const meta = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      await ctx.replyWithDocument(meta.file_id);
    } else {
      let uploadingMessage;
      try {
        // Tell user uploading started
        uploadingMessage = await ctx.reply('⏳ Uploading your file, please wait...');

        // Download file
        const tempFilePath = path.join(cacheFolder, `${fileName}`);
        const response = await axios({
          method: 'GET',
          url: fileUrl,
          responseType: 'stream',
        });

        const writer = fs.createWriteStream(tempFilePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        // Upload to Telegram
        const uploadFile = async () => {
          return await bot.telegram.sendDocument(CHANNEL_ID, {
            source: tempFilePath,
          });
        };

        let uploaded;
        try {
          uploaded = await uploadFile();
        } catch (err) {
          console.log('First upload attempt failed, retrying...');
          await new Promise(res => setTimeout(res, 3000)); // wait 3s
          uploaded = await uploadFile();
        }

        const fileId = uploaded.document.file_id;

        // Save meta
        const meta = { file_id: fileId };
        fs.writeFileSync(cachePath, JSON.stringify(meta));

        // Edit uploading message
        await ctx.telegram.editMessageText(ctx.chat.id, uploadingMessage.message_id, null, '✅ Upload complete! Here is your file:');
        await ctx.replyWithDocument(fileId);

      } catch (err) {
        console.error('Upload failed:', err);
        await ctx.reply('❌ Failed to upload the file. Please try again.');
      } finally {
        // Clean up downloaded temp file
        const tempFilePath = path.join(cacheFolder, `${fileName}`);
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    }
  } else {
    await ctx.reply('👋 Send me a file URL after /start to upload and download!');
  }
});

// Express Webhook Handler
const app = express();
app.use(bodyParser.json());

app.post('/bot', async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook error');
  }
});

app.get('/', (req, res) => {
  res.send('Bot is running.');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
