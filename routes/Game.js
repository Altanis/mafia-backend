const { Router } = require('express');
const { Users, Lobbies } = require('../db/Models');
const { VoteParser } = require('../engine/game/Parser');

const GameRouter = Router();

GameRouter.route('/vote')
    .post(async (request, response) => {
        const users = await Users.find();
        const lobbies = await Lobbies.find();

        const { token, target, type } = request.body;

        const userData = users.find(user => user.token == token);
        if (!userData) return response.status(400).send('Invalid token.');
        const targetData = users.find(user => user.username == target);
        if (!targetData || targetData.activeGames[0] != userData.activeGames[0]) return response.status(400).send('That user is not in the current game.');
        const lobbyData = lobbies.find(lobby => lobby.id == userData.activeGames[0]);

        const USER = await Users.findById(userData._id);
        const TARGET = await Users.findById(targetData._id);
        const LOBBY = await Lobbies.findById(lobbyData._id);
        const PLAYER = LOBBY.players.current.find(p => p.username == userData.username);
        const PLAYER_INDEX = LOBBY.players.current.findIndex(p => p.username == userData.username);
        const TARGET_PLAYER = LOBBY.players.current.find(p => p.username == targetData.username);

        const parser = new VoteParser({ user: USER, player: PLAYER }, { user: TARGET, player: TARGET_PLAYER }, LOBBY, type);
        parser.vote()
            .then(() => {
                LOBBY.players.current[PLAYER_INDEX].didAction = true;
                LOBBY.markModified('players');
                LOBBY.save();
                
                response.status(200).send('Successfully casted vote.');
            })
            .catch(error => {
                console.error('Failed to execute:', error);
                response.status(500).send(error);
            });
    });

module.exports = { GameRouter };