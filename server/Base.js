// TODO: Reimplement lobby start, fix /leave.

require('dotenv').config();

// Import modules.
const { Server } = require('ws');
const { BanList } = require('../db/Models');
const Express = require('express');
const mongoose = require('mongoose');

// Connect to database.
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB has loaded.'))
    .catch(err => console.error('Could not load database: ', err));

// Create servers.
const ExpressApp = Express();
ExpressApp.use(Express.json());
ExpressApp.use(Express.urlencoded({ extended: false } ));

const WebSocketServer = new Server({ 
    noServer: true,
    maxPayload: 1e5,
    async verifyClient(information, cb) {
        let request = information.req;
        let ip = request.socket.remoteAddress ||
            request.headers['x-forwarded-for'];

        const bans = await BanList.find();

        if (bans.filter(user => user.ip == ip).length) return cb(false, 418, 'Unable to brew coffee.'); 
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
            !request.headers["sec-websocket-extensions"]
            || request.headers["user-agent"].includes('headless')) cb(false, 418, 'Unable to brew coffee.');
        cb(true);
    }
});

WebSocketServer.brodcast = function(message, filter) {
    console.log('hi');
    if (typeof message != 'string') throw new TypeError('Parameter message is not of type String.');
    const clients = [...this.clients].filter(filter);

    clients.forEach(client => client.send(message));
    return clients;
}

module.exports = { WebSocketServer, ExpressApp };