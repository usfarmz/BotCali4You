import express from "express";
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

// ----------------------------
// Token Telegram depuis Render
const token = process.env.TELEGRAM_TOKEN;
if (!token) {
  console.error("ERREUR: TELEGRAM_TOKEN absent");
  process.exit(1);
}

// ⚡ Bot Telegram (webhook)
const bot = new TelegramBot(token, { polling: false });

const app = express();
app.use(express.json());
app.use(express.static('public')); // si tu as des fichiers statiques

// ----------------------------
// LOG pour vérifier
console.log("Bot lancé !");

// ----------------------------
// Stockage panier en mémoire
const panierGlobal = {};

// ----------------------------
// Endpoint local pour récupérer les produits
app.get("/products", (req, res) => {
  const dataPath = path.join(process.cwd(), "data", "product.json"); // Chemin vers ton JSON
  fs.readFile(dataPath, "utf8", (err, data) => {
    if (err) {
      console.error("Impossible de lire product.json :", err);
      return res.status(500).json({ error: "Impossible de lire les produits" });
    }
    res.json(JSON.parse(data));
  });
});

// ----------------------------
// Endpoints panier
app.post('/webhook', (req, res) => {
  const { userId, product } = req.body;
  if (!userId || !product) return res.status(400).json({ error: "userId ou product manquant" });

  if (!panierGlobal[userId]) panierGlobal[userId] = [];
  panierGlobal[userId].push(product);

  console.log(`Utilisateur ${userId} a ajouté: ${product}`);
  res.json({ status: "ok", panier: panierGlobal[userId] });
});

app.post("/supprimer", (req, res) => {
  const { userId, product } = req.body;
  if (!userId || !product) return res.status(400).json({ error: "userId ou product manquant" });

  if (!panierGlobal[userId]) panierGlobal[userId] = [];
  panierGlobal[userId] = panierGlobal[userId].filter(p => p !== product);

  console.log(`Utilisateur ${userId} a supprimé: ${product}`);
  res.json({ status: "ok", panier: panierGlobal[userId] });
});

app.get("/panier/:userId", (req, res) => {
  const { userId } = req.params;
  const panier = panierGlobal[userId] || [];
  res.json({ panier });
});

// ----------------------------
// Webhook Telegram
app.post('/telegram-webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Configurer le webhook (une seule fois)
const WEBHOOK_URL = "https://botcali4you-2.onrender.com/telegram-webhook";
bot.setWebHook(WEBHOOK_URL);

// ----------------------------
// Fonction pour récupérer les produits depuis le JSON ou Render
async function getProducts() {
  try {
    const res = await fetch("https://botcali4you-2.onrender.com/products");
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.products)) return data.products;
    console.error("Format inattendu des produits :", data);
    return [];
  } catch (err) {
    console.error("Erreur API Render :", err);
    return [];
  }
}

// ----------------------------
// Commande /produits
bot.onText(/produits/i, async (msg) => {
  const chatId = msg.chat.id;
  const produits = await getProducts();

  if (!produits || produits.length === 0) {
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
  if (text && text.startsWith("/produits")) return; // déjà géré
  bot.sendMessage(chatId, "Le bot est bien en ligne mon reuf 🔥");
});

// ----------------------------
// Lancer serveur
const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Serveur Render démarré sur le port ${port}`));
