const { Client } = require("discord.js-selfbot-v13");

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

const client = new Client({
    checkUpdate: false,
    syncStatus: false,
    intents: ["GUILDS", "GUILD_VOICE_STATES", "GUILD_MESSAGES"]
});

client.on("ready", async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    await client.user.setStatus("online");
    console.log("🟢 Status set to online");

    // Wait a bit for guilds to load, then fetch the voice channel
    setTimeout(async () => {
        try {
            // Fetch the channel directly (ensures it's in cache and valid)
            const voiceChannel = await client.channels.fetch(voiceChannelId);
            if (!voiceChannel) {
                console.error(`❌ Voice channel ${voiceChannelId} not found.`);
                return;
            }

            // Verify it's a voice channel
            if (voiceChannel.type !== "GUILD_VOICE") {
                console.error(`❌ Channel ${voiceChannelId} is not a voice channel.`);
                return;
            }

            // Join using the built-in method
            await voiceChannel.join();
            console.log(`🔊 Joined voice channel: ${voiceChannel.name} (${voiceChannelId})`);
        } catch (err) {
            console.error("❌ Failed to join voice channel:", err);
        }
    }, 5000);
});

// Auto‑reconnect on disconnect
client.on("voiceStateUpdate", async (oldState, newState) => {
    if (newState.id === client.user.id && !newState.channelId) {
        console.log("⚠️ Disconnected from voice. Reconnecting...");
        try {
            const channel = await client.channels.fetch(voiceChannelId);
            if (channel && channel.type === "GUILD_VOICE") {
                await channel.join();
                console.log("🔊 Reconnected to voice.");
            }
        } catch (err) {
            console.error("❌ Reconnect failed:", err);
        }
    }
});

client.on("error", console.error);

client.login(token).catch(err => {
    console.error("❌ Login failed:", err);
    process.exit(1);
});
