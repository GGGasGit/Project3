const getButton = document.querySelector(".js-getbutton");
const selectField = document.querySelector(".js-selectfield");
const tableCaption = document.querySelector(".js-table-caption");
const bidAskTable = document.querySelector(".js-bidasktable");
const bestPriceTable = document.querySelector(".js-bestpricetable");
const errorText = document.querySelector(".js-errortext");

const exchanges = {

    "binance" : {
        "name": "Binance",
        "urlcryptosuffixes": {"btc": "BTC", "eth": "ETH", "xrp": "XRP", "ltc": "LTC"}, //needed for different currencies
        "urlfiatsuffixes": {"eur": "EUR", "usd": "BUSD"},
        "url" : 'https://api.binance.com/api/v3/ticker/bookTicker?symbol=<crypto><fiat>', //<crypto><fiat> = BTCEUR
        "bidmatcher": /"bidPrice":"\d+(.)\d+"/,
        "askmatcher": /"askPrice":"\d+(.)\d+"/,
        "fee" : 0.001,
    },

    "bitbay" : {
        "name": "Bitbay",
        "urlcryptosuffixes": {"btc": "BTC", "eth": "ETH", "xrp": "XRP", "ltc": "LTC"},
        "urlfiatsuffixes": {"eur": "EUR", "usd": "USD"},
        "url" : 'https://api.bitbay.net/rest/trading/ticker/<crypto>-<fiat>', //BTC-EUR   //public api that gives CORS error: https://bitbay.net/API/Public/BTCEUR/ticker.json
        "bidmatcher": /"highestBid":"\d+(.)\d+"/,
        "askmatcher": /"lowestAsk":"\d+(.)\d+"/,
        "fee" : 0.0041,
    },
    
    "bitstamp" : {
        "name": "Bitstamp",        
        "urlcryptosuffixes": {"btc": "btc", "eth": "eth", "xrp": "xrp", "ltc": "ltc"},
        "urlfiatsuffixes": {"eur": "eur", "usd": "usd"},
        "url" : 'https://www.bitstamp.net/api/v2/ticker/<crypto><fiat>', //btceur
        "fetchOptions" : {method: "POST"},
        "bidmatcher": /"bid": "\d+(.)\d+"/,
        "askmatcher": /"ask": "\d+(.)\d+"/,
        "fee" : 0.005,
    },
    
    "coinbase" : {
        "name": "Coinbase",
        "urlcryptosuffixes": {"btc": "BTC", "eth": "ETH", "xrp": "XRP", "ltc": "LTC"},
        "urlfiatsuffixes": {"eur": "EUR", "usd": "USD"},
        "url" : 'https://api.pro.coinbase.com/products/<crypto>-<fiat>/ticker', //BTC-EUR
        "bidmatcher": /"bid":"\d+(.)\d+"/,
        "askmatcher": /"ask":"\d+(.)\d+"/,
        "fee" : 0.005,
    },

    "kraken" : {
        "name": "Kraken",
        "urlcryptosuffixes": {"btc": "BTC", "eth": "ETH", "xrp": "XRP", "ltc": "LTC"},
        "urlfiatsuffixes": {"eur": "EUR", "usd": "USD"},
        "url" : 'https://api.kraken.com/0/public/Ticker?pair=<crypto><fiat>', //BTCEUR
        "bidmatcher": /"b":\["\d+(.)\d+"/,
        "askmatcher": /"a":\["\d+(.)\d+"/,
        "fee" : 0.0026,
    },

    "paymium" : {
        "name": "Paymium",
        "urlcryptosuffixes": null,
        "urlfiatsuffixes": null,
        "url" : 'https://paymium.com/api/v1/data/eur/ticker', //ony BTCEUR quotation
        "bidmatcher": /"bid":"\d+(.)\d+"/,
        "askmatcher": /"ask":"\d+(.)\d+"/,
        "fee" : 0.005,
    },

};

//This function fills the html select field (dropdown) with the exchanges
function fillSelectField() {
    let selectFieldMarkup = '<option value="all">All</option>';
    for (let exchange in exchanges) {
        selectFieldMarkup += `<option value="${exchange}">${exchanges[exchange].name} (fee: ${(100 * exchanges[exchange].fee).toFixed(2)}%)</option>`;
    }
    return selectFieldMarkup;
}

selectField.innerHTML = fillSelectField();

//This function gets the currencyPair data from the radio input
//and returns the pair in an array = [crypto, fiat]
function getCurrencyPair(property) {
    const currencyPair = [];
    currencyPair.push([...document.querySelectorAll(".js-cryptocurrency")].filter(x => x.checked)[0][property]);
    currencyPair.push([...document.querySelectorAll(".js-fiatcurrency")].filter(x => x.checked)[0][property]);
    return currencyPair;
}

//This function changes the table caption depending on the currencies selected
function tableCaptionChanger(currencyPair) {
    tableCaption.innerHTML = `${currencyPair[0].label} Price (${currencyPair[1].label})`;
}

//This function creates the final url for the getData function's fetch
function createUrl(exchange, crypto, fiat) {
    let url = "";
    if (Boolean(exchanges[exchange].urlcryptosuffixes) && Boolean(exchanges[exchange].urlfiatsuffixes)) {
        url = exchanges[exchange].url.replace('<crypto>', exchanges[exchange].urlcryptosuffixes[crypto]).replace('<fiat>', exchanges[exchange].urlfiatsuffixes[fiat]);
    } else {
        url = exchanges[exchange].url;
    }
    return url;
}

//Fetches data from server with or without fetchOptions and returns response in string format
//String is needed to be able to use RegEx because of different received data structures
function getData(exchange) {
        const currencyPair = getCurrencyPair("value");
        return fetch(createUrl(exchange, currencyPair[0], currencyPair[1]), exchanges[exchange].fetchOptions)
        .then(
            response => response.text(),
        );
}

//We need to use promise.allSettled to wait for all promises to settle before being able to process data
//This function is the generator function for the queries array for promise.allSettled
//Returns the apiQueries array of promises
function apiQueriesGenerator() {
    const apiQueries = [];
    for (let exchange in exchanges) {
        apiQueries.push(getData(exchange));
    }
    return apiQueries;
}

//This function returns the bids and asks from the input result.value data
//using the RegEx of each exchange
//An input function for the bidAskConverterAll function
function bidAskFinder(input, matcher) {
    return matcher.exec(input)[0].split(':')[1].trim().replaceAll('"', '').replaceAll('[', '');
}

//This function checks if the selected currency pair is a given pair
//Needed when there is no quotation for given currency pairs on given exchanges
function isCurrencyPair(currencyPair, crypto, fiat) {
    return (currencyPair[0] === crypto && currencyPair[1] === fiat);
}

//This function stores the bids and asks from the result.value data using the bidAskFinder function
//Input function for the resultSetParser function
function bidAskConverterAll(exchange) {
    if (exchange.result.status === "fulfilled") {
        exchange.bid = Number.parseFloat(bidAskFinder(exchange.result.value, exchange.bidmatcher));
        exchange.ask = Number.parseFloat(bidAskFinder(exchange.result.value, exchange.askmatcher));
    } else {
        exchange.bid = "N/A";
        exchange.ask = "N/A";
    }
    if ((exchange.name === "Paymium") && !(isCurrencyPair(getCurrencyPair("value"), "btc", "eur"))) {
        exchange.bid = "N/A";
        exchange.ask = "N/A";
        errorText.innerHTML = "Note: the exchange Paymium has quotation for BTCEUR only"
    }
}

//Function for bid-ask conversion from received data when only one exchange is queried
function bidAskConverterOne(exchange, data) {

    if ((exchange.name === "Paymium") && !(isCurrencyPair(getCurrencyPair("value"), "btc", "eur"))) {
        errorText.innerHTML = "Note: the exchange Paymium has quotation for BTCEUR only";
        bidAskTable.innerHTML = "<tr><td>Paymium</td><td>N/A</td><td>N/A</td></tr>";
    } else {
        bidAskTable.innerHTML = `<tr><td>${exchange.name}</td><td>${Number.parseFloat(bidAskFinder(data, exchange.bidmatcher))}</td><td>${Number.parseFloat(bidAskFinder(data, exchange.askmatcher))}</td></tr>`;
    }
    
}

//This function converts the resultSet of promise.allResolved into bids and asks
function resultSetParser(resultSet) {
    let i = 0;
    for (let exchange in exchanges) {
        exchanges[exchange].result = resultSet[i];
        bidAskConverterAll(exchanges[exchange]);
        i++
    }
}

//This function generates a bid-ask table and returns the corresponging markup string
function bidAskTableGenerator() {
    let bidAskTable = "";
    for (let exchange in exchanges) {
        bidAskTable += `<tr><td>${exchanges[exchange].name}</td><td>${exchanges[exchange].bid}</td><td>${exchanges[exchange].ask}</td></tr>`;
    }
    return bidAskTable;
}

//Table generator function for best price table
function bestPriceTableGenerator() {
    let highestEffectiveBid = 0;
    let bestBidExchange = "";
    let lowestEffectiveAsk = Infinity;
    let bestAskExchange = "";
    for (let exchange in exchanges) {
        if (exchanges[exchange].bid * (1 - exchanges[exchange].fee) > highestEffectiveBid) {
            highestEffectiveBid =  exchanges[exchange].bid * (1 - exchanges[exchange].fee);
            bestBidExchange = exchanges[exchange]
        }
        if (exchanges[exchange].ask * (1 + exchanges[exchange].fee) < lowestEffectiveAsk) {
            lowestEffectiveAsk =  exchanges[exchange].ask * (1 + exchanges[exchange].fee);
            bestAskExchange = exchanges[exchange]
        }
    }

    bestPriceTable.innerHTML = `
    <caption>Best Price</caption>
    <thead>
        <tr>
            <th>Exchange</th>
            <th>Eff. Bid</th>
            <th>Eff. Ask</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>${bestBidExchange.name} (fee: ${(100 * bestBidExchange.fee).toFixed(2)}%)</td>
            <td>${highestEffectiveBid.toFixed(2)}</td>
            <td></td>
        </tr>
        <tr>
            <td>${bestAskExchange.name} (fee: ${(100 * bestAskExchange.fee).toFixed(2)}%)</td>
            <td></td>
            <td>${lowestEffectiveAsk.toFixed(2)}</td>
        </tr>
        <tr>
            <td>Profit</td>
            <td colspan="2">${((highestEffectiveBid/lowestEffectiveAsk - 1) * 100).toFixed(2)}%</td>
        </tr>
    </tbody>`;
}

//The main function
//If "all" is selected, awaits for all the promises to settle, parses the results and then draws the table
//If one exchanges is selected only, it returns only one row in the table
const parseResponse = async function() {

    tableCaptionChanger(getCurrencyPair("dataset"));

    errorText.innerHTML = "";
    bestPriceTable.innerHTML = "";

    if (selectField.value === "all") {
    //The advantage of using promise.allSettled besides being able to wait for all the responses to settle
    //is that the resultSet array is in the same strict order as the querySet array, plus no error handling needed
        const results = await Promise.allSettled(apiQueriesGenerator());

        resultSetParser(results);

        bidAskTable.innerHTML = bidAskTableGenerator();

        bestPriceTableGenerator();

    } else {

        getData(selectField.value)
        .then(
            data => bidAskConverterOne(exchanges[selectField.value], data)
        )
        .catch(
            error => {
                errorText.innerHTML = `Hiba: ${error}`
                bidAskTable.innerHTML = `<tr><td>${exchanges[selectField.value].name}</td><td>N/A</td><td>N/A</td></tr>`;
            }
        );
        
    }
}

getButton.addEventListener("click", parseResponse);