const Types = require('../types/types.json');

module.exports = setup => {
    /*const { roles, phase } = setup;

    if (!Array.isArray(roles)) return 'Roles are not of type Array.';
    if (roles.length < 2 || roles.length > 25) return 'Roles must be within bounds of 4-25.';

    if (typeof phase != 'string') return 'Phase is not of type String.';

    let invalidRole = null;
    roles.forEach(role => {
        if (!Types.roles[role]) return invalidRole = role;
    });

    if (invalidRole) return `Invalid role ${invalidRole}.`;

    const mafia = roles.filter(role => Types.roles[role]?.alignment == 'Mafia');
    const town = roles.filter(role => Types.roles[role]?.alignment == 'Town');

    if (mafia.length == 0) return '0 Mafia-sided roles are in this setup.';
    if (mafia.length + 1 >= town.length) return 'The number of Mafia-sided roles must be at least 2 less than the amount of town-sided roles.';

    if (!['day', 'night'].includes(phase.toLowerCase())) return `Invalid phase ${phase}.`;*/

    return true;
};