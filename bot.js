const { Client } = require("discord.js-selfbot-v13");

// Environment variables from Railway
const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!TOKEN || !CHANNEL_ID) {
    console.error("❌ Missing TOKEN or CHANNEL_ID in environment variables.");
    process.exit(1);
}

const client = new Client({ checkUpdate: false, syncStatus: false });

// Human‑like typing simulation
async function sendWithTyping(channel, message) {
    const chars = message.length;
    let totalTypingMs = 0;
    for (let i = 0; i < chars; i++) {
        totalTypingMs += Math.floor(Math.random() * 170) + 80; // 80–250ms per char
    }
    const interval = setInterval(() => {
        channel.sendTyping().catch(() => {});
    }, 8000);
    await new Promise(r => setTimeout(r, totalTypingMs));
    clearInterval(interval);
    await channel.send(message);
}

// Extract Discord timestamp <t:1234567890:R>
function extractCooldownMs(content) {
    const match = content.match(/<t:(\d+):R>/);
    return match ? parseInt(match[1], 10) * 1000 : null;
}

// Debug: log every message in the target channel (helps diagnose)
client.on("messageCreate", (msg) => {
    if (msg.channel.id === CHANNEL_ID && msg.author.id !== client.user.id) {
        console.log(`[DEBUG] ${msg.author.tag}: ${msg.content.substring(0, 200)}`);
    }
});

async function runLoop(channel) {
    try {
        // Send command
        await sendWithTyping(channel, "neon puppy feed");
        console.log(`📤 Sent "neon puppy feed" at ${new Date().toISOString()}`);

        // Wait up to 60 seconds for any message containing a Discord timestamp
        const filter = (msg) => /<t:\d+:R>/.test(msg.content);
        const collected = await channel.awaitMessages({ filter, max: 1, time: 60000 });
        const reply = collected.first();
        console.log(`📩 Received reply: ${reply.content.substring(0, 200)}`);

        const cooldownMs = extractCooldownMs(reply.content);
        if (!cooldownMs) {
            console.warn("⚠️ No <t:...:R> timestamp found. Retrying in 1 hour.");
            setTimeout(() => runLoop(channel), 60 * 60 * 1000);
            return;
        }

        const now = Date.now();
        let wait = cooldownMs - now;
        if (wait < 0) wait = 0;
        console.log(`⏰ Next feed in ${Math.round(wait / 1000)} seconds (at ${new Date(cooldownMs).toLocaleString()})`);

        setTimeout(() => runLoop(channel), wait);
    } catch (err) {
        console.error(`❌ No reply within 60 seconds (or error): ${err.message}. Retrying in 10 minutes.`);
        setTimeout(() => runLoop(channel), 10 * 60 * 1000);
    }
}

client.on("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag} (SELF‑BOT - HIGH RISK)`);
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (!channel) throw new Error("Channel not found");
        console.log(`🎯 Target channel: ${channel.name || channel.id}`);
        // First send after 5 seconds
        setTimeout(() => runLoop(channel), 5000);
    } catch (err) {
        console.error(`❌ Failed to fetch channel: ${err.message}`);
        process.exit(1);
    }
});

// Auto‑reconnect
client.on("disconnect", () => {
    console.warn("⚠️ Disconnected. Reconnecting in 5s...");
    setTimeout(() => client.login(TOKEN), 5000);
});

client.on("error", (err) => console.error("Client error:", err));

client.login(TOKEN).catch(err => {
    console.error("Login failed:", err);
    process.exit(1);
});
