const { Client } = require("discord.js-selfbot-v13");

const DISCORD_TOKEN = process.env.TOKEN;
const COMMAND_CHANNEL_ID = process.env.COMMAND_CHANNEL_ID;

if (!DISCORD_TOKEN || !COMMAND_CHANNEL_ID) {
    console.error("❌ Missing TOKEN or COMMAND_CHANNEL_ID");
    process.exit(1);
}

const client = new Client({
    checkUpdate: false,
    syncStatus: false
});

// Human typing simulation (same as before)
async function simulateHumanTyping(channel, message, minCharMs = 80, maxCharMs = 250) {
    const totalChars = message.length;
    const totalTypingTime = Array.from({ length: totalChars }).reduce((sum) => {
        return sum + Math.floor(Math.random() * (maxCharMs - minCharMs + 1) + minCharMs);
    }, 0);

    const typingInterval = setInterval(() => {
        channel.sendTyping().catch(() => {});
    }, 8000);

    await new Promise(resolve => setTimeout(resolve, totalTypingTime));
    clearInterval(typingInterval);
    await channel.send(message);
}

async function sendNeonPuppyFeed(channel) {
    try {
        const message = "neon puppy feed";
        await simulateHumanTyping(channel, message);
        console.log(`✅ Sent at ${new Date().toISOString()}`);
    } catch (err) {
        console.error("Send failed:", err.message);
    }
}

// New scheduler: first message after random 5–15 sec, then every 1 hour
async function startLoop() {
    const channel = await client.channels.fetch(COMMAND_CHANNEL_ID).catch(() => null);
    if (!channel) {
        console.error(`❌ Channel ${COMMAND_CHANNEL_ID} not found. Retrying in 1 min...`);
        setTimeout(startLoop, 60 * 1000);
        return;
    }

    // Random initial delay (5–15 seconds) – human-like start
    const initialDelay = Math.floor(Math.random() * (15000 - 5000 + 1) + 5000);
    console.log(`⏳ First message in ${initialDelay / 1000} seconds...`);
    
    setTimeout(async () => {
        await sendNeonPuppyFeed(channel);
        // Then every 1 hour (3600000 ms) exactly
        setInterval(() => {
            sendNeonPuppyFeed(channel);
        }, 60 * 60 * 1000);
    }, initialDelay);
}

// Auto-reconnect
client.on("disconnect", () => {
    console.warn("⚠️ Disconnected. Reconnecting in 5s...");
    setTimeout(() => client.login(DISCORD_TOKEN), 5000);
});

client.on("error", (err) => console.error("Client error:", err));

client.on("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag} (SELF‑BOT - HIGH RISK)`);
    await client.user.setStatus("online");
    startLoop();
});

client.login(DISCORD_TOKEN).catch(err => {
    console.error("Login failed:", err);
    process.exit(1);
});
