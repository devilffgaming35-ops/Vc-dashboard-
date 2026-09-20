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

// সচল আইডিগুলো এবং তাদের ভিসি আইডি ট্র্যাক করার গ্লোবাল অবজেক্ট
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

        // র‍্যাম বাঁচানোর জন্য অপ্রয়োজনীয় ক্যাশ ও ইভেন্ট বন্ধ রাখা হয়েছে
        const client = new Client({ 
            checkUpdate: false,
            syncStatus: false,
            patchVoice: true
        });
        activeClients[token] = client;

        // ভিসি জয়েন করার জন্য একটি রিইউজেবল ফাংশন
        const connectToVC = async () => {
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
                // যদি কোনো কারণে জয়েন করতে না পারে, তবে ৫ সেকেন্ড পর আবার চেষ্টা করবে
                setTimeout(connectToVC, 5000);
            }
        };

        client.on('ready', async () => {
            console.log(`[Dashboard ID ${index + 1}] ${client.user.tag} লগইন সফল!`);
            
            // ভিসি-তে জয়েন করা
            await connectToVC();

            // লোগো ও টাইমারসহ স্ট্রিমিং স্ট্যাটাস (Watching Chithi Ghor)
            try {
                const r = new RichPresence(client)
                    .setType('STREAMING')
                    .setURL('https://twitch.tv')
                    .setName('Chithi Ghor')
                    .setStartTimestamp(Date.now())
                    .setAssetsLargeImage('https://postimg.cc') 
                    .setAssetsLargeText('Chithi Ghor')
                    .addButton('Join Server', 'https://discord.gg'); 

                client.user.setActivity(r);
            } catch (err) {
                console.error('স্ট্যাটাস সেট এরর:', err.message);
            }
        });

        // 🚨 মোস্ট ইম্পর্ট্যান্ট: যদি আইডি কোনো কারণে ডিসকর্ড বা রেন্ডার থেকে ডিসকানেক্ট হয়ে যায়
        client.on('shardDisconnect', () => {
            console.log(`[Dashboard ID ${index + 1}] ডিসকানেক্ট হয়েছে! আবার কানেক্ট করার চেষ্টা করা হচ্ছে...`);
            setTimeout(() => {
                client.login(token).catch(e => console.error("রিলগইন ব্যর্থ:", e.message));
            }, 5000);
        });

        client.login(token).catch(err => {
            console.error(`টোকেন লগইন ব্যর্থ (ইনডেক্স: ${index + 1}):`, err.message);
        });
    });

    res.json({ message: `${tokens.length}টি অ্যাকাউন্ট প্রসেস করা শুরু হয়েছে! কয়েক সেকেন্ড পর ডিসকর্ড চেক করুন।` });
});

app.listen(port, () => console.log(`Dashboard running on port ${port}`));
