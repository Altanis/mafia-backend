module.exports = function(socket, code) {
    socket.send({
        header: 'JS_CHALLENGE',
        data: {
            code,
        }
    });
}