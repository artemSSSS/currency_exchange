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

app.use(express.static('public'));

app.get('/', (request, response) => {
    if (currentUser == null) {
        response.sendFile(path.join(__dirname + '/views/login.html'));
    } else {
        response.render('home', {
            name: currentUser,
            currentUSDRUB: currentUSDRUB.number,
            currentEURRUB: currentEURRUB.number,
            currentJPYRUB: currentJPYRUB.number
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

app.get('/create_account', (request, response) => {
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("Can not connect to the DB: " + err);
        }
        client.query('SELECT currency FROM accounts WHERE owner = $1;', [currentUser], function (err, result) {
            done();
            if (err) {
                console.log(err);
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
    })
})

app.post('/create_account', (request, response, next) => {
    const account = request.body

    pool.connect(function (err, client, done) {
        if (err) {
            console.log("Can not connect to the DB: " + err);
        }
        client.query('INSERT INTO accounts (currency, money, owner) VALUES ($1, $2, $3);', [account.currency, account.money, currentUser], function (err, result) {
            done();
            if (err) {
                console.log(err);
                next(err)
            }
            response.redirect('/accounts')
        })
    })
})

app.get('/logout', (request, response) => {
    currentUser = null

    response.redirect('/')
})

app.get('/add_money', (request, response) => {
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("Can not connect to the DB: " + err);
        }
        client.query('SELECT currency, money FROM accounts WHERE owner = $1;', [currentUser], function (err, result) {
            done();
            if (err) {
                console.log(err);
            }
            response.render('add_money', {
                accounts: result.rows
            })
        })
    })
})

app.post('/add_money', (request, response, next) => {
    const account = request.body

    pool.connect(function (err, client, done) {
        if (err) {
            console.log("Can not connect to the DB: " + err);
        }
        client.query('UPDATE accounts SET money = $1 WHERE currency = $2 and owner = $3;', [account.money, account.currency, currentUser], function (err, result) {
            done();
            if (err) {
                console.log(err);
                next(err)
            }
            response.redirect('/accounts')
        })
    })
})

app.get('/create_transaction', (request, response) => {
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("Can not connect to the DB: " + err);
        }
        client.query('SELECT currency FROM accounts WHERE owner = $1;', [currentUser], function (err, result) {
            done();
            if (err) {
                console.log(err);
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
    })
})

app.post('/currency_exchange', (request, response, next) => {
    const currency_exchange = request.body

    rp({
        uri: 'https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency='
            + currency_exchange.from + '&to_currency=' + currency_exchange.to + '&apikey=Q05DQ2ROVSK6G8EH',
        json: true
    })
        .then((data) => {
            response.json(data['Realtime Currency Exchange Rate']);
        })
        .catch((err) => {
            response.json({error: 'Error'})
        })
})

app.post('/create_transaction', (request, response, next) => {
    const transaction = request.body

    pool.connect(function (err, client, done) {
        if (err) {
            console.log("Can not connect to the DB: " + err);
        }
        client.query('INSERT INTO transactions (currency_from, currency_to, money, owner, currency_exchange_course, deadline) VALUES ($1, $2, $3, $4, $5, $6);',
            [transaction.currency_from, transaction.currency_to, transaction.money, currentUser, transaction.currency_exchange_course, transaction.date + ":00"],
            function (err, result) {
                done();
                if (err) {
                    console.log(err);
                    next(err)
                }
                response.redirect('/transactions')
            })
    })
})

app.get('/transactions', (request, response, next) => {
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("Can not connect to the DB: " + err);
        }
        client.query('SELECT * FROM transactions WHERE owner = $1;', [currentUser], function (err, result) {
            done();
            if (err) {
                console.log(err);
            }
            response.render('transactions', {
                transactions: result.rows
            })
        })
    })
})

app.post('/delete_transaction', (request, response, next) => {
    const id = request.body.id

    pool.connect(function (err, client, done) {
        if (err) {
            console.log("Can not connect to the DB: " + err);
        }
        client.query('DELETE FROM transactions WHERE id = $1;',
            [id],
            function (err, result) {
                done();
                if (err) {
                    console.log(err);
                    next(err)
                }
                response.redirect('/transactions')
            })
    })
})

// 'Q05DQ2ROVSK6G8EH'

var currentUSDRUB = {'number': "Can't get course"}
var currentEURRUB = {'number': "Can't get course"}
var currentJPYRUB = {'number': "Can't get course"}

getCurrentCurrencies();
setInterval(() => {
    getCurrentCurrencies();
}, 10 * 60 * 1000);

function getCurrencyExchange(from, to, currentExchange) {
    rp({
        uri: 'https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency='
            + from + '&to_currency=' + to + '&apikey=Q05DQ2ROVSK6G8EH',
        json: true
    })
        .then((data) => {
            currentExchange.number = data['Realtime Currency Exchange Rate']['5. Exchange Rate']
        })
        .catch((err) => {
            console.log(err)
            return
        })
}

function getCurrentCurrencies() {
    getCurrencyExchange('USD', 'RUB', currentUSDRUB);
    getCurrencyExchange('EUR', 'RUB', currentEURRUB);
    getCurrencyExchange('JPY', 'RUB', currentJPYRUB);
}

processTransactions();
setInterval(() => {
    processTransactions();
}, 30 * 1000);

function makeTransaction(transaction, money) {
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("Can not connect to the DB: " + err);
        }

        client.query({
            text: 'UPDATE accounts SET money = money - $1 WHERE currency = $2 and owner = $3;',
            values: [transaction.money, transaction.currency_from, transaction.owner]
        });

        client.query({
            text: 'UPDATE accounts SET money = money + $1 WHERE currency = $2 and owner = $3;',
            values: [transaction.money * transaction.currency_exchange_course, transaction.currency_to, transaction.owner]
        });

        client.query({
            text: 'DELETE FROM transactions WHERE id = $1;',
            values: [transaction.id]
        });

        client.on("error", function (err) {
            console.log(err);
            return;
        });
    })
}

function checkTransaction(transaction) {
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("Can not connect to the DB: " + err);
        }
        client.query('SELECT money FROM accounts WHERE owner = $1 and currency = $2;',
            [transaction.owner, transaction.currency_from], function (err, result) {
                done();
                if (err) {
                    console.log(err);
                }
                if (transaction.money <= result.rows[0].money) {
                    makeTransaction(transaction, result.rows[0].money);
                }
            })
    })
}

function deleteTransaction(id) {
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("Can not connect to the DB: " + err);
        }
        client.query('DELETE FROM transactions WHERE id = $1;',
            [id],
            function (err, result) {
                done();
                if (err) {
                    console.log(err);
                }
            })
    })
}

function processTransaction(transaction) {
    const dateInDB = new Date(transaction.deadline);
    const dateNow = Date.now();
    if (dateNow > dateInDB) {
        deleteTransaction(transaction.id);
    } else {
        checkTransaction(transaction);
    }
}

function processTransactions() {
    pool.connect(function (err, client, done) {
        if (err) {
            console.log("Can not connect to the DB: " + err);
        }
        client.query('SELECT * FROM transactions;', function (err, result) {
            done();
            if (err) {
                console.log(err);
            }
            result.rows.forEach(row => {
                processTransaction(row);
            });
        })
    })
}
