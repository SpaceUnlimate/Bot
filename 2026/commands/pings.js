const { 
    SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, 
    StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType 
} = require('discord.js');
const mongoose = require('mongoose');
const User = require('../User.js');
module.exports = [
    // ... أي أوامر تانية عندك زي ping ...
    
    {
        // 1. تعريف الأمر (Data)
        data: new SlashCommandBuilder()
            .setName('clear')
            .setDescription('مسح كمية معينة من الرسائل (للأدمن فقط)')
            .addIntegerOption(option => 
                option.setName('amount')
                .setDescription('عدد الرسائل المراد مسحها (1-100)')
                .setRequired(true)),

        // 2. تنفيذ الأمر (Execute)
        async execute(interaction) {
            // التحقق من الصلاحيات.[.]
            await interaction.deferReply({ flags: [64] }); 

    try {
        // ... كود الداتابيز بتاعك ...
        
        // عند الرد نستخدم editReply بدلاً من reply
        await interaction.editReply({ content: '✅ تمت العملية بنجاح' });
    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: '❌ حدث خطأ بسيط لكن البوت مازال يعمل.' });
    }
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                return interaction.reply({ content: '❌ ليس لديك صلاحية مسح الرسائل!', ephemeral: true });
            }

            const amount = interaction.options.getInteger('amount');

            if (amount < 1 || amount > 100) {
                return interaction.reply({ content: '❌ يجب أن يكون العدد بين 1 و 100.', ephemeral: true });
            }

            try {
                const deleted = await interaction.channel.bulkDelete(amount, true);
                await interaction.reply({ content: `🧹 تم مسح **${deleted.size}** رسالة بنجاح.`, ephemeral: true });
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: '❌ فشل المسح: قد تكون الرسائل أقدم من 14 يوم.', ephemeral: true });
            }
        }
    },
    {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('إعطاء أو إزالة رتبة من عضو معين')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('العضو المراد تعديل رتبته')
                .setRequired(true))
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('الرتبة المراد إضافتها أو إزالتها')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ flags: [64] }); 

    try {
        // ... كود الداتابيز بتاعك ...
        
        // عند الرد نستخدم editReply بدلاً من reply
        await interaction.editReply({ content: '✅ تمت العملية بنجاح' });
    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: '❌ حدث خطأ بسيط لكن البوت مازال يعمل.' });
    }
        // 1. التحقق من صلاحيات الأدمن اللي بيستخدم الأمر
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية إدارة الرتب!', ephemeral: true });
        }

        const targetMember = interaction.options.getMember('user');
        const role = interaction.options.getRole('role');

        // 2. التحقق من أن العضو موجود في السيرفر
        if (!targetMember) {
            return interaction.reply({ content: '❌ لم يتم العثور على هذا العضو.', ephemeral: true });
        }

        // 3. التحقق من رتبة البوت (لازم رتبة البوت تكون أعلى من الرتبة اللي بيحاول يديها)
        const botMember = interaction.guild.members.me;
        if (role.position >= botMember.roles.highest.position) {
            return interaction.reply({ content: '❌ لا أستطيع التحكم بهذه الرتبة لأنها أعلى مني أو في نفس مستواي!', ephemeral: true });
        }

        try {
            // 4. منطق التبديل (لو معاه الرتبة يشيلها، لو مش معاه يديها له)
            if (targetMember.roles.cache.has(role.id)) {
                await targetMember.roles.remove(role);
                const removeEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setDescription(`✅ تم إزالة رتبة ${role} من **${targetMember.user.tag}** بنجاح.`);
                return interaction.reply({ embeds: [removeEmbed], ephemeral: true });
            } else {
                await targetMember.roles.add(role);
                const addEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setDescription(`✅ تم إعطاء رتبة ${role} لـ **${targetMember.user.tag}** بنجاح.`);
                return interaction.reply({ embeds: [addEmbed], ephemeral: true });
            }
        } catch (error) {
            console.error(error);
            return interaction.reply({ content: '❌ حدث خطأ أثناء محاولة تعديل الرتبة.', ephemeral: true });
        }
    }
    },
   {
        data: new SlashCommandBuilder()
            .setName('userinfo')
            .setDescription('عرض ملف العضو السري (للإدارة فقط)')
            .addUserOption(option => option.setName('target').setDescription('العضو المراد فحصه').setRequired(true)),

        async execute(interaction) {
            // 1. التحقق من صلاحية الإدارة (للأدمن فقط)
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: '❌ هذا الأمر مخصص للإدارة فقط لرؤية سجلات الأعضاء.', flags: [64] });
            }

            const targetUser = interaction.options.getUser('target');
            const targetMember = await interaction.guild.members.fetch(targetUser.id);

            // 2. جلب بيانات العضو من MongoDB (الليفيل والاكس بي)
            let userData = await User.findOne({ userId: targetUser.id, guildId: interaction.guild.id });
            const levelInfo = userData ? `**Level:** ${userData.level} | **XP:** ${userData.xp}/${userData.requiredXP}` : 'لا توجد بيانات (لم يتفاعل بعد)';

            // 3. فحص أهم الصلاحيات اللي معاه (بيانات خاصة للإدارة)
            const keyPermissions = [];
            if (targetMember.permissions.has(PermissionsBitField.Flags.Administrator)) keyPermissions.push('مدير كامل');
            if (targetMember.permissions.has(PermissionsBitField.Flags.BanMembers)) keyPermissions.push('حظر أعضاء');
            if (targetMember.permissions.has(PermissionsBitField.Flags.ManageMessages)) keyPermissions.push('مسح رسائل');
            if (targetMember.permissions.has(PermissionsBitField.Flags.MentionEveryone)) keyPermissions.push('منشن للكل');
            
            const permsDisplay = keyPermissions.length > 0 ? keyPermissions.join(' - ') : 'صلاحيات عادية';

            // 4. تصميم الـ Embed الخاص
            const adminEmbed = new EmbedBuilder()
                .setAuthor({ name: `📋 تقرير إداري عن: ${targetUser.username}`, iconURL: targetUser.displayAvatarURL() })
                .setColor('#2b2d31') // لون غامق فخم
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
                .addFields(
                    { name: '🆔 معرف الحساب', value: `\`${targetUser.id}\``, inline: true },
                    { name: '📅 عمر الحساب', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: '📥 انضمام للسيرفر', value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:f>`, inline: false },
                    { name: '📊 مستوى التفاعل (MongoDB)', value: levelInfo, inline: false },
                    { name: '🛡️ الصلاحيات الحساسة', value: `\`${permsDisplay}\``, inline: true },
                    { name: '🎨 لون الرتبة', value: `\`${targetMember.displayHexColor}\``, inline: true },
                    { name: '🎭 جميع الرتب', value: targetMember.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.toString()).join(' ') || 'بدون رتب' }
                )
                .setFooter({ text: `تم الفحص بواسطة: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            // 5. الرد (اجعل الرد Ephemeral لو عايز الإدارة بس اللي تشوفه في الشات)
            await interaction.reply({ embeds: [adminEmbed], flags: [64] });
        }
    },
{
        data: new SlashCommandBuilder()
            .setName('slowmode_custom')
            .setDescription('تحديد وقت انتظار مخصص لإرسال الرسائل في الروم')
            .addIntegerOption(opt => 
                opt.setName('seconds')
                    .setDescription('عدد الثواني (0 للإلغاء)')
                    .setRequired(true)),

        async execute(interaction) {
            // 1. التحقق من الصلاحيات
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return interaction.reply({ content: '❌ محتاج صلاحية إدارة الرومات!', flags: [64] });
            }

            const seconds = interaction.options.getInteger('seconds');
            const channelId = interaction.channel.id;

            // 2. الوصول لـ Map السلو مود المعرفة في index.js
            // ملحوظة: بنستخدم interaction.client للوصول للـ Map
            if (seconds === 0) {
                interaction.client.customSlowmode.delete(channelId);
                return interaction.reply({ content: `✅ تم إلغاء السلو مود المخصص في هذا الروم.` });
            }

            // 3. تخزين الإعدادات
            interaction.client.customSlowmode.set(channelId, {
                cooldown: seconds * 1000, // تحويل لملي ثانية
                users: new Map() // ماب لتخزين وقت آخر رسالة لكل مستخدم
            });

            // 4. الرد ببيانات حقيقية (مش كلمة وخلاص)
            const slowEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('⏱️ نظام السلو مود المخصص')
                .setDescription(`تم تفعيل وقت انتظار **${seconds} ثانية** في هذا الروم.\n\n⚠️ **ملاحظة:** هذا النظام يعمل بجانب نظام ديسكورد الأساسي ويقوم بمسح الرسائل تلقائياً.`)
                .setFooter({ text: `تم بواسطة: ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.reply({ embeds: [slowEmbed] });
        }
    },
{
        data: new SlashCommandBuilder()
            .setName('nick')
            .setDescription('تغيير لقب عضو في السيرفر')
            .addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true))
            .addStringOption(opt => opt.setName('name').setDescription('اللقب الجديد').setRequired(true)),
        async execute(interaction) {
            await interaction.deferReply({ flags: [64] }); 

    try {
        // ... كود الداتابيز بتاعك ...
        
        // عند الرد نستخدم editReply بدلاً من reply
        await interaction.editReply({ content: '✅ تمت العملية بنجاح' });
    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: '❌ حدث خطأ بسيط لكن البوت مازال يعمل.' });
    }
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageNicknames)) return interaction.reply({ content: '❌ لا تملك صلاحية!', flags: [64] });
            const member = interaction.options.getMember('user');
            const name = interaction.options.getString('name');
            await member.setNickname(name);
            await interaction.reply({ content: `✅ تم تغيير لقب ${member} إلى **${name}**`, flags: [64] });
        }
    },

    // 3. أمر صانع الإعلانات (embed-say)
    {
        data: new SlashCommandBuilder()
            .setName('embed-say')
            .setDescription('إرسال رسالة في قالب Embed')
            .addStringOption(opt => opt.setName('title').setDescription('العنوان').setRequired(true))
            .addStringOption(opt => opt.setName('message').setDescription('محتوى الرسالة').setRequired(true))
            .addStringOption(opt => opt.setName('color').setDescription('اللون (مثال: #ff0000)').setRequired(false)),
        async execute(interaction) {
            await interaction.deferReply({ flags: [64] }); 

    try {
        // ... كود الداتابيز بتاعك ...
        
        // عند الرد نستخدم editReply بدلاً من reply
        await interaction.editReply({ content: '✅ تمت العملية بنجاح' });
    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: '❌ حدث خطأ بسيط لكن البوت مازال يعمل.' });
    }
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return interaction.reply({ content: '❌ لا تملك صلاحية!', flags: [64] });
            const title = interaction.options.getString('title');
            const msg = interaction.options.getString('message');
            const color = interaction.options.getString('color') || '#5865F2';
            const embed = new EmbedBuilder().setTitle(title).setDescription(msg).setColor(color).setTimestamp();
            await interaction.channel.send({ embeds: [embed] });
            await interaction.reply({ content: '✅ تم الإرسال', flags: [64] });
        }
    },

    // 4. أمر التطهير النووي (nuke)
    {
        data: new SlashCommandBuilder()
            .setName('nuke')
            .setDescription('تطهير القناة ومسح كل الرسائل فيها'),
        async execute(interaction) {
            await interaction.deferReply({ flags: [64] }); 

    try {
        // ... كود الداتابيز بتاعك ...
        
        // عند الرد نستخدم editReply بدلاً من reply
        await interaction.editReply({ content: '✅ تمت العملية بنجاح' });
    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: '❌ حدث خطأ بسيط لكن البوت مازال يعمل.' });
    }
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ تحذير: هذا الأمر مخصص للإدارة العليا (Lv.3) فقط!', flags: [64] });
}
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: '❌ للأدمن فقط!', flags: [64] });
            const position = interaction.channel.position;
            const newChannel = await interaction.channel.clone();
            await interaction.channel.delete();
            await newChannel.setPosition(position);
            await newChannel.send({ content: 'https://tenor.com/view/explosion-mushroom-cloud-atomic-bomb-bomb-boom-gif-4464831' });
            await newChannel.send({ content: `**تم تطهير القناة بواسطة: ${interaction.user.tag}**` });
        }
    },

    // 5. أمر سلو مود ديسكورد (slowmode)
    {
        data: new SlashCommandBuilder()
            .setName('slowmode')
            .setDescription('تغيير سلو مود القناة الرسمي')
            .addIntegerOption(opt => opt.setName('seconds').setDescription('الثواني').setRequired(true)),
        async execute(interaction) {
            await interaction.deferReply({ flags: [64] }); 

    try {
        // ... كود الداتابيز بتاعك ...
        
        // عند الرد نستخدم editReply بدلاً من reply
        await interaction.editReply({ content: '✅ تمت العملية بنجاح' });
    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: '❌ حدث خطأ بسيط لكن البوت مازال يعمل.' });
    }
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return interaction.reply({ content: '❌ لا تملك صلاحية!', flags: [64] });
            const sec = interaction.options.getInteger('seconds');
            await interaction.channel.setRateLimitPerUser(sec);
            await interaction.reply({ content: `✅ تم ضبط السلو مود على **${sec}** ثانية.`, flags: [64] });
        }
    },

    // 6. أمر إخفاء وإظهار الروم (hide/show)
    {
        data: new SlashCommandBuilder()
            .setName('channel')
            .setDescription('إخفاء أو إظهار القناة')
            .addStringOption(opt => opt.setName('action').setDescription('اختر الإجراء').setRequired(true).addChoices(
                { name: 'إخفاء (Hide)', value: 'hide' },
                { name: 'إظهار (Show)', value: 'show' }
            )),
        async execute(interaction) {
            await interaction.deferReply({ flags: [64] }); 

    try {
        // ... كود الداتابيز بتاعك ...
        
        // عند الرد نستخدم editReply بدلاً من reply
        await interaction.editReply({ content: '✅ تمت العملية بنجاح' });
    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: '❌ حدث خطأ بسيط لكن البوت مازال يعمل.' });
    }
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return interaction.reply({ content: '❌ هذا الأمر يتطلب صلاحيات الإدارة (Lv.2) فما فوق.', flags: [64] });
            }
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return interaction.reply({ content: '❌ لا تملك صلاحية!', flags: [64] });
            const action = interaction.options.getString('action');
            if (action === 'hide') {
                await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false });
                await interaction.reply({ content: '✅ تم إخفاء القناة عن الجميع.' });
            } else {
                await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: true });
                await interaction.reply({ content: '✅ تم إظهار القناة للجميع.' });
            }
        }
    },

    // 7. قائمة المطرودين (ban-list)
  {
        data: new SlashCommandBuilder()
            .setName('ban-list')
            .setDescription('عرض قائمة الأعضاء المحظورين من السيرفر'),

        async execute(interaction) {
            // 1. التحقق من الصلاحيات (إدارة الرسائل أو الحظر)
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return interaction.reply({ content: '❌ ليس لديك صلاحية لرؤية قائمة الحظر.', flags: [64] });
            }

            // 2. الانتظار لأن جلب قائمة الحظر قد يستغرق وقتاً
            await interaction.deferReply({ flags: [64] });

            try {
                // 3. جلب قائمة الحظر من السيرفر
                const bans = await interaction.guild.bans.fetch();
                
                if (bans.size === 0) {
                    return interaction.editReply('✅ لا يوجد أعضاء محظورون في هذا السيرفر حالياً.');
                }

                // 4. تجهيز القائمة (عرض أول 15 شخص لتجنب تخطي حد حروف ديسكورد)
                const list = bans.map(b => `• **${b.user.tag}** (ID: ${b.user.id})`).slice(0, 15).join('\n');

                const banEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle(`🚫 قائمة المحظورين في ${interaction.guild.name}`)
                    .setDescription(list)
                    .setFooter({ text: `إجمالي المحظورين: ${bans.size}` })
                    .setTimestamp();

                await interaction.editReply({ embeds: [banEmbed] });

            } catch (error) {
                console.error("خطأ في جلب قائمة الحظر:", error);
                await interaction.editReply('❌ فشل جلب قائمة الحظر. تأكد أن البوت يمتلك صلاحية `Ban Members`.');
            }
        }
    },

    // 8. رتبة للجميع (role-all)
    {
        data: new SlashCommandBuilder()
            .setName('role-all')
            .setDescription('إعطاء رتبة لجميع أعضاء السيرفر')
            .addRoleOption(opt => opt.setName('role').setDescription('الرتبة').setRequired(true)),
        async execute(interaction) {
            await interaction.deferReply({ flags: [64] }); 

    try {
        // ... كود الداتابيز بتاعك ...
        
        // عند الرد نستخدم editReply بدلاً من reply
        await interaction.editReply({ content: '✅ تمت العملية بنجاح' });
    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: '❌ حدث خطأ بسيط لكن البوت مازال يعمل.' });
    }
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '❌ تحذير: هذا الأمر مخصص للإدارة العليا (Lv.3) فقط!', flags: [64] });
            }
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: '❌ للأدمن فقط!', flags: [64] });
            const role = interaction.options.getRole('role');
            await interaction.reply({ content: '⏳ جاري إعطاء الرتبة للجميع، قد يستغرق هذا وقتاً...', flags: [64] });
            interaction.guild.members.cache.forEach(member => member.roles.add(role).catch(() => {}));
            await interaction.editReply({ content: `✅ تم إعطاء رتبة ${role.name} للجميع.` });
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('report')
            .setDescription('تسجيل واقعة بين طرفين (للأدمن فقط)')
            .addUserOption(option => 
                option.setName('party1')
                    .setDescription('الطرف الأول')
                    .setRequired(true))
            .addUserOption(option => 
                option.setName('party2')
                    .setDescription('الطرف الثاني')
                    .setRequired(true))
            .addStringOption(option => 
                option.setName('reason')
                    .setDescription('السبب')
                    .setRequired(true)),

        async execute(interaction) {
            await interaction.deferReply({ flags: [64] }); 

    try {
        // ... كود الداتابيز بتاعك ...
        
        // عند الرد نستخدم editReply بدلاً من reply
        await interaction.editReply({ content: '✅ تمت العملية بنجاح' });
    } catch (error) {
        console.error(error);
        await interaction.editReply({ content: '❌ حدث خطأ بسيط لكن البوت مازال يعمل.' });
    }
            // التحقق من الصلاحية
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                return interaction.reply({ content: '❌ للأدمن فقط!', flags: [64] });
            }

            await interaction.deferReply({ flags: [64] }); 

            const p1 = interaction.options.getUser('سبب المشكلة');
            const p2 = interaction.options.getUser('الشخص الثاني');
            const reason = interaction.options.getString('reason');

            // --- التعديل هنا: حط الـ ID اللي نسخته مكان الأصفار ---
            const reportChannelId = '1466068183260860561'; 
            // ----------------------------------------------------

            // جلب القناة مباشرة بالـ ID
            const reportChannel = interaction.guild.channels.cache.get(reportChannelId) 
                               || await interaction.guild.channels.fetch(reportChannelId).catch(() => null);

            if (!reportChannel) {
                return interaction.editReply({ content: '❌ فشل العثور على القناة حتى باستخدام الـ ID. تأكد من وجود البوت بالسيرفر.' });
            }

            const adminReportEmbed = new EmbedBuilder()
                .setColor('#2F3136')
                .setTitle('📝 تقرير واقعة إداري')
                .addFields(
                    { name: '🕵️ المسؤول:', value: `${interaction.user}`, inline: false },
                    { name: '👤سبب المشكلة:', value: `${p1} (\`${p1.id}\`)`, inline: true },
                    { name: '👤 الطرف الثاني:', value: `${p2} (\`${p2.id}\`)`, inline: true },
                    { name: '📄 السبب:', value: `\`\`\`${reason}\`\`\`` }
                )
                .setTimestamp();

            try {
                await reportChannel.send({ embeds: [adminReportEmbed] });
                // حذف الرد تماماً لإخفاء أثر الأمر
                await interaction.deleteReply().catch(() => {});
            } catch (error) {
                console.error(error);
                await interaction.editReply({ content: '❌ فشل الإرسال. تأكد أن البوت يمتلك صلاحية View Channel في هذه القناة.' });
            }
        }
    },
   {
        data: new SlashCommandBuilder()
            .setName('rank')
            .setDescription('عرض بطاقة مستواك')
            .addUserOption(opt => opt.setName('user').setDescription('العضو')),

        async execute(interaction) {
            await interaction.deferReply({ flags: [64] });
            const target = interaction.options.getUser('user') || interaction.user;
            try {
                let userData = await User.findOne({ userId: target.id, guildId: interaction.guild.id });
                if (!userData) userData = await User.create({ userId: target.id, guildId: interaction.guild.id });

                const percentage = Math.min(Math.floor((userData.xp / userData.requiredXP) * 100), 100);
                const bar = '🟩'.repeat(Math.round(percentage / 10)) + '⬛'.repeat(10 - Math.round(percentage / 10));

                const embed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle(`إحصائيات ${target.username}`)
                    .addFields(
                        { name: '🆙 المستوى', value: `\`${userData.level}\``, inline: true },
                        { name: '✨ التقدم', value: `${bar} (${percentage}%)` },
                        { name: '📊 XP', value: `${userData.xp} / ${userData.requiredXP}` }
                    );
                await interaction.editReply({ embeds: [embed] });
            } catch (e) {
                await interaction.editReply('❌ خطأ في جلب بيانات MongoDB.');
            }
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('add-xp')
            .setDescription('إضافة XP لعضو (Lv.3)')
            .addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true))
            .addIntegerOption(opt => opt.setName('amount').setDescription('الكمية').setRequired(true)),

        async execute(interaction) {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: '❌ للأدمن فقط!', flags: [64] });
            }
            await interaction.deferReply({ flags: [64] });
            const target = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');

            try {
                let userData = await User.findOne({ userId: target.id, guildId: interaction.guild.id });
                if (!userData) userData = await User.create({ userId: target.id, guildId: interaction.guild.id });

                userData.xp += amount;
                let levelsGained = 0;
                while (userData.xp >= userData.requiredXP) {
                    userData.xp -= userData.requiredXP;
                    userData.level += 1;
                    levelsGained++;
                    userData.requiredXP = Math.round(userData.requiredXP * 1.5);
                }
                await userData.save();
                await interaction.editReply(`✅ تم إضافة **${amount} XP** لـ ${target}. (زاد **${levelsGained}** لفل)`);
            } catch (e) {
                await interaction.editReply('❌ فشل تحديث قاعدة البيانات.');
            }
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('level-up')
            .setDescription('رفع مستوى عضو معين (للإدارة فقط)')
            .addUserOption(option => option.setName('user').setDescription('العضو المراد رفع مستواه').setRequired(true))
            .addIntegerOption(option => option.setName('levels').setDescription('عدد المستويات').setRequired(true)),

        async execute(interaction) {
            // 1. التحقق من الصلاحيات
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: 'يحتاج رتبة اعلى1', flags: [64] });
            }

            // 2. استخدام deferReply لتجنب خطأ التأخير
            await interaction.deferReply({ flags: [64] });

            const target = interaction.options.getUser('user');
            const levelsToAdd = interaction.options.getInteger('levels');

            try {
                // 3. التعامل مع MongoDB بدلاً من db
                let userData = await User.findOne({ userId: target.id, guildId: interaction.guild.id });
                
                if (!userData) {
                    userData = await User.create({ userId: target.id, guildId: interaction.guild.id });
                }

                // تحديث البيانات
                userData.level += levelsToAdd;
                // إعادة تعيين الـ XP المطلوب بناءً على اللفل الجديد
                for (let i = 0; i < levelsToAdd; i++) {
                    userData.requiredXP = Math.round(userData.requiredXP * 1.5);
                }
                userData.xp = 0; // تصفير الاكس بي الحالي للبدء في اللفل الجديد

                await userData.save();

                // 4. الرد باستخدام editReply (مهم جداً لتجنب خطأ InteractionAlreadyReplied)
                await interaction.editReply({ 
                    content: `✅ تم بنجاح رفع مستوى ${target} بمقدار **${levelsToAdd}** مستويات.\n📊 المستوى الحالي: **${userData.level}**` 
                });

            } catch (error) {
                console.error("خطأ في أمر level-up:", error);
                if (interaction.deferred) {
                    await interaction.editReply({ content: '❌ حدث خطأ أثناء الاتصال بقاعدة البيانات.' });
                }
            }
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('set-level')
            .setDescription('تحديد لفل معين لعضو (للإدارة فقط)')
            .addUserOption(option => 
                option.setName('user')
                    .setDescription('العضو المراد تغيير مستواه')
                    .setRequired(true))
            .addIntegerOption(option => 
                option.setName('level')
                    .setDescription('المستوى الجديد (مثلاً: 1، 5، 10)')
                    .setRequired(true)
                    .setMinValue(1)), // أقل لفل هو 1

        async execute(interaction) {
            // 1. التحقق من صلاحيات الأدمن
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.reply({ content: 'يحتاج رتبة اعلى', flags: [64] });
            }

            // 2. الانتظار عشان الداتابيز
            await interaction.deferReply({ flags: [64] });

            const target = interaction.options.getUser('user');
            const newLevel = interaction.options.getInteger('level');

            try {
                // 3. البحث عن العضو في MongoDB
                let userData = await User.findOne({ userId: target.id, guildId: interaction.guild.id });
                
                if (!userData) {
                    userData = await User.create({ userId: target.id, guildId: interaction.guild.id });
                }

                // 4. تعيين اللفل الجديد
                userData.level = newLevel;
                userData.xp = 0; // تصفير النقاط الحالية عشان يبدأ اللفل من أوله

                // 5. معادلة حساب الـ XP المطلوب للفل الجديد (عشان السيستم ميبوظش)
                // إحنا بنبدأ بـ 100 وكل لفل بيزيد 50% صعوبة
                let calculatedRequiredXP = 100;
                for (let i = 1; i < newLevel; i++) {
                    calculatedRequiredXP = Math.round(calculatedRequiredXP * 1.5);
                }
                userData.requiredXP = calculatedRequiredXP;

                await userData.save(); // حفظ في السحابة

                // 6. الرد النهائي
                await interaction.editReply({ 
                    content: `✅ تم تعيين مستوى ${target} إلى **Level ${newLevel}** بنجاح.\n📈 الـ XP المطلوب للفل القادم: **${userData.requiredXP}**` 
                });

            } catch (error) {
                console.error("خطأ في أمر set-level:", error);
                await interaction.editReply({ content: '❌ فشل تحديث بيانات العضو في قاعدة البيانات.' });
            }
        }
    },
];