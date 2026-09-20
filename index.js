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

// মানুষের মতো আচরণ তৈরির জন্য র্যান্ডম ডিলে (দেরি করার) ফাংশন
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.post('/api/start-bots', (req, res) => {
    const { tokens, vcId } = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0 || !vcId) {
        return res.status(400).json({ error: 'সঠিক টোকেন এবং ভিসি আইডি প্রদান করুন।' });
    }

    tokens.forEach(async (token, index) => {
        if (activeClients[token]) {
            try { activeClients[token].destroy(); } catch(e){}
        }

        // র‍্যাম বাঁচানোর জন্য এবং অফিসিয়াল উইন্ডোজ ক্লায়েন্ট নকল করার সেটিংস
        const client = new Client({ 
            checkUpdate: false,
            syncStatus: false,
            patchVoice: true, // ভয়েস প্রোটোকল স্ট্যাবল রাখার জন্য
            ws: { properties: { \$os: 'Windows', browser: 'Discord Client', release_channel: 'stable' } }
        });
        activeClients[token] = client;

        // একই সাথে সব আইডি জয়েন করে ডিসকর্ডের রেট-লিমিটে পড়া এড়াতে র্যান্ডম গ্যাপ তৈরি
        const waitTime = (index * 6000) + Math.floor(Math.random() * 2000);
        await delay(waitTime);

        const connectToVC = async () => {
            try {
                const channel = await client.channels.fetch(vcId);
                if (channel) {
                    // ভয়েস এক্সপি (Voice XP) নিশ্চিত করার জন্য সম্পূর্ণ আনমিউট ও আনডাফ জয়েন
                    await client.voice.joinChannel(channel, {
                        selfMute: false,  // মিউট থাকবে না (XP পাওয়ার জন্য জরুরি)
                        selfDeaf: false,  // ডেফ থাকবে en (XP পাওয়ার জন্য জরুরি)
                        selfVideo: false  // ক্যামেরা অফ থাকবে র‍্যাম বাঁচানোর জন্য
                    });
                    console.log(`[Voice-XP ID ${index + 1}] ${client.user.tag} আনমিউট অবস্থায় ভিসি-তে সচল আছে।`);
                }
            } catch (err) {
                console.error(`[Voice-XP ID ${index + 1}] ভিসি জয়েন এরর:`, err.message);
                // যদি কোনো কারণে ডিসকানেক্ট হয়, ১০ সেকেন্ড পর আবার অটো-ট্রাই করবে
                setTimeout(connectToVC, 10000);
            }
        };

        client.on('ready', async () => {
            console.log(`[Voice-XP ID ${index + 1}] ${client.user.tag} লগইন সফল!`);
            
            // লগইন সম্পন্ন হওয়ার ৩ সেকেন্ড পর ভিসি চ্যানেলে হিট করবে
            await delay(3000);
            await connectToVC();

            // স্ট্রিমিং লোগো ও টাইমারসহ রিচ প্রেজেন্স
            await delay(2000);
            try {
                const r = new RichPresence(client)
                    .setType('STREAMING')
                    .setURL('https://twitch.tv')
                    .setName('Chithi Ghor')
                    .setStartTimestamp(Date.now()) // কতক্ষণ ধরে ভিসি-তে আছেন তা প্রোফাইলে দেখাবে
                    .setAssetsLargeImage('https://postimg.cc') 
                    .setAssetsLargeText('Chithi Ghor')
                    .addButton('Join Server', 'https://discord.gg'); // আপনার ইনভাইট লিঙ্ক বসাবেন

                client.user.setActivity(r);
            } catch (err) {
                console.error('স্ট্যাটাস সেট এরর:', err.message);
            }
        });

        // 🚨 ডিসকর্ড বা রেন্ডার কানেকশন ড্রপ করলে স্বয়ংক্রিয়ভাবে রিলগইন পলিসি
        client.on('shardDisconnect', () => {
            console.log(`[Voice-XP ID ${index + 1}] কানেকশন ড্রপ করেছে! আবার চেষ্টা করা হচ্ছে...`);
            setTimeout(() => {
                client.login(token).catch(e => console.error("রিলগইন ব্যর্থ:", e.message));
            }, 7000);
        });

        client.login(token).catch(err => {
            console.error(`লগইন ব্যর্থ (ইনডেক্স: ${index + 1}):`, err.message);
        });
    });

    res.json({ message: `${tokens.length}টি অ্যাকাউন্ট Voice-XP সেফ মোডে প্রসেস করা হচ্ছে। অনুগ্রহ করে ডিসকর্ড চেক করুন।` });
});

app.listen(port, () => console.log(`Dashboard running on port ${port}`));
