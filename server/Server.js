require('dotenv').config();

const { Server } = require('ws');
const { Users, BanList } = require('../db/Models');

const Express = require('express');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const queryString = require('query-string');

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB has loaded.'))
    .catch(err => console.error('Could not load database: ', err));

const app = Express();
const server = new Server({ 
    noServer: true,
    maxPayload: 1e5,
    async verifyClient(information, cb) {
        let request = information.req;
        let ip = request.socket.remoteAddress ||
            request.headers['x-forwarded-for'];

        const bans = await BanList.find();

        if (bans.includes(ip)) return cb(false, 418, 'Unable to brew coffee.');
        if (!request.headers.upgrade ||
            !request.headers.connection ||
            !request.headers.host ||
            !request.headers.pragma ||
            !request.headers["cache-control"] ||
            !request.headers["user-agent"] ||
            !request.headers["sec-websocket-version"] ||
            !request.headers["accept-encoding"] ||
            !request.headers["accept-language"] ||
            !request.headers["sec-websocket-key"] ||
            !request.headers["sec-websocket-extensions"]) return cb(false, 418, 'Unable to brew coffee.');
        cb(true);
    }
});

app.get('/', function(request, response) {
    response.send('Express server is online.');
});

server.on('connection', async function(socket, request) {
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
    
    const session = users.filter(user => { return user.accessWebSocket.token == socket.params.token  })[0];

    if (!session) {
        socket.send(JSON.stringify({ header: 'AUTHORIZATION_INVALID', data: { message: 'The token provided was invalid.' } }));
        return socket.close();
    }
    socket.ip = request.socket.remoteAddress ||
        request.headers['x-forwarded-for'];
    socket.authorizedLevel = 0;

    fetch(`https://ipqualityscore.com/api/json/ip/ZwS61NRyh2WNRpZrzQLKmMYD5mxhyxUf/${socket.ip}`).then(r => r.json()).then(data => {
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

    socket.on('message', function(data) {
        if (!socket.authroizedLevel) return socket.send(JSON.stringify({ header: 'PACKET_REJECT', data: { message: 'Please wait for the server to finish verifying whether or not a proxy is being used.' } }));

        try {
            data = JSON.parse(data)
        } catch (error) {
            socket.ban();
        }
    });
});

const httpServer = app.listen(3000, () => console.log('Listening on PORT 3000.'));
httpServer.on('upgrade', function(req, socket, head) {
    server.handleUpgrade(req, socket, head, socket => {
        server.emit('connection', socket, req);
    });
});