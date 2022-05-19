module.exports = (server, lobby, start) => {
    let { roles } = lobby.setup;
    roles = roles.sort(() => Math.random() - 0.5);

    if (start) {
        lobby.players.current.forEach((player, index) => {
            lobby.players.current[index].role = roles[index];
            [...server.clients].filter(client => client.session.username == player.username)[0]?.send(JSON.stringify({
                header: 'ROLE_ASSIGNMENT',
                role: roles[index],
            }));
        });    

        console.log('Roles assigned!', lobby.players.current);
    }
};