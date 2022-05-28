// @ts-nocheck
require('dotenv').config();

// Import modules.
const { WebSocketServer } = require('./Base');
const { Users, BanList, Lobbies } = require('../db/Models');
const { httpServer } = require('./ExpressServer');
const Types = require('../engine/types/types.json');
const queryString = require('query-string');
const fetch = require('node-fetch');

// Listen to requests.
console.log('[WEBSOCKET] Listening on PORT 3000.');

WebSocketServer.on('connection', async function(socket, request) {
    const bans = await BanList.find();
    const users = await Users.find();

    socket.ban = function() {
        const document = new BanList({
            ip: socket.ip,
        });

        document.save()
            .then(() => socket.close())
            .catch(err => {
                console.error(err);
                socket.close();
            });
    };

    if (bans.find(user => { return user.ip == socket.ip })) return socket.close();

    if (!request.url) {
        socket.send(JSON.stringify({ header: 'AUTHORIZATION_INVALID', data: { message: 'The token was unable to be found.' } }));
        return socket.close();
    }
    
    let [ path, params ] = request.url.split('?');
    socket.path = path;
    socket.params = queryString.parse(params);
    
    const sessionData = users.find(user => { return user.token == socket.params.token });

    if (!sessionData) {
        socket.send(JSON.stringify({ header: 'AUTHORIZATION_INVALID', data: { message: 'The token provided was invalid.' } }));
        return socket.close();
    }

    socket.session = await Users.findById(sessionData._id);

    socket.ip = request.socket.remoteAddress ||
        request.headers['x-forwarded-for'];
    socket.authorizedLevel = 0;

    fetch(`https://ipqualityscore.com/api/json/ip/${process.env.IQS_TOKEN}/${socket.ip}`).then(r => r.json()).then(data => {
        if (data.vpn ||
            data.tor ||
            data.active_vpn ||
            data.active_tor) {
                socket.send(JSON.stringify({
                    header: 'CONNECTION_CLOSE',
                    data: { message: 'Our servers have detected you have a proxy enabled. Due to the prominence of botting, we do not allow proxies. Please disable it, and then reload.' },
                }));
                socket.close();
            } else {
                socket.send(JSON.stringify({ header: 'ACCEPT' }));
                socket.authorizedLevel = 1;
            }
    }).catch(er => {
        console.error(`Could not detect whether or not IP is a proxy.`, er);
        socket.send(JSON.stringify({ header: 'ACCEPT' }));
        socket.authorizedLevel = 1;
    });

    socket.session.online = true;
    socket.session.save();

    socket.receiveSession = setInterval(async () => {
        socket.session = await Users.findById(sessionData._id);
    }, 1000);

    socket.messageCooldownInterval = setInterval(() => {
        if (socket.session.messageCooldown > 0) socket.session.messageCooldown -= 1;
    }, 1000);

    socket.on('close', function() {
        clearInterval(socket.receiveSession);
        clearInterval(socket.messageCooldownInterval);

        socket.session.online = false;
        socket.session.save();
    });

    socket.on('message', async function(data) {
        if (!socket.authorizedLevel) return socket.send(JSON.stringify({ header: 'PACKET_REJECT', data: { message: 'Please wait for the server to finish verifying whether or not a proxy is being used.' } }));

        try {
            data = JSON.parse(data);
            if (!data) return socket.ban();
        } catch (error) {
            socket.ban();
        }

        if (!data.header) return socket.ban();
        switch (data.header) {
            case 'PING': {
                socket.send(JSON.stringify({ header: 'PONG' }));
                break;
            }
            case 'SEND_MESSAGE': {
                socket.session = await Users.findById(sessionData._id);

                socket.session.messageCooldown++;
                if (socket.session.messageCooldown >= 3) return socket.send(JSON.stringify({ header: 'MESSAGE_REJECT', data: { message: `Please wait ${socket.session.messageCooldown} seconds to send another message.` } }));

                const { message } = data;
                if (typeof message != 'string') return socket.ban();

                const lobby = await Lobbies.findOne({ id: socket.session.activeGames[0], });
                const player = lobby.players.current.find(player => player.username == socket.session.username);

                if (!player) return socket.send(JSON.stringify({ header: 'MESSAGE_REJECT', data: { message: 'You are not in that lobby.' } }));
                if (lobby.phase.includes('Night') && Types.roles[player.role]?.alignment != 'Mafia') return socket.send(JSON.stringify({ header: 'MESSAGE_REJECT', data: { message: 'You are not allowed to send messages at Night.' } }));

                if (!lobby) return socket.send(JSON.stringify({ header: 'MESSAGE_REJECT', data: { message: 'Invalid Lobby ID.' } }));
                if (message.length > 500 || message.length < 1) return socket.send(JSON.stringify({ header: 'MESSAGE_REJECT', data: { message: 'Message length must be within bounds of 1-500.' } })); 

                let pass = false;

                if (message.includes('nig') && !message.includes('night')) return socket.send(JSON.stringify({ header: 'MESSAGE_REJECT', data: { message: 'Your message contained a slur. Please refrain from sending them.' } }));
                ['fag', 'jew', 'retard'].map(slur => {
                    if (message.includes(slur)) return pass = false;
                });

                if (pass) return socket.send(JSON.stringify({ header: 'MESSAGE_REJECT', data: { message: 'Your message contained a slur. Please refrain from sending them.' } }));

                const clients = [...WebSocketServer.clients].filter(client => {
                    if (client.session.activeGames[0] != lobby.id) return false;
                    
                    const player = lobby.players.current.find(player => player.username == client.session.username);
                    if (player.dead) return true;

                    if (lobby.phase.includes('Night') && Types.roles[player.role]?.alignment != 'Mafia') return false; // Will change this later if separate types of messages can be sent by a role.

                    return true;
                });

                clients.forEach(client => {
                    client.send(JSON.stringify({
                        header: 'RECV_MESSAGE',
                        message,
                    }));
                });

                lobby.messages.push({
                    message,
                    phase: lobby.phase,
                    room: lobby.phase.includes('Night') ? 'Mafia' : 'Town',
                });

                lobby.save().catch(er => console.error('Could not save message. Error:', er));
            }
        }
    });
});

httpServer.on('upgrade', function(req, socket, head) {
    WebSocketServer.handleUpgrade(req, socket, head, socket => {
        WebSocketServer.emit('connection', socket, req);
    });
});