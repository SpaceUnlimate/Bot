const { QuickDB } = require("quick.db");
const db = new QuickDB({ filePath: "json.sqlite" }); // تحديد مسار الملف يدوياً بيحل مشاكل كتير
const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // شرط الـ 3 كلمات
        const words = message.content.trim().split(/\s+/);
        if (words.length < 3) return;

        const userId = message.author.id;
        const guildId = message.guild.id;

        try {
            // جلب البيانات (يجب استخدام await)
            let currentMessages = (await db.get(`msgcount_${userId}_${guildId}`)) || 0;
            let currentLevel = (await db.get(`level_${userId}_${guildId}`)) || 1;
            let requiredMessages = (await db.get(`required_${userId}_${guildId}`)) || 100;

            currentMessages++;
            await db.set(`msgcount_${userId}_${guildId}`, currentMessages);

            // التحقق من الترقية
            if (currentMessages >= requiredMessages) {
                currentLevel++;
                let nextTarget = Math.round(requiredMessages * 1.25);

                await db.set(`level_${userId}_${guildId}`, currentLevel);
                await db.set(`msgcount_${userId}_${guildId}`, 0);
                await db.set(`required_${userId}_${guildId}`, nextTarget);

                const levelChannel = message.guild.channels.cache.find(ch => ch.name.includes('اللفلات'));

                const levelUpEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setAuthor({ name: 'ترقية جديدة!', iconURL: message.author.displayAvatarURL() })
                    .setDescription(`مبروك ${message.author}! وصلت لفل **${currentLevel}** ⏫\nتحتاج **${nextTarget}** رسالة للفل القادم.`)
                    .setTimestamp();

                if (levelChannel) {
                    levelChannel.send({ content: `${message.author}`, embeds: [levelUpEmbed] });
                } else {
                    message.channel.send({ content: `مبروك ${message.author} وصلت لفل **${currentLevel}**!` })
                        .then(m => setTimeout(() => m.delete(), 5000));
                }
            }
        } catch (err) {
            console.error("Error in levels.js:", err);
        }
    }
};