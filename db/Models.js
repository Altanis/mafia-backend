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
    activeGames: [String],
    messageCooldown: Number,
}));

const BanList = mongoose.model('BanList', new mongoose.Schema({
    ip: String,
}));

const Lobbies = mongoose.model('Lobbies', new mongoose.Schema({
    id: String,
    setup: Object,
    players: {
        current: [Object],
        required: Number,
    },
    creator: String,
    phase: String,
    ranked: Boolean,
    messages: [Object],
    started: Boolean,
    votes: Object,
}));

module.exports = { Users, BanList, Lobbies };