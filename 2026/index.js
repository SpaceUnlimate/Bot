require('dotenv').config();
const { 
    Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder, 
    REST, Routes, PermissionsBitField, ActivityType, Collection 
} = require('discord.js');
const http = require('http');
const mongoose = require('mongoose');

// 1. استدعاء موديل البيانات (تأكد من وجود ملف User.js)
const User = require('./User.js'); 

// 2. خادم الويب للبقاء أونلاين
http.createServer((req, res) => {
    res.write("ABRO System is Online & Protected");
    res.end();
}).listen(8080);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// 3. الاتصال بـ MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://maranino056:amr666xom@cluster0.cckk9ap.mongodb.net/?appName=Cluster0')
    .then(() => console.log('✅ تم الاتصال بقاعدة بيانات MongoDB بنجاح!'))
    .catch((err) => console.error('❌ فشل الاتصال بـ MongoDB:', err));

// مخازن البيانات
client.commands = new Collection();
client.customSlowmode = new Map();
const msgLog = new Map();
const userWarnings = new Map();
const personalCooldowns = new Map();

// 4. تحميل الأوامر من ملف pings.js
const commandsJSON = [];
try {
    const pingsCommands = require('./commands/pings.js'); 
    if (Array.isArray(pingsCommands)) {
        pingsCommands.forEach(cmd => {
            if (cmd.data && cmd.execute) {
                client.commands.set(cmd.data.name, cmd);
                commandsJSON.push(cmd.data.toJSON());
            }
        });
        console.log(`✅ تم تحميل ${pingsCommands.length} أمر من ملف pings.js`);
    }
} catch (error) {
    console.error('❌ فشل تحميل ملف pings.js:', error.message);
}

// تسجيل الأوامر عند ديسكورد
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commandsJSON });
        console.log('✅ تم تحديث أوامر الـ Slash بنجاح!');
    } catch (e) { console.error('❌ خطأ في تحديث الأوامر:', e); }
})();

// 5. أحداث التشغيل
client.once('ready', (c) => {
    console.log(`✅ المتصل الآن: ${c.user.tag}`);
});

// 6. نظام الترحيب
client.on('guildMemberAdd', async (member) => {
    const ch = member.guild.channels.cache.find(c => 
        c.name.includes('ترحيب') || c.name.toLowerCase().includes('welcome')
    );
    if (ch) {
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#2f3136')
            .setTitle(`مرحباً بك في ${member.guild.name}`)
            .setDescription(`أهلاً بك يا ${member}، نورت السيرفر! نحن الآن **${member.guild.memberCount}** عضواً.`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();
        ch.send({ embeds: [welcomeEmbed] }).catch(() => {});
    }
});

// 7. المحرك الرئيسي للرسائل (الحماية + الليفيلات + السلو مود)
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const { author, member, content, guild, channel } = message;
    const now = Date.now();

    // --- أولاً: نظام الـ Slowmode Custom ---
    if (client.customSlowmode.has(channel.id)) {
        const config = client.customSlowmode.get(channel.id);
        const lastSeen = config.users.get(author.id) || 0;
        if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            if (now - lastSeen < config.cooldown) {
                return message.delete().catch(() => {});
            }
            config.users.set(author.id, now);
        }
    }

    // --- ثانياً: نظام الرقابة والإنذارات ---
    if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        // فحص السلو مود الشخصي
        if (personalCooldowns.has(author.id)) {
            const cooldownData = personalCooldowns.get(author.id);
            if (now < cooldownData.expiration) return message.delete().catch(() => {});
        }

        // كشف التكرار
        let warndata = userWarnings.get(author.id) || { count: 0 };
        let userMsgData = msgLog.get(author.id) || { count: 0, lastMessage: '' };

        if (userMsgData.lastMessage === content) {
            userMsgData.count++;
            if (warndata.count > 0 && userMsgData.count >= 2) {
                return triggerWarning(message, warndata, author, guild, now);
            }
        } else {
            userMsgData.count = 1;
            userMsgData.lastMessage = content;
        }
        msgLog.set(author.id, userMsgData);

        if (userMsgData.count >= 4 && warndata.count === 0) {
            return triggerWarning(message, warndata, author, guild, now);
        }
    }

    // --- ثالثاً: نظام الليفيلات (MongoDB) ---
    if (content.length >= 3) {
        try {
            let userData = await User.findOne({ userId: author.id, guildId: guild.id });
            if (!userData) {
                userData = await User.create({ userId: author.id, guildId: guild.id });
            }

            userData.xp += 1;

            if (userData.xp >= userData.requiredXP) {
                userData.xp = 0;
                userData.level += 1;
                userData.requiredXP = Math.round(userData.requiredXP * 1.5);
                
                const levelChannel = guild.channels.cache.find(c => c.name.includes('اللفلات'));
                if (levelChannel) {
                    levelChannel.send(`🎉 كفو يا ${author}! مستواك زاد وبقيت لفل **${userData.level}**`);
                }
            }
            await userData.save();
        } catch (err) {
            console.error("❌ خطأ ليفلات:", err);
        }
    }
});

// 8. وظيفة معالجة الإنذارات
async function triggerWarning(message, warndata, author, guild, now) {
    warndata.count++;
    userWarnings.set(author.id, warndata);
    message.delete().catch(() => {});
    msgLog.set(author.id, { count: 0, lastMessage: '' });

    if (warndata.count === 1) {
        personalCooldowns.set(author.id, { expiration: now + 10000 });
        const emb1 = new EmbedBuilder().setColor('#FFFF00').setTitle(`⚠️ تنبيه`).setDescription('رصد تكرار. رقابة 10 ثوانٍ.');
        await author.send({ embeds: [emb1] }).catch(() => {});
    } 
    else if (warndata.count === 2) {
        personalCooldowns.set(author.id, { expiration: now + 20000 });
        const emb2 = new EmbedBuilder().setColor('#FFA500').setTitle(`🚫 تحذير أخير`).setDescription('التكرار القادم = حظر 10 أيام.');
        await author.send({ embeds: [emb2] }).catch(() => {});
    } 
    else if (warndata.count >= 3) {
        const emb3 = new EmbedBuilder().setColor('#FF0000').setTitle(`❌ حظر مؤقت`).setDescription('تم حظرك 10 أيام.');
        await author.send({ embeds: [emb3] }).catch(() => {});
        await message.member.ban({ reason: 'تخريب مستمر' }).catch(() => {});
        setTimeout(async () => {
            await guild.members.unban(author.id).catch(() => {});
        }, 10 * 24 * 60 * 60 * 1000);
        userWarnings.delete(author.id);
    }
}

// 9. تنفيذ التفاعلات (Slash Commands & Buttons)
client.on('interactionCreate', async (interaction) => {
    // الأوامر
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ حدث خطأ!', flags: [64] });
            }
        }
    } 
    // الأزرار
    else if (interaction.isButton()) {
        if (interaction.customId.startsWith('unban_')) {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return interaction.reply({ content: '❌ لا تملك صلاحية!', flags: [64] });
            }
            const userId = interaction.customId.split('_')[1];
            try {
                await interaction.guild.members.unban(userId);
                await interaction.update({ content: `✅ تم فك الحظر!`, embeds: [], components: [] });
            } catch (e) {
                await interaction.reply({ content: '❌ فشل فك الحظر.', flags: [64] });
            }
        }
    }
});

// 10. مانع الكراش النهائي
process.on('unhandledRejection', (reason) => console.error(' [Anti-Crash] Promise:', reason));
process.on('uncaughtException', (err) => console.error(' [Anti-Crash] Exception:', err));

client.login(process.env.TOKEN);