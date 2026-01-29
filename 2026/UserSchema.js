const mongoose = require('mongoose');
const User = require('../User.js'); // لو الملف في المجلد الرئيسي والأمر في مجلد commands

const UserSchema = new mongoose.Schema({
    userId: String,
    guildId: String,
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    requiredXP: { type: Number, default: 100 }
});

module.exports = mongoose.model('User', UserSchema);