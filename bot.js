const { Client } = require("discord.js-selfbot-v13");

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!TOKEN || !CHANNEL_ID) {
    console.error("❌ Missing TOKEN or CHANNEL_ID in environment variables.");
    process.exit(1);
}

const client = new Client({ checkUpdate: false, syncStatus: false });

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

// Extract timestamp from content OR embed description
function extractCooldownMs(content, embeds) {
    // First check plain text
    let match = content.match(/<t:(\d+):R>/);
    if (match) return parseInt(match[1], 10) * 1000;

    // Then check each embed's description
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

// Debug: log full message details (including embeds)
client.on("messageCreate", (msg) => {
    if (msg.channel.id === CHANNEL_ID && msg.author.id !== client.user.id) {
        console.log(`[DEBUG] ${msg.author.tag} | content: "${msg.content}"`);
        if (msg.embeds.length) {
            console.log(`[DEBUG] Embed count: ${msg.embeds.length}`);
            msg.embeds.forEach((e, i) => {
                console.log(`[DEBUG] Embed ${i} description: ${e.description || "(none)"}`);
            });
        }
    }
});

async function runLoop(channel) {
    try {
        await sendWithTyping(channel, "neon puppy feed");
        console.log(`📤 Sent "neon puppy feed" at ${new Date().toISOString()}`);

        // Wait for ANY message (not from self) that might contain a timestamp in content or embed
        const filter = (msg) => msg.author.id !== client.user.id;
        const collected = await channel.awaitMessages({ filter, max: 1, time: 60000 });
        const reply = collected.first();
        console.log(`📩 Received message from ${reply.author.tag}`);

        const cooldownMs = extractCooldownMs(reply.content, reply.embeds);
        if (!cooldownMs) {
            console.warn("⚠️ No <t:...:R> timestamp found in content or embeds. Retrying in 1 hour.");
            setTimeout(() => runLoop(channel), 60 * 60 * 1000);
            return;
        }

        const now = Date.now();
        let wait = cooldownMs - now;
        if (wait < 0) wait = 0;
        console.log(`⏰ Next feed in ${Math.round(wait / 1000)} seconds (at ${new Date(cooldownMs).toLocaleString()})`);

        setTimeout(() => runLoop(channel), wait);
    } catch (err) {
        console.error(`❌ No reply within 60s or error: ${err.message}. Retry in 10 minutes.`);
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
