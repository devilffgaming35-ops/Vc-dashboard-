const { Client, RichPresence } = require('discord.js-selfbot-v13');
const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

// সরাসরি একই ডিরেক্টরি থেকে index.html ফাইলটি ব্রাউজারে শো করার কোড
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const port = process.env.PORT || 8080; 

// সচল আইডিগুলো জমা রাখার গ্লোবাল অবজেক্ট
const activeClients = {};

app.post('/api/start-bots', (req, res) => {
    const { tokens, vcId } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0 || !vcId) {
        return res.status(400).json({ error: 'সঠিক টোকেন এবং ভিসি আইডি প্রদান করুন।' });
    }

    tokens.forEach((token, index) => {
        if (activeClients[token]) {
            try { activeClients[token].destroy(); } catch(e){}
        }

        const client = new Client({ checkUpdate: false });
        activeClients[token] = client;

        client.on('ready', async () => {
            console.log(`[Dashboard ID ${index + 1}] ${client.user.tag} লগইন সফল!`);
            
            // ১. নির্দিষ্ট ভিসি চ্যানেলে ১০০% আনমিউট হয়ে জয়েন করানো
            try {
                const channel = await client.channels.fetch(vcId);
                if (channel) {
                    await client.voice.joinChannel(channel, {
                        selfMute: false, 
                        selfDeaf: false  
                    });
                    console.log(`[Dashboard ID ${index + 1}] আনমিউট অবস্থায় ভিসি-তে জয়েন করেছে।`);
                }
            } catch (err) {
                console.error(`ভিসি জয়েন এরর (${client.user.tag}):`, err.message);
            }

            // ২. লোগো ও টাইমারসহ স্ট্রিমিং স্ট্যাটাস (Watching Chithi Ghor)
            try {
                const r = new RichPresence(client)
                    .setType('STREAMING')
                    .setURL('https://twitch.tv')
                    .setName('Chithi Ghor')
                    .setStartTimestamp(Date.now())
                    .setAssetsLargeImage('https://postimg.cc') 
                    .setAssetsLargeText('Chithi Ghor')
                    // ⚠️ নিচের লিঙ্কের জায়গায় আপনার আসল ডিসকর্ড সার্ভারের ইনভাইট লিঙ্কটি বসিয়ে দিন
                    .addButton('Join Server', 'https://discord.gg'); 

                client.user.setActivity(r);
                console.log(`[Dashboard ID ${index + 1}] কাস্টম রিচ প্রেজেন্স সেট হয়েছে।`);
            } catch (err) {
                console.error('স্ট্যাটাস সেট এরর:', err.message);
            }
        });

        client.login(token).catch(err => {
            console.error(`টোকেন লগইন ব্যর্থ (ইনডেক্স: ${index + 1}):`, err.message);
        });
    });

    res.json({ message: `${tokens.length}টি অ্যাকাউন্ট প্রসেস করা শুরু হয়েছে! কয়েক সেকেন্ড পর ডিসকর্ড চেক করুন।` });
});

app.listen(port, () => console.log(`Dashboard running on port ${port}`));
