path = require('path')
const express = require('express')
const exphbs = require('express-handlebars')
const app = express()
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

require("./process_transactions");
const db = require("./db");
const exchangeApi = require("./exchangeApi");

app.engine('.hbs', exphbs({
    defaultLayout: 'main',
    extname: '.hbs',
    layoutsDir: path.join(__dirname, 'views/layouts')
}))

app.set('view engine', '.hbs')
app.set('views', path.join(__dirname, 'views'))
app.listen(3000)

let sessions = {};

app.use(express.urlencoded());
app.use(express.json());
app.use(express.static('static'));
app.use(cookieParser());

app.get('/', (request, response) => {
    let token = request.cookies.token;
    if (sessions[token] === undefined) {
        response.sendFile(path.join(__dirname + '/views/login.html'));
    } else {
        response.render('home', {
            name: sessions[token],
            currentUSDRUB: exchangeApi.getCurrentUSDRUB,
            currentEURRUB: exchangeApi.getCurrentEURRUB,
            currentJPYRUB: exchangeApi.getCurrentJPYRUB
        })
    }
})

app.post('/register', async (request, response, next) => {
    const user = request.body;
    let hash = crypto.createHash('md5').update(user.psw).digest('hex').substring(0, 20);

    try {
        await db.addNewUser(user.uname, hash);
    } catch (err) {
        console.error(err);
        next(err);
        return;
    }

    let randomNumber = Math.random().toString();
    randomNumber = randomNumber.substring(2, randomNumber.length);
    response.cookie('token', randomNumber, {maxAge: 1000 * 3600 * 24});
    sessions[randomNumber] = user.uname;
    response.redirect('/')
})

app.use((err, request, response, next) => {
    response.redirect('/?error=' + encodeURIComponent('Have_user_with_this_name'));
})

app.post('/login', async (request, response) => {
    const user = request.body;
    let hash = crypto.createHash('md5').update(user.psw).digest('hex').substring(0, 20);

    let result;
    try {
        result = await db.findUser(user.uname, hash);
    } catch (err) {
        console.error(err);
        response.status(400).send(err);
        return;
    }

    if (result.rows.length === 0) {
        response.redirect('/?error=' + encodeURIComponent('Incorrect_Credential'));
    } else {
        let randomNumber = Math.random().toString();
        randomNumber = randomNumber.substring(2, randomNumber.length);
        response.cookie('token', randomNumber, {maxAge: 1000 * 3600 * 24});
        sessions[randomNumber] = result.rows[0].name;
        response.redirect('/')
    }
})

app.get('/accounts', authenticationMiddleware(), async (request, response) => {
    let token = request.cookies.token;
    let currentUser = sessions[token];

    let result;
    try {
        result = await db.getAccountsByUser(currentUser);
    } catch (err) {
        console.error(err);
        response.status(500).send(err);
        return;
    }

    response.render('accounts', {
        accounts: result.rows
    })
})

app.get('/create_account', authenticationMiddleware(), async (request, response) => {
    let token = request.cookies.token;
    let currentUser = sessions[token];

    let result;
    try {
        result = await db.getAccountsByUser(currentUser);
    } catch (err) {
        console.error(err);
        return;
    }

    let all_currencies = ['RUB', 'USD', 'EUR', 'JPY']
    result.rows.forEach(row => {
        const index = all_currencies.indexOf(row.currency);
        if (index > -1) {
            all_currencies.splice(index, 1);
        }
    });
    response.render('create_account', {
        all_currencies: all_currencies
    })
})

app.post('/create_account', authenticationMiddleware(), async (request, response) => {
    const account = request.body;
    let token = request.cookies.token;
    let currentUser = sessions[token];

    try {
        await db.addAccountForUser(account.currency, account.money, currentUser);
    } catch (err) {
        console.error(err);
        return;
    }

    response.redirect('/accounts')
})

app.get('/logout', (request, response) => {
    response.clearCookie('token');

    response.redirect('/')
})

app.get('/add_money', authenticationMiddleware(), async (request, response) => {
    let token = request.cookies.token;
    let currentUser = sessions[token];

    let result;
    try {
        result = await db.getAccountsByUser(currentUser);
    } catch (err) {
        console.error(err);
        return;
    }

    response.render('add_money', {
        accounts: result.rows
    })
})

app.post('/add_money', authenticationMiddleware(), async (request, response, next) => {
    const account = request.body;
    let token = request.cookies.token;
    let currentUser = sessions[token];

    try {
        await db.updateMoneyForUser(account.money, account.currency, currentUser);
    } catch (err) {
        console.error(err);
        return;
    }

    response.redirect('/accounts')
})

app.get('/create_transaction', authenticationMiddleware(), async (request, response) => {
    let token = request.cookies.token;
    let currentUser = sessions[token];

    let result;
    try {
        result = await db.getAccountsByUser(currentUser);
    } catch (err) {
        console.error(err);
        return;
    }

    let error;
    if (result.rows.length < 2) {
        error = 'You must have at least 2 accounts to make a transaction'
    }
    response.render('create_transaction', {
        currencies: JSON.stringify(result.rows),
        error: error
    })
})

app.post('/currency_exchange', authenticationMiddleware(), async (request, response, next) => {
    const currency_exchange = request.body;

    let data;
    try {
        data = await exchangeApi.getCurrencyExchange(currency_exchange.from, currency_exchange.to);
    } catch (err) {
        response.json({error: 'Error'})
        return;
    }

    response.json({'course': data});
})

app.post('/create_transaction', authenticationMiddleware(), async (request, response) => {
    const transaction = request.body;
    let token = request.cookies.token;
    let currentUser = sessions[token];

    try {
        await db.addTransaction(transaction.currency_from, transaction.currency_to,
            transaction.money, currentUser, transaction.currency_exchange_course, transaction.date + ":00");
    } catch (err) {
        console.error(err);
        return;
    }

    response.redirect('/transactions')
})

app.get('/transactions', authenticationMiddleware(), async (request, response, next) => {
    let token = request.cookies.token;
    let currentUser = sessions[token];

    let result;
    try {
        result = await db.getTransactionsByUser(currentUser);
    } catch (err) {
        console.error(err);
        return;
    }

    response.render('transactions', {
        transactions: result.rows
    })
})

app.post('/delete_transaction', authenticationMiddleware(), async (request, response, next) => {
    const id = request.body.id;

    try {
        await db.deleteTransactionById(id);
    } catch (err) {
        console.error(err);
        return;
    }

    response.redirect('/transactions')
})

function authenticationMiddleware() {
    return function (req, res, next) {
        let token = req.cookies.token;
        if (sessions[token] !== undefined) {
            return next()
        }
        res.redirect('/')
    }
}


