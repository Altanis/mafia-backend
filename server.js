const fs = require('fs');
const fetch = require('node-fetch');

const { Server } = require('ws');
const server = new Server({
    port: process.env.PORT || 8080,
    maxPayload: 1e5,
    verifyClient: function(information, cb) {
        let request = information.req;
        let ip = request.socket.remoteAddress ||
            request.connection.socket.remoteAddress ||
            request.headers['x-forwarded-for'];

        if (server.blacklist.has(ip)) return cb(false, 418, 'Unable to brew coffee.');
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
    },
});

server.users = {};
server.blacklist = new Set();
server.packets = new Map();
server.filterObject = (obj, predicate) =>
    Object.keys(obj)
        .filter( key => predicate(obj[key]) )
        .reduce( (res, key) => (res[key] = obj[key], res), {} );

fs.readdirSync('./Packets/').forEach(type => {
    server.packets.set(type, {});
    fs.readdirSync(`./Packets/${type}`).forEach(folder => {
        fs.readdirSync(`./Packets/${type}/${folder}`).forEach(file => {
            server.packets.get(type)[file.split('.')[0]] = require(`./Packets/${type}/${folder}/${file}`);
            console.log(`Listening for packets with header ${file.split('.')[0]}.`);
        });
    });
});

server.on('listening', function() { console.log(`Server is listening on localhost:8080.`) });
server.on('connection', function(socket, request) {
    console.log('A new connection has been made.');

    socket.ban = function() {
        server.blacklist.add(socket.ip);
        socket.terminate();
    };

    let _send = socket.send;
    socket.send = function(data) {
        if (typeof data == 'object') data = JSON.stringify(data);
        _send.call(this, data);
    };

    socket.ip = request.socket.remoteAddress ||
        request.connection.socket.remoteAddress ||
        request.headers['x-forwarded-for'];
    socket.authorizedLevel = 0;

    fetch(`https://ipqualityscore.com/api/json/ip/ZwS61NRyh2WNRpZrzQLKmMYD5mxhyxUf/${socket.ip}`).then(r => r.json()).then(data => {
        if (data.vpn ||
            data.tor ||
            data.active_vpn ||
            data.active_tor) {
                socket.send({
                    header: 'CONNECTION_CLOSE',
                    data: { message: 'Our servers have detected you using a proxy. Please disable it.', },
                });
                socket.terminate();
            } else {
                socket.authorizedLevel = 1;
            }
    }).catch(er => {
        console.error(`Could not detect whether or not IP is a proxy.`, er);
        socket.authorizedLevel = 1;
    });

    socket.on('message', function(data) {
        if (socket.authorizedLevel != 1) return socket.send({
            header: 'PACKET_REJECT',
            data: { message: 'Please wait to be accepted by the server.' },
        });

        try {
            data = JSON.parse(data);
            if (!data) return socket.ban();
        } catch (error) {
            socket.ban();
        }

        const { header } = data;
        const run = server.packets.get('SERVERBOUND')[header];
        if (!run) socket.ban(); // Sent invalid header.
        if (!['CONNECT', 'JS_CHALLENGE_REPLY'].includes(header) && socket.authorizedLevel != 2) return; // Must complete JS Challenge to continue.
        run(server, socket, data);
    });
});