path = require('path')
const express = require('express')
const exphbs = require('express-handlebars')
const rp = require('request-promise')
const app = express()


app.engine('.hbs', exphbs({
    defaultLayout: 'main',
    extname: '.hbs',
    layoutsDir: path.join(__dirname, 'views/layouts')
}))

app.set('view engine', '.hbs')
app.set('views', path.join(__dirname, 'views'))
app.listen(3000)

var currentUser = null;

const pg = require('pg');
const config = {
    user: 'postgres',
    database: 'currency_exchange',
    password: 'newPassword'
};
const pool = new pg.Pool(config);

app.use(express.urlencoded());

app.use(express.json());

app.get('/', (request, response) => {
    if (currentUser == null) {
        response.sendFile(path.join(__dirname+'/views/login.html'));
    } else {
        response.render('home', {
            name: currentUser,
            currentUSDRUB: currentUSDRUB,
            currentEURRUB: currentEURRUB,
            currentJPYRUB: currentJPYRUB
        })
    }
})

app.post('/login', (request, response, next) => {
    const user = request.body

    pool.connect(function (err, client, done) {
        if (err) {
            console.log("Can not connect to the DB: " + err);
        }
        client.query('INSERT INTO users (name, password) VALUES ($1, $2);', [user.uname, user.psw], function (err, result) {
            done();
            if (err) {
                console.log(err);
                next(err)
                return
            }
            currentUser = user.uname;
            response.redirect('/')
        })
    })
})

app.use((err, request, response, next) => {
    response.redirect('/?error=' + encodeURIComponent('Have_user_with_this_name'));
})

app.post('/signup', (request, response) => {
    const user = request.body

    pool.connect(function (err, client, done) {
        if (err) {
            console.log("Can not connect to the DB: " + err);
        }
        client.query('SELECT name FROM users WHERE name = $1 and password = $2;', [user.uname, user.psw], function (err, result) {
            done();
            if (err) {
                console.log(err);
                response.status(400).send(err);
            }
            if (result.rows.length == 0) {
                response.redirect('/?error=' + encodeURIComponent('Incorrect_Credential'));
            } else {
                currentUser = result.rows[0].name;
                response.redirect('/')
            }
        })
    })
})

app.get('/accounts', (request, response) => {
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("Can not connect to the DB: " + err);
        }
        client.query('SELECT currency, money FROM accounts WHERE owner = $1;', [currentUser], function (err, result) {
            done();
            if (err) {
                console.log(err);
            }
            let accounts = []
            result.rows.forEach(row => {
                accounts.push(row.money + " " + row.currency)
            });
            response.render('accounts', {
                accounts: accounts
            })
        })
    })
})

'Q05DQ2ROVSK6G8EH'

var currentUSDRUB, currentEURRUB, currentJPYRUB;

getCurrentCurrencies();
setInterval(() => { getCurrentCurrencies(); }, 10*60*1000);

function getCurrentCurrencies() {
    rp({
        uri: 'https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=RUB&apikey=Q05DQ2ROVSK6G8EH',
        json: true
    })
    .then((data) => {
        currentUSDRUB = data['Realtime Currency Exchange Rate']['5. Exchange Rate']
    })
    .catch((err) => {
        console.log(err)
        return
    })

    rp({
        uri: 'https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=EUR&to_currency=RUB&apikey=Q05DQ2ROVSK6G8EH',
        json: true
    })
    .then((data) => {
        currentEURRUB = data['Realtime Currency Exchange Rate']['5. Exchange Rate']
    })
    .catch((err) => {
        console.log(err)
        return
    })

    rp({
        uri: 'https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=JPY&to_currency=RUB&apikey=Q05DQ2ROVSK6G8EH',
        json: true
    })
    .then((data) => {
        currentJPYRUB = data['Realtime Currency Exchange Rate']['5. Exchange Rate']
    })
    .catch((err) => {
        console.log(err)
        return
    })
}

