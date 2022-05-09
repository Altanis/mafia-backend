const mongoose = require('mongoose');

const Users = mongoose.model('User', new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    verification: {
        verified: Boolean,
        token: String,
    },
    forgotPasswordToken: String,
    token: String,
    avatar: String,
    bio: String,
    online: Boolean,
}));

const BanList = mongoose.model('BanList', new mongoose.Schema({
    ip: String,
}));

module.exports = { Users, BanList };