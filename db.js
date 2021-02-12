const { Client } = require('pg');
const client = new Client({
    user: 'postgres',
    database: 'currency_exchange',
    password: 'newPassword'
});
client.connect();

exports.addNewUser = addNewUser;
exports.findUser = findUser;
exports.getAccountsByUser = getAccountsByUser;
exports.addAccountForUser = addAccountForUser;
exports.updateMoneyForUser = updateMoneyForUser;
exports.addTransaction = addTransaction;
exports.getTransactionsByUser = getTransactionsByUser;
exports.deleteTransactionById = deleteTransactionById;
exports.getAllTransactions = getAllTransactions;
exports.getAccountsByUserAndCurrency = getAccountsByUserAndCurrency;
exports.makeTransaction = makeTransaction;

async function addNewUser(name, password) {
    return client.query('INSERT INTO users (name, password) VALUES ($1, $2);', [name, password]);
}

async function findUser(name, password) {
    return client.query('SELECT name FROM users WHERE name = $1 and password = $2;', [name, password]);
}

async function getAccountsByUser(user) {
    return client.query('SELECT currency, money FROM accounts WHERE owner = $1;', [user]);
}

async function getAccountsByUserAndCurrency(user, currency) {
    return client.query('SELECT money FROM accounts WHERE owner = $1 and currency = $2;',
        [user, currency]);
}

async function addAccountForUser(currency, money, user) {
    return client.query('INSERT INTO accounts (currency, money, owner) VALUES ($1, $2, $3);',
        [currency, money, user]);
}

async function updateMoneyForUser(money, currency, currentUser) {
    return client.query('UPDATE accounts SET money = $1 WHERE currency = $2 and owner = $3;',
        [money, currency, currentUser]);
}

async function addTransaction(currency_from, currency_to, money, currentUser, currency_exchange_course, date) {
    return client.query('INSERT INTO transactions (currency_from, currency_to, money, owner, currency_exchange_course, deadline) VALUES ($1, $2, $3, $4, $5, $6);',
        [currency_from, currency_to, money, currentUser, currency_exchange_course, date]);
}

async function getTransactionsByUser(currentUser) {
    return client.query('SELECT * FROM transactions WHERE owner = $1;', [currentUser]);
}

async function deleteTransactionById(id) {
    return client.query('DELETE FROM transactions WHERE id = $1;', [id]);
}

async function getAllTransactions() {
    return client.query('SELECT * FROM transactions;');
}

async function makeTransaction(transaction) {
    try {
        await client.query('BEGIN')

        await client.query({
            text: 'UPDATE accounts SET money = money - $1 WHERE currency = $2 and owner = $3;',
            values: [transaction.money, transaction.currency_from, transaction.owner]
        });
        let addedMoney = Math.round(transaction.money * transaction.currency_exchange_course);
        await client.query({
            text: 'UPDATE accounts SET money = money + $1 WHERE currency = $2 and owner = $3;',
            values: [addedMoney, transaction.currency_to, transaction.owner]
        });
        await deleteTransactionById(transaction.id)

        await client.query('COMMIT')
    } catch (e) {
        await client.query('ROLLBACK')
        throw e
    }
}