import { config } from "dotenv";
config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("❌ Missing TELEGRAM_BOT_TOKEN in .env");
  process.exit(1);
}

const args = process.argv.slice(2);
const appUrl = args[0] || process.env.PUBLIC_WEBAPP_URL;

if (!appUrl) {
  console.error("❌ Please provide your public HTTPS URL (e.g., https://pitchlab.vercel.app)");
  console.error("Usage: npx tsx scripts/set-webhook.ts <URL>");
  process.exit(1);
}

// Ensure URL doesn't have trailing slash
const baseUrl = appUrl.replace(/\/$/, "");

async function main() {
  console.log(`\n🚀 Setting up Telegram integration for: ${baseUrl}\n`);

  // 1. Set Webhook
  const webhookUrl = `${baseUrl}/api/telegram/webhook`;
  let res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl })
  });
  let data = await res.json();
  if (data.ok) {
    console.log(`✅ Webhook set successfully to: ${webhookUrl}`);
  } else {
    console.error("❌ Failed to set webhook:", data);
  }

  // 2. Set Menu Button (Mini App)
  res = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      menu_button: {
        type: "web_app",
        text: "⚡ Open PitchLab",
        web_app: {
          url: `${baseUrl}/dashboard`
        }
      }
    })
  });
  data = await res.json();
  if (data.ok) {
    console.log(`✅ Menu Button (Mini App) set successfully pointing to: ${baseUrl}/dashboard`);
  } else {
    console.error("❌ Failed to set menu button:", data);
  }
  
  console.log("\n🎉 All set! Your Telegram bot is now fully integrated with your Vercel deployment.");
}

main().catch(console.error);
