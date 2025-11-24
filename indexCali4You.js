import express from "express";
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";

// 🔑 Token Telegram depuis Render
const token = process.env.TELEGRAM_TOKEN;
if (!token) {
  console.error("ERREUR: TELEGRAM_TOKEN absent");
  process.exit(1);
}

// ⚡ Bot Telegram (polling désactivé pour webhook)
const bot = new TelegramBot(token, { polling: false });

const app = express();
app.use(express.json());
app.use(express.static('public')); // optionnel, pour fichiers statiques

// ----------------------------
// LOG pour vérifier que le bot tourne
console.log("Bot lancé !");

// ----------------------------
// Stockage du panier en mémoire (pour l’instant)
const panierGlobal = {};

// ----------------------------
// Endpoint pour récupérer les produits
app.get("/products", (req, res) => {
  const dataPath = path.join(process.cwd(), "data", "products.json");
  fs.readFile(dataPath, "utf8", (err, data) => {
    if (err) return res.status(500).json({ error: "Impossible de lire les produits" });
    res.json(JSON.parse(data));
  });
});

// ----------------------------
// Endpoints panier
app.post('/webhook', (req, res) => {
  const { userId, produit } = req.body;
  if (!userId || !produit) return res.status(400).json({ error: "userId ou produit manquant" });

  if (!panierGlobal[userId]) panierGlobal[userId] = [];
  panierGlobal[userId].push(produit);

  console.log(`Utilisateur ${userId} a ajouté: ${produit}`);
  res.json({ status: "ok", panier: panierGlobal[userId] });
});

app.post("/supprimer", (req, res) => {
  const { userId, produit } = req.body;
  if (!userId || !produit) return res.status(400).json({ error: "userId ou produit manquant" });

  if (!panierGlobal[userId]) panierGlobal[userId] = [];
  panierGlobal[userId] = panierGlobal[userId].filter(p => p !== produit);

  console.log(`Utilisateur ${userId} a supprimé: ${produit}`);
  res.json({ status: "ok", panier: panierGlobal[userId] });
});

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
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Serveur Render démarré sur le port ${port}`);
});
