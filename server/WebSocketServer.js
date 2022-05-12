require('dotenv').config();

// Import modules.
const { WebSocketServer } = require('./Base');
const { Users, BanList } = require('../db/Models');
const fetch = require('node-fetch');
const { httpServer } = require('./ExpressServer');
const queryString = require('query-string');

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

    if (bans.filter(user => { return user.ip == socket.ip })[0]) return socket.close();

    if (!request.url) {
        socket.send(JSON.stringify({ header: 'AUTHORIZATION_INVALID', data: { message: 'The token was unable to be found.' } }));
        return socket.close();
    }
    
    let [ path, params ] = request.url.split('?');
    socket.path = path;
    socket.params = queryString.parse(params);
    
    const sessionData = users.filter(user => { return user.token == socket.params.token })[0];

    if (!sessionData) {
        socket.send(JSON.stringify({ header: 'AUTHORIZATION_INVALID', data: { message: 'The token provided was invalid.' } }));
        return socket.close();
    }

    socket.session = await Users.findOne({ _id: sessionData._id, });

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

    socket.on('close', function() {
        socket.session.online = true;
        socket.session.save();
    });

    socket.on('message', function(data) {
        if (!socket.authroizedLevel) return socket.send(JSON.stringify({ header: 'PACKET_REJECT', data: { message: 'Please wait for the server to finish verifying whether or not a proxy is being used.' } }));

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
        }
    });
});

httpServer.on('upgrade', function(req, socket, head) {
    WebSocketServer.handleUpgrade(req, socket, head, socket => {
        WebSocketServer.emit('connection', socket, req);
    });
});

module.exports = { WebSocketServer };