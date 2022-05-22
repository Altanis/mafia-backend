const { Router } = require('express');
const { Users } = require('../db/Models');
const fetch = require('node-fetch');

const ProfileRouter = Router();

const valid = async (type, value) => {
    if (typeof value != 'string') return [false, 'Not of type String.'];

    switch (type) {
        case 'avatar': {
            if (!new RegExp(`(http)?s?:?(\/\/[^"']*\.(?:png|jpg|jpeg|gif|png|svg))`).test(value)) return [false, 'Does not end in a recognizable file format.'];
            try {
                const response = await fetch(value);
                if (response.headers.get('content-type')?.includes('image')) return [true, null];
                else return [false, 'Invalid image.']
            } catch (error) {
                return [false, 'Invalid image.'];
            }
        }
        case 'bio': {
            if (value.length > 200 || value.length < 1) return [false, 'Not within bounds 1-200.'];
            return [true, null];
        }
        case 'username': {
            if (value.length > 32 || value.length < 1) return [false, 'Not within bounds 1-32.'];
            if (value.includes(' ')) return [false, 'Username cannot include spaces.'];
            return [true, null];
        }
    }
};

ProfileRouter.route('/:name')
    .get(async (request, response) => {
        const users = await Users.find();

        const { name } = request.params;
        if (!name) return response.status(400).send('Specify a username.');

        const user = users.find(user => user.username == name);
        if (!user) return response.status(400).send('Invalid username.');

        const { username, avatar, bio, online } = user;
        response.status(200).json({ username, avatar, bio, online });
    });

ProfileRouter.route('/update')
    .post(async (request, response) => {
        const users = await Users.find();

        const { token, type, value } = request.body;
        const userData = users.find(user => user.token == token);
        if (!userData) return response.status(400).send('Invalid authorization code provided.');
        if (!['avatar', 'bio', 'username'].includes(type)) return response.status(400).send('Invalid part of profile provided.');
        
        const [ isValid, reason ] = await valid(type, value);
        if (!isValid) return response.status(400).send(reason);

        const user = await Users.findById(userData._id);
        user[type] = value;
        await user.save();
        response.status(200).send('Successfully updated profile!');
    });

module.exports = { ProfileRouter };