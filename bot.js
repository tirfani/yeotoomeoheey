/* eslint-disable no-unused-vars */
/* eslint-disable no-useless-escape */

process.emitWarning = (warning, type) => {
    if (type === "DeprecationWarning") return;
    console.warn(warning);
};

const fs = require("fs");
const path = require("path");
const { Client, WebhookClient } = require("discord.js-selfbot-v13");
const { exec } = require("child_process");

// HUMAN BEHAVIOR SETTINGS
const HUMAN_BEHAVIOR = {
    typing: {
        minDelay: 800, maxDelay: 3500, randomPauses: true, variableSpeed: true,
        thinkingTime: { short: 500, medium: 1200, long: 2500 }
    },
    commands: { randomOrder: false, humanErrors: false, variableTiming: true }
};

// ANIMAL TIERS
const ANIMAL_TIERS = {
    'common': { rate: '58.8489%', xp: 1, emoji: '<:common:41652003771383808>', display: 'Common' },
    'uncommon': { rate: '30%', xp: 3, emoji: '🟢', display: 'Uncommon' },
    'rare': { rate: '10%', xp: 10, emoji: '🔵', display: 'Rare' },
    'epic': { rate: '1%', xp: 250, emoji: '🟣', display: 'Epic' },
    'mythical': { rate: '0.1%', xp: 5000, emoji: '🟠', display: 'Mythical' },
    'legendary': { rate: '0.5%', xp: 1000, emoji: '🟡', display: 'Legendary' },
    'fabled': { rate: '0.01%', xp: 50000, emoji: '🌟', display: 'Fabled' },
    'divine': { rate: '0.05%', xp: 15000, emoji: '💫', display: 'Divine' },
    'special': { rate: '???', xp: 30000, emoji: '🎯', display: 'Special' },
    'box': { rate: 'Depends', xp: 50000, emoji: '📦', display: 'Box' },
    'godly': { rate: '0.001%', xp: 300000, emoji: '👑', display: 'Godly' },
    'event': { rate: 'Depends', xp: 250000, emoji: '🎉', display: 'Event' },
    'hidden': { rate: '0.0001%', xp: 300000, emoji: '<a:hidden:459203677438083074>', display: 'Hidden' }
};

// CONFIG – SIRF ENVIRONMENT VARIABLE SE TOKEN LO
let config = {
    main: {
        token: process.env.TOKEN,  // Railway variable se aayega
        userid: process.env.USER_ID || "YOUR_USER_ID",      // optional
        commandschannelid: process.env.CMD_CHANNEL || "YOUR_CHANNEL_ID"
    },
    settings: {
        autoresume: true,
        humanBehavior: HUMAN_BEHAVIOR,
        intervals: {
            wh: { min: 16000, max: 24000 },
            wb: { min: 17000, max: 26000 },
            pray: { min: 325000, max: 345000 }
        },
        prayConfig: {
            channelid: process.env.PRAY_CHANNEL || "YOUR_PRAY_CHANNEL_ID",
            targetUser: process.env.PRAY_TARGET || "TARGET_USER_ID"
        },
        zooTracking: {
            enabled: true,
            save_file: "zoo_data.txt",
            webhook: {
                enabled: true,
                url: process.env.ZOO_WEBHOOK || "YOUR_ZOO_WEBHOOK_URL",
                update_interval: 10
            }
        },
        captcha: {
            autosolve: true,
            alerttype: {
                desktop: { notification: true, prompt: true, force: false },
                webhook: true,
                webhookurl: process.env.CAPTCHA_WEBHOOK || "YOUR_WEBHOOK_URL",
                termux: { notification: true, vibration: 3000, toast: true }
            }
        }
    }
};

// AGAR TOKEN NAHI MILA TO ERROR
if (!config.main.token) {
    console.error("❌ TOKEN environment variable set nahi hai!");
    process.exit(1);
}

const client = new Client({ checkUpdate: false, syncStatus: false });
const isTermux = process.env.PREFIX && process.env.PREFIX.includes("com.termux");

