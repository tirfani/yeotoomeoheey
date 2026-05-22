require('dotenv').config();
const { Client } = require("discord.js-selfbot-v13");

// Environment variables
const DISCORD_TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.COMMAND_CHANNEL_ID;   // Channel where neon bot replies
const NEON_BOT_ID = "851436490415931422";            // The bot's user ID (fixed)

if (!DISCORD_TOKEN || !CHANNEL_ID) {
    console.error("❌ Missing TOKEN or COMMAND_CHANNEL_ID in .env");
    process.exit(1);
}

const client = new Client({ checkUpdate: false, syncStatus: false });

// Human-like typing simulation (2-6 sec “thinking” + typing indicator)
async function humanTypeAndSend(channel, message) {
    const chars = message.length;
    // Simulate typing speed: 80-250ms per character
    let totalDelay = 0;
    for (let i = 0; i < chars; i++) {
        totalDelay += Math.floor(Math.random() * 170) + 80; // 80-250ms
    }
    // Keep typing indicator alive (refresh every 8s)
    const typingInterval = setInterval(() => {
        channel.sendTyping().catch(() => {});
    }, 8000);
    await new Promise(r => setTimeout(r, totalDelay));
    clearInterval(typingInterval);
    await channel.send(message);
}

// Extract Unix timestamp (in milliseconds) from the bot's reply
function extractCooldownMs(content) {
    const match = content.match(/<t:(\d+):R>/);
    if (match && match[1]) {
        return parseInt(match[1], 10) * 1000;
    }
    return null;
}

// Main loop: send, wait for reply, schedule next
async function feedAndSchedule(channel) {
    try {
        // 1. Send the command
        await humanTypeAndSend(channel, "neon puppy feed");
        console.log(`📤 Sent "neon puppy feed" at ${new Date().toISOString()}`);

        // 2. Wait for a reply from the specific neon bot (by user ID)
        const filter = (msg) => msg.author.id === NEON_BOT_ID;
        const collected = await channel.awaitMessages({ filter, max: 1, time: 60000 }); // 60 sec timeout
        const reply = collected.first();
        console.log(`📩 Received reply from ${reply.author.tag}: ${reply.content.substring(0, 200)}`);

        // 3. Extract cooldown timestamp
        const cooldownMs = extractCooldownMs(reply.content);
        if (!cooldownMs) {
            console.warn("⚠️ No <t:...:R> timestamp found. Falling back to 1 hour.");
            setTimeout(() => feedAndSchedule(channel), 60 * 60 * 1000);
            return;
        }

        const now = Date.now();
        let waitMs = cooldownMs - now;
        if (waitMs < 0) waitMs = 0;
        const nextDate = new Date(cooldownMs);
        console.log(`⏰ Cooldown until ${nextDate.toLocaleString()} (in ${Math.round(waitMs / 1000)} seconds)`);

        // 4. Schedule next feeding exactly when cooldown ends
        setTimeout(() => feedAndSchedule(channel), waitMs);
    } catch (err) {
        console.error(`❌ Error: ${err.message}`);
        // On timeout or any error, retry after 5 minutes to avoid spam
        console.log("🔄 Retrying in 5 minutes...");
        setTimeout(() => feedAndSchedule(channel), 5 * 60 * 1000);
    }
}

// Start the loop after bot is ready
async function start() {
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (!channel) throw new Error("Channel not found");
        console.log(`🎯 Target channel: ${channel.name || channel.id}`);
        // Wait 10 seconds before first feed to allow full connection
        setTimeout(() => feedAndSchedule(channel), 10000);
    } catch (err) {
        console.error(`❌ Failed to fetch channel: ${err.message}`);
        setTimeout(start, 60 * 1000);
    }
}

// Auto-reconnect on disconnect
client.on("disconnect", () => {
    console.warn("⚠️ Disconnected. Reconnecting in 5s...");
    setTimeout(() => client.login(DISCORD_TOKEN), 5000);
});
client.on("error", (err) => console.error("Client error:", err));

client.on("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag} (SELF‑BOT - HIGH RISK)`);
    await client.user.setStatus("online");
    start();
});

client.login(DISCORD_TOKEN).catch(err => {
    console.error("Login failed:", err);
    process.exit(1);
});
