import express from "express";
import TelegramBot from "node-telegram-bot-api";

const token = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bot en ligne");
});

bot.on("message", (msg) => {
  bot.sendMessage(msg.chat.id, "Salut mon reuf, la mini-app est prête 🔥");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Bot lancé !");
});