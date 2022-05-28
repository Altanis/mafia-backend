const { Lobbies, Users } = require('../../db/Models');
const Types = require('../types/types.json');

module.exports = async (server, data, start) => {
    const lobby = await Lobbies.findById(data._id);

    if (start) {
        let { roles } = lobby.setup;
        roles = roles.sort(() => Math.random() - 0.5);

        lobby.players.current.forEach((player, index) => {
            lobby.players.current[index].role = roles[index];
            [...server.clients].find(client => client.session.username == player.username)?.send(JSON.stringify({
                header: 'ROLE_ASSIGNMENT',
                role: roles[index],
            }));
        });    

        lobby.markModified('players');
        lobby.save().catch(er => console.error('Could not assign roles:', er));
    }

    setTimeout(() => {
        const afk = lobby.players.current.map(player => !player.didAction);
        const messages = [];

        afk.forEach(async user => {
            const player = await Users.findOne({ username: user, });
            
            player.activeLobbies = [];
            lobby.players.current.splice(lobby.players.current.findIndex(player => player.username == user), 1);
        
            messages.push({
                target: 'ALL',
                message: JSON.stringify({
                    header: 'PLAYERS',
                    lobby: lobby.id,
                    userList: lobby.players.current,
                    suicide: true,
                }),
            });
        });

        lobby.players.current.forEach((_, index) => { lobby.players.current[index].didAction = false; });
        const Engine = new VoteEngine(lobby.votes[lobby.phase], lobby);
        Engine.tally();

        lobby.phase = `Night ${parseInt(lobby.phase.split(' ')[1]) + 1}`;
        lobby.markModified('players');
        lobby.save().catch(er => console.error('Could not change phases:', er));

        server.brodcast(JSON.stringify({
            header: 'GAME_PHASE',
            lobby: lobby.id,
            phase: lobby.phase,
        }), client => client.session.activeGames.includes(lobby.id));

        messages.map(({ target, message }) => {
            server.brodcast(message, client => client.session.activeGames.includes(lobby.id) && (target != 'ALL' ? (target == client.session.username || target.includes?.(client.session.username)) : true));
        });

        require('./Night')(server, data);
    }, Types.phases.Day.time);
};