import express from "express";
import TelegramBot from "node-telegram-bot-api";

// 🔑 Token Telegram depuis Render
const token = process.env.TELEGRAM_TOKEN;
if (!token) {
  console.error("ERREUR: TELEGRAM_TOKEN absent");
  process.exit(1);
}

const bot = new TelegramBot(token);
const app = express();
app.use(express.json());

// ----------------------------
// LOG pour vérifier que le bot tourne
console.log("Bot lancé !");

// ----------------------------
// Stockage du panier en mémoire (pour l’instant)
const panierGlobal = {};

// ----------------------------
// Endpoints HTTP pour ton site
// Ajouter un produit au panier
app.post('/webhook', (req, res) => {
  const { userId, produit } = req.body;

  if (!userId || !produit) {
    return res.status(400).json({ error: "userId ou produit manquant" });
  }

  if (!panierGlobal[userId]) panierGlobal[userId] = [];
  panierGlobal[userId].push(produit);

  console.log(`Utilisateur ${userId} a ajouté: ${produit}`);
  res.json({ status: "ok", panier: panierGlobal[userId] });
});

// Supprimer un produit du panier
app.post("/supprimer", (req, res) => {
  const { userId, produit } = req.body;

  if (!userId || !produit) {
    return res.status(400).json({ error: "userId ou produit manquant" });
  }

  if (!panierGlobal[userId]) panierGlobal[userId] = [];
  panierGlobal[userId] = panierGlobal[userId].filter(p => p !== produit);

  console.log(`Utilisateur ${userId} a supprimé: ${produit}`);
  res.json({ status: "ok", panier: panierGlobal[userId] });
});

// Voir le panier
app.get("/panier/:userId", (req, res) => {
  const { userId } = req.params;
  const panier = panierGlobal[userId] || [];
  res.json({ panier });
});

// ----------------------------
// Bot Telegram simple
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Le bot est bien en ligne mon reuf 🔥");
});

// ----------------------------
// Lancer serveur Express
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Serveur Render démarré sur le port ${port}`);
});
