const mongoose = require('mongoose');

const Users = mongoose.model('User', new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    verification: {
        verified: Boolean,
        confirmation: {
            token: String,
            createdAt: Number,
            expiresAt: Number,
        },
    },
    forgotPasswordToken: String,
    accessWebSocket: {
        token: String,
        createdAt: Number,
        expiresAt: Number,
    },
}));

const BanList = mongoose.model('BanList', new mongoose.Schema({
    ip: String,
}));

module.exports = { Users, BanList };