const { Client } = require("discord.js-selfbot-v13");

// Environment variables
const token = process.env.TOKEN;
const voiceChannelId = process.env.VOICE_CHANNEL_ID;

if (!token) {
    console.error("❌ TOKEN environment variable not set!");
    process.exit(1);
}
if (!voiceChannelId) {
    console.error("❌ VOICE_CHANNEL_ID environment variable not set!");
    process.exit(1);
}

// Create client with all required intents
const client = new Client({
    checkUpdate: false,
    syncStatus: false,
    intents: ["GUILDS", "GUILD_VOICE_STATES", "GUILD_MESSAGES"]
});

client.on("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    await client.user.setStatus("online");
    console.log("🟢 Status set to online");

    // Wait for guilds to load
    setTimeout(async () => {
        const voiceChannel = client.channels.cache.get(voiceChannelId);
        if (!voiceChannel) {
            console.error(`❌ Voice channel ${voiceChannelId} not found.`);
            return;
        }

        // Already connected?
        if (client.voice.connections.has(voiceChannel.guild.id)) {
            console.log("Already connected to voice.");
            return;
        }

        try {
            await voiceChannel.join();
            console.log(`🔊 Joined voice channel: ${voiceChannel.name} (${voiceChannelId})`);
        } catch (err) {
            console.error("❌ Failed to join voice channel:", err);
        }
    }, 3000); // small delay for guild cache
});

// Auto‑reconnect on disconnect
client.on("voiceStateUpdate", (oldState, newState) => {
    if (newState.id === client.user.id && !newState.channelId) {
        console.log("⚠️ Disconnected from voice. Reconnecting...");
        const channel = client.channels.cache.get(voiceChannelId);
        if (channel) {
            setTimeout(() => {
                channel.join().catch(e => console.error("Rejoin failed:", e));
            }, 5000);
        }
    }
});

// Error handler
client.on("error", console.error);

// Login
client.login(token).catch(err => {
    console.error("❌ Login failed:", err);
    process.exit(1);
});
