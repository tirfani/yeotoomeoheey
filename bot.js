const { Client } = require("discord.js-selfbot-v13");

// Environment variables
const token = process.env.TOKEN;
const voiceChannelId = process.env.VOICE_CHANNEL_ID;

if (!token) {
    console.error("❌ TOKEN environment variable set nahi hai!");
    process.exit(1);
}
if (!voiceChannelId) {
    console.error("❌ VOICE_CHANNEL_ID environment variable set nahi hai!");
    process.exit(1);
}

const client = new Client({
    checkUpdate: false,
    syncStatus: false
});

client.on("ready", async () => {
    console.log(`✅ Online ho gaya as ${client.user.tag}`);
    console.log(`🟢 Status: ${client.user.presence.status}`);

    // Online status set karo (green dot)
    await client.user.setStatus("online");

    // Voice channel join
    const voiceChannel = client.channels.cache.get(voiceChannelId);
    if (!voiceChannel) {
        console.error(`❌ Voice channel ${voiceChannelId} nahi mila.`);
        return;
    }

    // Already connected?
    if (client.voice.connections.has(voiceChannel.guild.id)) {
        console.log("Already connected to voice.");
        return;
    }

    try {
        await voiceChannel.join();
        console.log(`🔊 Voice channel join kar liya: ${voiceChannel.name} (${voiceChannelId})`);
    } catch (err) {
        console.error("❌ Voice join fail ho gaya:", err);
    }
});

// Reconnect automatically on disconnect
client.on("voiceStateUpdate", (oldState, newState) => {
    if (newState.id === client.user.id && !newState.channelId) {
        console.log("⚠️ Voice se disconnect ho gaye. Rejoin kar rahe hain...");
        const channel = client.channels.cache.get(voiceChannelId);
        if (channel) {
            channel.join().catch(e => console.error("Rejoin fail:", e));
        }
    }
});

// Basic error handler
client.on("error", console.error);

// Login
client.login(token).catch(err => {
    console.error("❌ Login fail:", err);
    process.exit(1);
});
