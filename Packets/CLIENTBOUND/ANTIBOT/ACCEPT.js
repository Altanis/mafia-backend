module.exports = function(socket) {
    socket.send({
        header: 'ACCEPT',
    });
}