let botState = {
    name: "RailwayBot", paused: false, captchadetected: false, istermux: isTermux,
    total: { wh: 0, wb: 0, pray: 0, captcha: 0, solvedcaptcha: 0 },
    zoo: {
        common: 0, uncommon: 0, rare: 0, epic: 0, mythical: 0, legendary: 0,
        fabled: 0, divine: 0, special: 0, box: 0, godly: 0, event: 0, hidden: 0,
        total_caught: 0, total_xp: 0, last_update: 0,
        session_start: {
            common: 0, uncommon: 0, rare: 0, epic: 0, mythical: 0, legendary: 0,
            fabled: 0, divine: 0, special: 0, box: 0, godly: 0, event: 0, hidden: 0,
            total_caught: 0, total_xp: 0
        }
    },
    intervals: { wh: null, wb: null, pray: null },
    temp: { started: false, lastCommandTime: 0 }
};

// UTILITY FUNCTIONS
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const humanDelay = (minMs = 800, maxMs = 3500) => delay(Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs);

const simulateHumanTyping = async (channel, message) => {
    if (!config.settings.humanBehavior) return;
    await channel.sendTyping();
    const baseTime = message.length * 20;
    const variation = baseTime * 0.4;
    const totalTime = baseTime + (Math.random() * variation * 2 - variation);
    const words = message.split(' ');
    let currentTime = 0;
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const wordTime = word.length * 25;
        if (i > 0) {
            const pauseTime = 80 + Math.random() * 120;
            await delay(pauseTime);
            currentTime += pauseTime;
        }
        if (Math.random() < 0.1) {
            await delay(200 + Math.random() * 300);
            currentTime += 200 + Math.random() * 300;
        }
        currentTime += wordTime;
    }
    const remainingTime = totalTime - currentTime;
    if (remainingTime > 0) await delay(remainingTime);
    return message;
};

// ZOO TRACKING (shortened)
function detectAnimalTier(msg) {
    const c = msg.toLowerCase();
    if (c.includes('hidden') && c.includes('<a:hidden:459203677438083074>')) return 'hidden';
    if (c.includes('common') && c.includes('<:common:41652003771383808>')) return 'common';
    const tiers = { uncommon: ['uncommon'], rare: ['rare'], epic: ['epic'], mythical: ['mythical'],
        legendary: ['legendary'], fabled: ['fabled'], divine: ['divine'], special: ['special'],
        box: ['box'], godly: ['godly'], event: ['event'] };
    for (const [t, k] of Object.entries(tiers)) if (k.some(kw => c.includes(kw))) return t;
    return null;
}

function updateZooStats(tier) {
    if (!ANIMAL_TIERS[tier]) return;
    botState.zoo[tier]++; botState.zoo.total_caught++; botState.zoo.total_xp += ANIMAL_TIERS[tier].xp;
    botState.zoo.session_start[tier]++; botState.zoo.session_start.total_caught++;
    botState.zoo.session_start.total_xp += ANIMAL_TIERS[tier].xp;
    botState.zoo.last_update = Date.now();
    console.log(`🎯 Animal: ${tier} (+${ANIMAL_TIERS[tier].xp} XP)`);
    if (tier === 'hidden') console.log(`🎉 ULTRA RARE HIDDEN!`);
    if (config.settings.zooTracking?.enabled) saveZooDataSimple();
}

function saveZooDataSimple() {
    if (!config.settings.zooTracking?.enabled) return;
    let content = `ZOO DATA - ${new Date().toLocaleString()}\n\n`;
    for (const [tier, data] of Object.entries(ANIMAL_TIERS)) content += `${data.display}: ${botState.zoo[tier]}\n`;
    content += `\nTotal: ${botState.zoo.total_caught}\nTotal XP: ${botState.zoo.total_xp}`;
    fs.writeFileSync('zoo_data.txt', content);
}

