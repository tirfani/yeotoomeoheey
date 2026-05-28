const { Client } = require("discord.js-selfbot-v13");

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!TOKEN || !CHANNEL_ID) {
    console.error("❌ Missing TOKEN or CHANNEL_ID in environment variables.");
    process.exit(1);
}

// Critical: disable voice to prevent memory leak from werift-rtp
const client = new Client({ 
    checkUpdate: false, 
    syncStatus: false, 
    voice: false,        // 🔥 Stops voice module from loading
    messageCacheMaxSize: 10   // Keep only 10 messages per channel in cache
});

// Human-like typing simulation
async function sendWithTyping(channel, message) {
    const chars = message.length;
    let totalTypingMs = 0;
    for (let i = 0; i < chars; i++) {
        totalTypingMs += Math.floor(Math.random() * 170) + 80;
    }
    const interval = setInterval(() => {
        channel.sendTyping().catch(() => {});
    }, 8000);
    await new Promise(r => setTimeout(r, totalTypingMs));
    clearInterval(interval);
    await channel.send(message);
}

function extractCooldownMs(content, embeds) {
    let match = content.match(/<t:(\d+):R>/);
    if (match) return parseInt(match[1], 10) * 1000;
    if (embeds && embeds.length) {
        for (const embed of embeds) {
            if (embed.description) {
                match = embed.description.match(/<t:(\d+):R>/);
                if (match) return parseInt(match[1], 10) * 1000;
            }
        }
    }
    return null;
}

// Memory monitor – restart if memory exceeds 400MB
setInterval(() => {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`💾 Memory usage: ${Math.round(used)} MB`);
    if (used > 400) {
        console.error("⚠️ Memory limit exceeded. Restarting gracefully...");
        process.exit(0);  // Railway will auto‑restart
    }
}, 60000); // Check every minute

// Reduced debug logging (only essential)
client.on("messageCreate", (msg) => {
    if (msg.channel.id === CHANNEL_ID && msg.author.id !== client.user.id) {
        // Only log if it's from the neon bot (less noise)
        if (msg.author.id === "851436490415931422") {
            console.log(`📩 Reply from ${msg.author.tag}`);
        }
    }
});

async function runLoop(channel) {
    try {
        await sendWithTyping(channel, "neon puppy feed");
        console.log(`📤 Sent "neon puppy feed" at ${new Date().toISOString()}`);

        const filter = (msg) => msg.author.id !== client.user.id;
        const collected = await channel.awaitMessages({ filter, max: 1, time: 60000 });
        const reply = collected.first();

        const cooldownMs = extractCooldownMs(reply.content, reply.embeds);
        if (!cooldownMs) {
            console.warn("⚠️ No timestamp found. Retrying in 1 hour.");
            setTimeout(() => runLoop(channel), 60 * 60 * 1000);
            return;
        }

        let wait = cooldownMs - Date.now();
        if (wait < 0) wait = 0;
        console.log(`⏰ Next feed in ${Math.round(wait / 1000)} seconds (${new Date(cooldownMs).toLocaleString()})`);

        setTimeout(() => runLoop(channel), wait);
    } catch (err) {
        console.error(`❌ Error: ${err.message}. Retry in 10 minutes.`);
        setTimeout(() => runLoop(channel), 10 * 60 * 1000);
    }
}

client.on("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (!channel) throw new Error("Channel not found");
        console.log(`🎯 Target channel: ${channel.name || channel.id}`);
        setTimeout(() => runLoop(channel), 5000);
    } catch (err) {
        console.error(`❌ Channel error: ${err.message}`);
        process.exit(1);
    }
});

client.on("disconnect", () => {
    console.warn("Disconnected, reconnecting in 5s...");
    setTimeout(() => client.login(TOKEN), 5000);
});
client.on("error", (err) => console.error("Client error:", err));

client.login(TOKEN).catch(err => {
    console.error("Login failed:", err);
    process.exit(1);
});
