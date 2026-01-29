const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    xp: { type: Number, default: 0 }, // دي عدد الرسائل (XP)
    level: { type: Number, default: 1 },
    requiredXP: { type: Number, default: 100 }
});

module.exports = mongoose.model('User', userSchema);