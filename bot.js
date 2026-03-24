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

    // Wait for guilds to load
    setTimeout(() => {
        const voiceChannel = client.channels.cache.get(voiceChannelId);
        if (!voiceChannel) {
            console.error(`❌ Voice channel ${voiceChannelId} not found.`);
            return;
        }

        const guild = voiceChannel.guild;
        if (!guild) {
            console.error("❌ Could not find guild for voice channel.");
            return;
        }

        // Join using client.voice.join
        client.voice.join(guild.id, voiceChannel.id)
            .then(connection => {
                console.log(`🔊 Joined voice channel: ${voiceChannel.name} (${voiceChannelId})`);
            })
            .catch(err => {
                console.error("❌ Failed to join voice channel:", err);
            });
    }, 5000);
});

// Auto‑reconnect on disconnect
client.on("voiceStateUpdate", (oldState, newState) => {
    if (newState.id === client.user.id && !newState.channelId) {
        console.log("⚠️ Disconnected from voice. Reconnecting...");
        const channel = client.channels.cache.get(voiceChannelId);
        if (channel) {
            setTimeout(() => {
                const guild = channel.guild;
                if (guild) {
                    client.voice.join(guild.id, channel.id)
                        .then(() => console.log("🔊 Reconnected to voice."))
                        .catch(e => console.error("Rejoin failed:", e));
                }
            }, 5000);
        }
    }
});

client.on("error", console.error);

client.login(token).catch(err => {
    console.error("❌ Login failed:", err);
    process.exit(1);
});
