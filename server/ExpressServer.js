// Import modules.
const { Users } = require('../db/Models');
const { ExpressApp } = require('./Base');

// Import routes.
const { AccountRouter } = require('../routes/Account');
const { ProfileRouter } = require('../routes/Profile');
const { LobbyRouter } = require('../routes/Lobbies');

// Listen to requests.
ExpressApp.use('/account', AccountRouter);
ExpressApp.use('/profile', ProfileRouter);
ExpressApp.use('/lobbies', LobbyRouter);

ExpressApp.get('/', function(request, response) {
    response.send('serverside express. client will make requests at this location.');
});

const httpServer = ExpressApp.listen(3000, () => { console.log('[EXPRESS] Listening on PORT 3000.') });

module.exports = { httpServer, };