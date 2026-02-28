const { Client } = require("discord.js-selfbot-v13");

// Token environment variable se lo
const token = process.env.TOKEN;

if (!token) {
    console.error("❌ TOKEN environment variable set nahi hai!");
    process.exit(1);
}

const client = new Client({
    checkUpdate: false,
    syncStatus: false
});

client.on("ready", () => {
    console.log(`✅ Online ho gaya as ${client.user.tag}`);
    console.log(`🟢 Status: ${client.user.presence.status}`);
    
    // Online status set karo (green dot)
    client.user.setStatus("online");
    
    // Kuch aur mat karo, bas online raho
});

// Error handle karo
client.on("error", console.error);

// Login
client.login(token);
