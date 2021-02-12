const db = require("./db");
const exchangeApi = require("./exchangeApi");

const THIRTY_SECONDS = 30 * 1000;
const SAME_CURRENCY_EXCHANGE_DELTA = 0.1;

processTransactions();
setInterval(() => {
    processTransactions();
}, THIRTY_SECONDS);

async function makeTransaction(transaction) {
    try {
        await db.makeTransaction(transaction);
    } catch(err) {
        console.error(err);
    }
}

async function processTransaction(transaction) {
    try {
        let currencyExchangeCourseNow = await exchangeApi.getCurrencyExchange(transaction.currency_from, transaction.currency_to);
        currencyExchangeCourseNow = parseFloat(currencyExchangeCourseNow);
        const dateInDB = new Date(transaction.deadline);
        const dateNow = Date.now();
        if (dateNow > dateInDB) {
            await db.deleteTransactionById(transaction.id);
        } else if (Math.abs(transaction.currency_exchange_course - currencyExchangeCourseNow) < SAME_CURRENCY_EXCHANGE_DELTA) {
            const result = await db.getAccountsByUserAndCurrency(transaction.owner, transaction.currency_from);
            if (transaction.money <= result.rows[0].money) {
                await makeTransaction(transaction, result.rows[0].money);
            }
        }
    } catch(err) {
        console.error(err);
    }
}

async function processTransactions() {
    let result;
    try {
        result = await db.getAllTransactions();
    } catch(err) {
        console.error(err);
        return;
    }

    result.rows.forEach(row => {
        processTransaction(row);
    });
}