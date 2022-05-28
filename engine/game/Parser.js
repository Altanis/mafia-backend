const Types = require('../types/types.json');
const { Users } = require('../../db/Models');

const VoteEngine = class {
    constructor(votes, lobby) {
        this.votes = votes;
        this.lobby = lobby;
        this.id = lobby.id;
        this.phase = lobby.phase;

        this.messages = [];
        this.dead = {
            counter: 0,
            user: '',
        };
    }

    tally() {
        for (const [target, votes] of Object.entries(this.votes)) {
            const { mafia_kill, town_lynch, investigate, item } = votes;

            if (this.phase.includes('Day')) {
                if (town_lynch.length > this.dead.counter) {
                    this.dead.counter = town_lynch.length;
                    this.dead.user = target;
                } else if (town_lynch.length == this.dead.counter) {
                    this.dead.user = 'nobody';
                }
            } else {
                if (mafia_kill.length > this.dead.counter) {
                    this.dead.counter = mafia_kill.length;
                    this.dead.user = target;
                } else if (mafia_kill.length == this.dead.counter) {
                    this.dead.user = 'nobody';
                }

                if (investigate.investigator != '' && !this.votes[investigate.investigator].blocked) {
                    const alignment = Types.roles[this.lobby.players.current.find(player => player.username == target).role].alignment;

                    this.messages.push({
                        target: investigate.investigator,
                        message: JSON.stringify({
                            header: 'SYSTEM_MESSAGE',
                            lobby: this.id,
                            message: `After conducting a series of investigations, you have concluded that ${target} is affiliated with the ${alignment}.`,
                        }),
                    });
                }

                item.map(i => {
                    if (this.votes[i.giver].blocked) return;

                    const index = this.lobby.players.current.findIndex(player => player.username == target);
                    this.lobby.players.current[index].item.push(i.type);

                    this.messages.push({
                        target,
                        message: JSON.stringify({
                            header: 'SYSTEM_MESSAGE',
                            lobby: this.id,
                            message: `When waking up, you found a ${i.type} on your nightstand.`,
                        }),
                    });

                });
            }
        }

        const player = this.lobby.players.current[this.lobby.players.current.findIndex(p => p.username == this.dead.user)];
        player.dead = true;

        this.messages.push({
            target: 'ALL',
            message: JSON.stringify({
                header: 'SYSTEM_MESSAGE',
                lobby: this.id,
                message: `The village has discovered that ${player.username}, the ${player.role}, was murdered during the night.`,
            }),
        });

        this.lobby.markModified('players');
        this.lobby.save();
    }
}

const VoteParser = class {
    constructor(user, target, lobby, type) {
        this.user = user;
        this.target = target;
        this.lobby = lobby;
        this.type = type;
    }

    vote() {
        return new Promise((resolve, reject) => {
            if (this.user.player.dead) reject('You are dead.');

            if (!this.lobby.votes[this.lobby.phase]) {
                this.lobby.votes[this.lobby.phase] = {};
                this.lobby.votes[this.lobby.phase][this.target.user.username] = {
                    mafia_kill: [],
                    town_lynch: [],
                    blocked: false,
                    investigate: {
                        investigator: '',
                    },
                    item: [],
                };
            }
    
            switch (type) {
                case 'mafia_kill': {
                    if (Types.roles[this.user.player.role]?.alignment != 'Mafia') reject('You are not a member of the Mafia.');
                    if (Types.roles[this.target.player.role]?.alignment == 'Mafia') reject('The other user is a Mafia member.');

                    this.lobby.votes[this.lobby.phase][this.target.user.username].mafia_kill.push(this.user.user.username);
                    this.lobby.save().then(() => resolve()).catch(er => reject(er));
                    break;
                }
                case 'rb_block': {
                    if (this.user.player.role != 'Roleblocker') reject('You are not a Roleblocker.');
                    if (Types.roles[this.target.player.role]?.alignment == 'Mafia') reject('The other user is a Mafia member.');

                    this.lobby.votes[this.lobby.phase][this.target.user.username].blocked = true;
                    this.lobby.save().then(() => resolve()).catch(er => reject(er));
                    break;
                }
                case 'cop_investigate': {
                    if (this.user.player.role != 'Cop') reject('You are not a Cop.');
                    
                    this.lobby.votes[this.lobby.phase][this.target.user.username].investigate = {
                        investigator: this.user.user.username,
                    };
                    this.lobby.save().then(() => resolve()).catch(er => reject(er));
                    break;
                }
                case 'gunsmith_arm': {
                    if (this.user.player.role != 'Gunsmith') reject('You are not a Gunsmith.');
                    
                    this.lobby.votes[this.lobby.phase][this.target.user.username].item.push({
                        type: 'Gun',
                        giver: this.user.user.username,
                    });
                    this.lobby.save().then(() => resolve()).catch(er => reject(er));
                    break;
                }
                case 'town_lynch': {
                    this.lobby.votes[this.lobby.phase][this.target.user.username].town_lynch.push(this.user.user.username);
                    this.lobby.save().then(() => resolve()).catch(er => reject(er));
                    break;
                }
                default: {
                    reject(`Invalid type of vote: ${type}.`);
                    break;
                }
            }
        });
    }
};

module.exports = { VoteEngine, VoteParser };