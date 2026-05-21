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

// Human typing simulation: repeatedly send typing indicator while "composing"
async function simulateHumanTyping(channel, message, minCharMs = 80, maxCharMs = 250) {
    const totalChars = message.length;
    // Average typing speed: ~120-300ms per character (including pauses)
    const totalTypingTime = Array.from({ length: totalChars }).reduce((sum) => {
        return sum + Math.floor(Math.random() * (maxCharMs - minCharMs + 1) + minCharMs);
    }, 0);

    // Keep typing indicator alive (it lasts ~10s, so refresh every 8s)
    const typingInterval = setInterval(() => {
        channel.sendTyping().catch(() => {});
    }, 8000);

    // Wait for the simulated typing duration
    await new Promise(resolve => setTimeout(resolve, totalTypingTime));
    clearInterval(typingInterval);

    // Finally send the message
    await channel.send(message);
}

async function sendNeonPuppyFeed(channel) {
    try {
        const message = "neon puppy feed";
        // Simulate human typing + send the message
        await simulateHumanTyping(channel, message);
        console.log(`✅ Sent at ${new Date().toISOString()}`);
    } catch (err) {
        console.error("Send failed:", err.message);
    }
}

// Recursive scheduler – no drift, recalculates next exact hour each time
async function scheduleHourlyFeed() {
    const channel = await client.channels.fetch(COMMAND_CHANNEL_ID).catch(() => null);
    if (!channel) {
        console.error(`❌ Channel ${COMMAND_CHANNEL_ID} not found. Retrying in 1 min...`);
        setTimeout(scheduleHourlyFeed, 60 * 1000);
        return;
    }

    const now = new Date();
    const msUntilNextHour = (60 - now.getMinutes()) * 60 * 1000
                           - now.getSeconds() * 1000
                           - now.getMilliseconds();

    console.log(`⏰ Next feed at ${new Date(Date.now() + msUntilNextHour).toLocaleTimeString()}`);
    setTimeout(async () => {
        await sendNeonPuppyFeed(channel);
        scheduleHourlyFeed();  // re-run for next hour
    }, msUntilNextHour);
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
    scheduleHourlyFeed();
});

client.login(DISCORD_TOKEN).catch(err => {
    console.error("Login failed:", err);
    process.exit(1);
});
