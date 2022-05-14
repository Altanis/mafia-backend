const { Router } = require('express');
const { Users, Lobbies } = require('../db/Models');
const { WebSocketServer } = require('../server/Base');
const crypto = require('crypto');

const LobbyRouter = Router();
const Timeouts = {};

LobbyRouter.route('/pages')
    .get(async (_, response) => {
        const lobbies = await Lobbies.find();
        const pages = Math.ceil(lobbies.length / 10);
        response.status(200).send((pages == 0 ? 0 : pages - 1).toString());
    });

LobbyRouter.route('/create')
    .post(async (request, response) => {
        const users = await Users.find();

        const { token, setup } = request.body;

        if  (!Array.isArray(setup)) return response.status(400).send('Setup is not of type Array.');
        const userData = users.filter(user => user.token == token)[0];
        if (!userData) return response.status(400).send('Invalid token.');
        if (userData.activeGames.length) return response.status(403).send('You are already in a game.');

        const user = await Users.findById(userData._id);
        const lobbyID = crypto.randomBytes(16).toString('hex');

        const lobby = new Lobbies({
            id: lobbyID,
            setup: setup,
            players: {
                current: [{
                    username: userData.username,
                    avatar: userData.avatar,
                }],
                required: setup.length,
            },
            creator: userData.username,
            phase: 'Waiting...',
            ranked: true, // Toggle later.
        });
        lobby.save()
            .then(() => {
                user.activeGames.push(lobbyID);
                user.save()
                    .then(() => { response.status(200).send('Successfully created lobby.') })
                    .catch(() => { response.status(500).send('Could not join lobby.'); });
            })
            .catch((err) => { response.status(500).send('Could not create lobby. Error: ' + err); });
    });
    
LobbyRouter.route('/join')
    .post(async (request, response) => {
        const users = await Users.find();
        const lobbies = await Lobbies.find();

        const { token, id } = request.body;
        
        const userData = users.filter(user => user.token == token)[0];
        if (!userData) return response.status(400).send('Invalid token.');
        if (userData.activeGames.length) return response.status(403).send('You are already in a game.');

        const user = await Users.findById(userData._id);

        const lobbyData = lobbies.filter(lobby => lobby.id == id)[0];
        if (!lobbyData) return response.status(400).send('Invalid Lobby ID.');
        if (lobbyData.players.current.length >= lobbyData.players.required || lobbyData.started) return response.status(400).send('Lobby is filled.');
        const lobby = await Lobbies.findOne({ _id: lobbyData._id, });

        lobby.players.current.push({ username: userData.username, avatar: userData.avatar });

        if (lobby.players.current.length >= lobby.players.required) {
            lobby.phase = 'Starting...';
            WebSocketServer.brodcast(JSON.stringify({
                header: 'GAME_PHASE',
                lobby: lobbyData.id,
                phase: lobby.phase,
            }), client => client.session.activeGames.includes(lobbyData.id));

            Timeouts[lobbyData.id] = setTimeout(() => {
                lobby.phase = 'Night 1'; // Day 1 will be an option.
                WebSocketServer.brodcast(JSON.stringify({
                    header: 'GAME_PHASE',
                    lobby: lobbyData.id,
                    phase: lobby.phase,
                }), client => client.session.activeGames.includes(lobbyData.id));

                lobby.save().catch(er => console.error('Error when saving Lobby data:', er));
                delete Timeouts[lobbyData.id];
            }, 10000);
        }

        lobby.save()
            .then(() => {
                user.activeGames.push(lobbyData.id);
                user.save()
                    .then(() => { 
                        WebSocketServer.brodcast(JSON.stringify({
                            header: 'PLAYERS',
                            lobby: lobbyData.id,
                            userList: lobby.players.current,
                            suicide: false,
                        }), client => client.session.activeGames.includes(lobbyData.id));

                        response.status(200).send('Successfully joined lobby.'); 
                    })
                    .catch(() => { response.status(500).send('Could not join lobby.'); });
            })
            .catch(() => { response.status(500).send('Could not join lobby.'); });
    });

LobbyRouter.route('/leave')
    .post(async (request, response) => {
        const users = await Users.find();
        const lobbies = await Lobbies.find();

        const { token, id } = request.body;
        
        const userData = users.filter(user => user.token == token)[0];
        if (!userData) return response.status(400).send('Invalid token.');
        if (!userData.activeGames.length) return response.status(400).send('You are not in a game.');

        const user = await Users.findById(userData._id);

        const lobbyData = lobbies.filter(lobby => lobby.id == id)[0];
        if (!lobbyData) return response.status(400).send('Invalid Lobby ID.');
        const lobby = await Lobbies.findOne({ _id: lobbyData._id, });

        const playerIndex = lobby.players.current.findIndex(object => object.username == userData.username);
        if (playerIndex == -1) return response.status(500).send('Could not find you within the game.');

        lobby.players.current.splice(playerIndex, 1);

        let suicide = false;
        if (lobby.phase.toLowerCase().includes('day') || lobby.phase.toLowerCase().includes('night')) {
            lobby.ranked = false;
            suicide = true;
        }

        if (lobby.players.current.length == 0) {
            Lobbies.deleteOne({ _id: lobbyData._id })
                .then(() =>  {
                    user.activeGames = [];
                    user.save()
                        .then(() => response.status(200).send('Successfully left lobby.'))
                        .catch(err => response.status(500).send('Could not leave lobby. Error: ' + err))
                })
                .catch(err => response.status(500).send('Could not leave lobby. Error: ' + err));
        } else {
            lobby.save()
                .then(() => {
                    user.activeGames = [];
                    user.save()
                        .then(() => { 
                            WebSocketServer.brodcast(JSON.stringify({
                                header: 'PLAYERS',
                                lobby: lobbyData.id,
                                userList: lobby.players.current,
                                suicide,
                            }), client => client.session.activeGames.includes(lobbyData.id));

                            response.status(200).send('Successfully left lobby.'); 
                        })
                        .catch((err) => { response.status(500).send('Could not leave lobby. Error: ' + err); });
                    })
                .catch((err) => { response.status(500).send('Could not leave lobby. Error: ' + err); });
        }
    });

LobbyRouter.route('/:page')
    .get(async (request, response) => {
        let lobbies = await Lobbies.find();
        const page = parseInt(request.params?.page) || 0;
        if (typeof page != 'number') return response.status(400).send('Invalid page count.');

        lobbies = lobbies.reverse();

        let lobbiesSpliced = [];
        while (lobbies.length) {
            lobbiesSpliced.push(lobbies.splice(0, 10));
        }
        lobbiesSpliced = lobbiesSpliced.reverse();

        if (!lobbiesSpliced[0] && page == 0) return response.status(200).json([]);
        if (!Array.isArray(lobbiesSpliced[page])) return response.status(400).send(`Page must be within bounds 0-${lobbiesSpliced.length}.`);
        response.status(200).json(lobbiesSpliced);
    });

module.exports = { LobbyRouter };