const { Client } = require("discord.js-selfbot-v13");

const DISCORD_TOKEN = process.env.TOKEN;
const COMMAND_CHANNEL_ID = process.env.COMMAND_CHANNEL_ID; // Jahan neon bot sunta hai

if (!DISCORD_TOKEN || !COMMAND_CHANNEL_ID) {
    console.error("❌ Missing TOKEN or COMMAND_CHANNEL_ID");
    process.exit(1);
}

const client = new Client({ checkUpdate: false, syncStatus: false });

// Human typing simulation
async function simulateHumanTyping(channel, message) {
    const totalChars = message.length;
    const minCharMs = 80, maxCharMs = 250;
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

// Cooldown timestamp extractor
function extractCooldownTimestamp(content) {
    const match = content.match(/<t:(\d+):R>/);
    if (match && match[1]) {
        return parseInt(match[1], 10) * 1000; // Convert to milliseconds
    }
    return null;
}

// Send command and wait for bot's reply to get cooldown
async function sendAndScheduleNext(channel) {
    try {
        // Send the command
        await simulateHumanTyping(channel, "neon puppy feed");
        console.log(`📤 Sent "neon puppy feed" at ${new Date().toISOString()}`);

        // Wait for neon bot's reply (max 30 seconds)
        const filter = (msg) => msg.author.id !== client.user.id && msg.content.includes("Come back");
        const collected = await channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
        const reply = collected.first();
        
        const timestampMs = extractCooldownTimestamp(reply.content);
        if (!timestampMs) {
            console.error("❌ Could not find cooldown timestamp in reply. Retrying in 1 hour...");
            setTimeout(() => sendAndScheduleNext(channel), 60 * 60 * 1000);
            return;
        }

        const now = Date.now();
        let waitMs = timestampMs - now;
        if (waitMs < 0) waitMs = 0;
        
        const nextDate = new Date(timestampMs);
        console.log(`⏰ Next feed scheduled at ${nextDate.toLocaleString()} (in ${Math.round(waitMs / 1000)} seconds)`);

        setTimeout(() => {
            sendAndScheduleNext(channel); // Recursive – agla send phir se
        }, waitMs);

    } catch (err) {
        console.error("❌ Failed to get reply or timeout:", err.message);
        // Retry after 1 minute if something fails
        setTimeout(() => sendAndScheduleNext(channel), 60 * 1000);
    }
}

// Start the loop (first call after ready)
async function startLoop() {
    const channel = await client.channels.fetch(COMMAND_CHANNEL_ID).catch(() => null);
    if (!channel) {
        console.error(`❌ Channel ${COMMAND_CHANNEL_ID} not found. Retrying in 1 min...`);
        setTimeout(startLoop, 60 * 1000);
        return;
    }
    console.log(`🎯 Listening in channel: ${channel.name}`);
    // Optional: little delay before first send
    setTimeout(() => sendAndScheduleNext(channel), 3000);
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
