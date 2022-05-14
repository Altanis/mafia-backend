const { Router } = require('express');
const { Users } = require('../db/Models');
const { google } = require('googleapis');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const OAuth2Client = new google.auth.OAuth2({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.CLIENT_REDIRECT_URI,
});
OAuth2Client.setCredentials({ refresh_token: process.env.CLIENT_REFRESH_TOKEN });

const AccountRouter = Router();

const sendMail = (email, url) => {
    OAuth2Client.getAccessToken()
        .then(token => {
            const transport = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: process.env.CLIENT_EMAIL,
                    clientId: process.env.CLIENT_ID,
                    clientSecret: process.env.CLIENT_SECRET,
                    refreshToken: process.env.CLIENT_REFRESH_TOKEN,
                    accessToken: token,
                },
            });

            transport.sendMail({
                from: 'Mafia Verification 🤵 <donotreplymafia@gmail.com>',
                to: email,
                subject: 'Verification for Mafia',
                html: `Please click this link to verify your E-Mail: <a href=${url}>${url}</a>`
            })
        });
};

AccountRouter.route('/login')
    .post(async (request, response) => {
        const users = await Users.find();

        const { email, password } = request.body;

        const user = users.filter(user => user.email == email)[0];
        if (!user) return response.status(400).send('E-Mail is not registered.');
        if (!user.verification.verified) return response.status(400).send('E-Mail was not verified.');
        if (!bcrypt.compareSync(password, user.password)) return response.status(400).send('An invalid password was provided.');
        if (!user.token) return response.status(500).send('The server could not retrieve your data. Please try again later.');

        response.status(200).send(user.token);
    });

AccountRouter.route('/resend')
    .post(async (request, response) => {
        const users = await Users.find();

        const { email, password } = request.body;
        const user = users.filter(user => user.email == email)[0];
        if (!user) return response.status(400).send('E-Mail is not registered.');
        if (!bcrypt.compareSync(password, user.password)) return response.status(400).send('An invalid password was provided.');
        if (user.verification.verified) return response.status(400).send('You are already verified.');
        
        sendMail(email, `http://localhost:3000/account/register?token=${user.verification.token}`);
        response.status(200).send('A confirmation link was sent to your E-Mail.');
    });

AccountRouter.route('/forgot')
    .post(async (request, response) => {
        const users = await Users.find();

        const { email } = request.body;
        userData = users.filter(user => user.email == email)[0];
        if (!userData) return response.status(400).send('E-Mail is not registered.');

        const forgotPasswordToken = crypto.createHash('sha256').update(JSON.stringify(Math.random().toString(16).substring(2))).digest('hex');
        const user = await Users.findOne({ email });
        if (!user.email) return response.status(500).send('We could not find that account. Please try again later.');
        user.forgotPasswordToken = forgotPasswordToken;
        user.save();

        sendMail(email, `http://localhost:3000/account/reset?token=${user.forgotPasswordToken}`);
        response.status(200).send('A link to reset your password has been sent to your E-Mail!');
    });

AccountRouter.route('/reset')
    .post(async (request, response) => {
        const users = await Users.find();

        const { password } = request.body;

        const token = request.query.token;
        const userData = users.filter(user => user.forgotPasswordToken == token)[0];
        if (!userData) return response.status(400).send('Invalid token.');

        if (!new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})').test(password)) return response.status(400).send('Invalid password. Must have at least one lowercase, uppercase, numerical, and special character and must be more than 8 characters long.');

        const user = await Users.findById(userData._id);
        delete user.forgotPasswordToken;
        
        try {
            const hashedPw = bcrypt.hashSync(password, 10);
            const accessToken = crypto.createHash('sha256').update(JSON.stringify(`${userData.email} + ${hashedPw} + ${Date.now()}`)).digest('hex');

            user.password = hashedPw;
            user.accessToken = accessToken;
            user.forgotPasswordToken = null;
            user.save();

            response.status(200).send('Password was successfully updated.');
        } catch (error) {
            response.status(500).send('There was an issue saving your password. Please try again later.');
        }
    });

AccountRouter.route('/register')
    .get(async (request, response) => {
        const users = await Users.find();

        const token = request.query.token;
        if (!token) return response.status(405).send('Cannot GET /register');

        const userData = users.filter(user => user.verification.token == token)[0];
        if (!userData) return response.status(400).send('Invalid/expired token.');

        await Users.findOneAndUpdate({ _id: userData._id }, { verification: { verified: true } }, {
            new: true,
            upsert: true,
        });

        response.status(200).send('Your account was successfully verified.')
    })
    .post(async (request, response) => {
        const users = await Users.find();

        const { username, email, password } = request.body;

        if (typeof username != 'string' || typeof email != 'string' || typeof password != 'string') return response.status(400).send('Credentials are not of type String.');
        if (!/^\S+@\S+\.\S+$/.test(email)) return response.status(400).send('Invalid E-Mail.');
        if (!new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])(?=.{8,})').test(password)) return response.status(400).send('Invalid password. Must have at least one lowercase, uppercase, numerical, and special character and must be more than 8 characters long.');
    
        if (users.filter(user => user.email == email)[0]) return response.status(400).send('E-Mail is already registered.');
        if (users.filter(user => user.username == username)[0]) return response.status(400).send('Username is taken.');
        if (username.length > 32 || username.length < 1) return response.status(400).send('Username is not within bounds 1-32.');

        try {
            const hashedPw = bcrypt.hashSync(password, 10);

            const verificationToken = crypto.createHash('sha256').update(JSON.stringify(Math.random().toString(16).substring(2))).digest('hex');
            const accessToken = crypto.createHash('sha256').update(JSON.stringify(`${email} + ${hashedPw} + ${Date.now()}`)).digest('hex');

            const user = new Users({
                username,
                email,
                password: hashedPw,
                verification: {
                    verified: false,
                    token: verificationToken,
                },
                token: accessToken,
                avatar: 'https://bolderadvocacy.org/wp-content/uploads/2018/08/blue-icon-question-mark-image.png',
                bio: 'This user has no biography about themselves.',
                online: false,
                activeGames: [],
                messageCooldown: 0,
            });

            user.save()
                .then(() => {
                    const url = `http://localhost:3000/account/register?token=${verificationToken}`;
                    sendMail(email, url);
                    response.status(200).send('Account created. Please verify your E-Mail address by the link we sent to your email. If you didn\'t receive it, send a POST request to: http://localhost:3000/account/resend');
                });
        } catch (error) {
            response.status(500).send('There was an issue saving your password. Please try again later.');
        }
    });

module.exports = { AccountRouter };