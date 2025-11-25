import express from "express";
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import fetch from "node-fetch"; // <<--- AJOUT IMPORTANT

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
// 🔥 Fonction — Récupérer les produits depuis Render
const API_URL = "https://botcali4you-2.onrender.com/product";

async function getProduct() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    // Assurer que c'est bien un tableau
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.product)) return data.product;

    console.error("Erreur : format inattendu des produits", data);
    return [];
  } catch (err) {
    console.error("Erreur API Render :", err);
    return [];
  }
}

// ----------------------------
// Endpoint local pour les produits
app.get("/products", (req, res) => {
  const dataPath = path.join(process.cwd(), "data", "product.json");
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
// 🔥 Endpoint webhook pour Telegram
app.post('/telegram-webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// ----------------------------
// 🔥 Configurer le webhook Telegram (laisse-le, ça ne pose pas de problème)
const WEBHOOK_URL = "https://botcali4you-2.onrender.com/telegram-webhook";
bot.setWebHook(WEBHOOK_URL);

// ----------------------------
// Commande /produits
bot.onText(/produits/i, async (msg) => {
  const chatId = msg.chat.id;

  const produits = await getProduct();

  if (produits.length === 0) {
    bot.sendMessage(chatId, "❌ Aucun produit trouvé.");
    return;
  }

  let text = "📦 *Liste des produits disponibles :*\n\n";

  produits.forEach(p => {
    text += `🔥 *${p.name}*\n`;
    text += `🏷️ ${p.tag}\n`;
    text += `💶 Prix: ${Object.keys(p.price).join(", ")}\n`;
    text += `📦 Stock: ${p.stock}\n`;
    text += `📝 ${p.desc}\n\n`;
  });

  bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
});

// ----------------------------
// Commande /start ou messages généraux
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Ne rien faire si c'est une commande gérée par onText
  if (text.startsWith("/produits")) return;

  bot.sendMessage(chatId, "Le bot est bien en ligne mon reuf 🔥");
});

// ----------------------------
// Lancer serveur Express
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Serveur Render démarré sur le port ${port}`);
});
