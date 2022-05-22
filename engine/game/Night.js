const { Lobbies } = require('../../db/Models');

module.exports = async (server, data, start) => {
    const lobby = await Lobbies.findById(data._id);
    console.log(lobby.players.current);

    let { roles } = lobby.setup;
    roles = roles.sort(() => Math.random() - 0.5);

    if (start) {
        lobby.players.current.forEach((player, index) => {
            lobby.players.current[index].role = roles[index];
            [...server.clients].find(client => client.session.username == player.username)?.send(JSON.stringify({
                header: 'ROLE_ASSIGNMENT',
                role: roles[index],
            }));
        });    

        console.log(lobby.players.current);

        lobby.save().then(() => console.log('Successfully saved document.')).catch(er => console.error('Could not assign roles:', er));
    }
};