// HUMAN SCHEDULER
class AdvancedHumanScheduler {
    constructor() { this.lastExecution = 0; this.commandHistory = []; }
    async executeWithHumanBehavior(type, fn) {
        const now = Date.now();
        const min = config.settings.humanBehavior.typing.minDelay;
        const max = config.settings.humanBehavior.typing.maxDelay;
        const since = now - this.lastExecution;
        const req = Math.floor(Math.random() * (max - min + 1)) + min;
        if (since < req) await delay(req - since);
        try {
            await fn();
            this.lastExecution = Date.now();
            this.commandHistory.push({ type, timestamp: now });
            if (config.settings.humanBehavior.typing.randomPauses && Math.random() < 0.08)
                await delay(3000 + Math.random() * 7000);
        } catch (e) { console.error(`Error ${type}:`, e); }
    }
    getRandomInterval(type) {
        const int = config.settings.intervals[type];
        if (int?.min && int?.max) return Math.floor(Math.random() * (int.max - int.min + 1)) + int.min;
        return int;
    }
}
const scheduler = new AdvancedHumanScheduler();

// CAPTCHA FUNCTIONS (minimal)
function isWebCaptchaMessage(msg) { return msg.includes(".com") || msg.includes("please use the link"); }

async function sendTermuxNotification(type) { /* same as your original */ }
async function sendWebhookNotification(type) { /* same as your original */ }

client.config = config;
client.basic = config.main;
client.delay = delay;
client.humanDelay = humanDelay;
client.simulateHumanTyping = simulateHumanTyping;
client.global = botState;

// START AUTO COMMANDS
function startAutoCommands() {
    Object.values(botState.intervals).forEach(i => { if (i) clearInterval(i); });
    const cmdId = config.main.commandschannelid;
    if (!cmdId) return console.log("⚠️ No command channel");
    
    botState.intervals.wh = setInterval(async () => {
        if (!botState.paused && !botState.captchadetected) {
            await scheduler.executeWithHumanBehavior('wh', async () => {
                try {
                    const ch = client.channels.cache.get(cmdId);
                    if (ch) { await simulateHumanTyping(ch, "wh"); await ch.send("wh"); botState.total.wh++; }
                } catch (e) { console.error("wh error:", e); }
            });
        }
    }, scheduler.getRandomInterval('wh') || 20000);

    botState.intervals.wb = setInterval(async () => {
        if (!botState.paused && !botState.captchadetected) {
            await scheduler.executeWithHumanBehavior('wb', async () => {
                try {
                    const ch = client.channels.cache.get(cmdId);
                    if (ch) { await simulateHumanTyping(ch, "wb"); await ch.send("wb"); botState.total.wb++; }
                } catch (e) { console.error("wb error:", e); }
            });
        }
    }, scheduler.getRandomInterval('wb') || 21000);

    if (config.settings.prayConfig) {
        const pc = config.settings.prayConfig;
        botState.intervals.pray = setInterval(async () => {
            if (!botState.paused && !botState.captchadetected) {
                await scheduler.executeWithHumanBehavior('pray', async () => {
                    try {
                        const ch = client.channels.cache.get(pc.channelid);
                        if (ch) {
                            await humanDelay(1500,4000);
                            await simulateHumanTyping(ch, `OwOpray ${pc.targetUser}`);
                            await ch.send(`OwOpray ${pc.targetUser}`);
                            botState.total.pray++;
                        }
                    } catch (e) { console.error("pray error:", e); }
                });
            }
        }, scheduler.getRandomInterval('pray') || 330000);
    }
    console.log("✅ Auto commands started");
}

// MESSAGE HANDLER (shortened)
client.on('messageCreate', async (msg) => {
    if (msg.author.id === "408785106942164992") {
        if (msg.content.includes('caught a') && config.settings.zooTracking?.enabled) {
            const tier = detectAnimalTier(msg.content);
            if (tier) { updateZooStats(tier); await humanDelay(500,2000); }
        }
        // captcha detection (your original logic here)
    }
});

// READY
client.on('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    if (!botState.temp.started) { botState.temp.started = true; startAutoCommands(); }
});

// ERROR HANDLING
client.on('error', console.error);
process.on('SIGINT', () => { client.destroy(); process.exit(); });

// LOGIN
client.login(config.main.token);
