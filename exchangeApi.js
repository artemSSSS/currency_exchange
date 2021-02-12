const rp = require('request-promise')

let currentUSDRUB = "Can't get course"
let currentEURRUB = "Can't get course"
let currentJPYRUB = "Can't get course"

let apiKey = 'Q05DQ2ROVSK6G8EH';

const TEN_MINUTES = 10 * 60 * 1000;

getCurrentCurrencies();
setInterval(() => {
    getCurrentCurrencies();
}, TEN_MINUTES);

exports.getCurrencyExchange = getCurrencyExchange;
exports.getCurrentUSDRUB = getCurrentUSDRUB;
exports.getCurrentEURRUB = getCurrentEURRUB;
exports.getCurrentJPYRUB = getCurrentJPYRUB;

function getCurrentUSDRUB() {
    return currentUSDRUB;
}

function getCurrentEURRUB() {
    return currentEURRUB;
}

function getCurrentJPYRUB() {
    return currentJPYRUB;
}

async function getCurrencyExchange(from, to) {
    const data = await rp({
        uri: 'https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency='
            + from + '&to_currency=' + to + '&apikey=' + apiKey,
        json: true
    })
    return data['Realtime Currency Exchange Rate']['5. Exchange Rate']
}

async function getCurrentCurrencies() {
    try {
        currentUSDRUB = await getCurrencyExchange('USD', 'RUB');
        currentEURRUB = await getCurrencyExchange('EUR', 'RUB');
        currentJPYRUB = await getCurrencyExchange('JPY', 'RUB');
    } catch(err) {
        console.error(err);
    }
}