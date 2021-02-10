const pg = require('pg');
const config = {
    user: 'postgres',
    database: 'currency_exchange',
    password: 'newPassword'
};
const pool = new pg.Pool(config);

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