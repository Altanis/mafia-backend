module.exports = function(server, socket, data) {
    if (!data.data) return socket.ban();

    const { result } = data.data;
    if (socket.challengeResult !== result) return socket.ban();

    socket.authorizedLevel = 2;
    server.packets.get('CLIENTBOUND')['ACCEPT'](socket);
}