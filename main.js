const tradeThreshold = 10000; // 大额交易的阈值，10,000 USDT
const timeWindow = 10 * 60 * 1000; // 10分钟的时间窗口

const buyList = document.getElementById('buy-list');
const sellList = document.getElementById('sell-list');
const tradesList = document.getElementById('trades-list');

const tradeSockets = {};
let latestTradeData = [];
let exchangeRates = {};

// 获取USDT兑换率
async function getExchangeRates() {
    const response = await fetch('https://api.binance.com/api/v3/ticker/price');
    const data = await response.json();
    data.forEach(ticker => {
        if (ticker.symbol.endsWith('USDT')) {
            const symbol = ticker.symbol.replace('USDT', '');
            exchangeRates[symbol] = parseFloat(ticker.price);
        }
    });
}

// 处理WebSocket消息
function handleTradeMessage(event) {
    const trade = JSON.parse(event.data);
    trade.timestamp = Date.now();
    latestTradeData.push(trade);
}

// 订阅所有交易对的逐笔交易数据
function subscribeToTradeStreams() {
    const tickerUrl = "wss://stream.binance.com:9443/ws/!ticker@arr";
    const tickerSocket = new WebSocket(tickerUrl);

    tickerSocket.onmessage = function(event) {
        const tickers = JSON.parse(event.data);
        tickers.forEach(ticker => {
            const symbol = ticker.s;
            if (!tradeSockets[symbol]) {
                const tradeUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@trade`;
                const tradeSocket = new WebSocket(tradeUrl);
                tradeSocket.onmessage = handleTradeMessage;
                tradeSockets[symbol] = tradeSocket;
            }
        });
    };
}

// 每隔10秒更新一次数据
setInterval(updateData, 10000);

function updateData() {
    const currentTime = Date.now();
    const recentTrades = latestTradeData.filter(trade => currentTime - trade.timestamp <= timeWindow);

    const buyOrders = {};
    const sellOrders = {};
    const largeTrades = [];

    recentTrades.forEach(trade => {
        const symbol = trade.s;
        const price = parseFloat(trade.p);
        const quantity = parseFloat(trade.q);
        const tradeValue = price * quantity;
        const isBuyerMaker = trade.m;

        // 提取代币名称（假设交易对以USDT、BTC、ETH或BNB结尾）
        const baseAsset = symbol.replace(/(USDT|BTC|ETH|BNB|USDC|FDUSD)$/, '');
        let tradeValueInUSDT = tradeValue;

        // 如果不是USDT交易对，转换为USDT
        if (!symbol.endsWith('USDT')) {
            const exchangeRate = exchangeRates[baseAsset];
            if (exchangeRate) {
                tradeValueInUSDT = tradeValue * exchangeRate;
            } else {
                return; // 如果没有找到兑换率，跳过该交易
            }
        }

        // 统计大额交易（单笔交易金额超过10000 USDT）
        if (tradeValueInUSDT > tradeThreshold) {
            largeTrades.push({
                baseAsset,
                value: tradeValueInUSDT,
                displayValue: `${tradeValueInUSDT.toFixed(2)} USDT`,
                className: 'large-trade',
                isBuyerMaker
            });
        }

        // 统计买入和卖出订单
        if (isBuyerMaker) {
            if (!sellOrders[baseAsset]) {
                sellOrders[baseAsset] = { count: 0, totalValue: 0 };
            }
            sellOrders[baseAsset].count++;
            sellOrders[baseAsset].totalValue += tradeValueInUSDT;
        } else {
            if (!buyOrders[baseAsset]) {
                buyOrders[baseAsset] = { count: 0, totalValue: 0 };
            }
            buyOrders[baseAsset].count++;
            buyOrders[baseAsset].totalValue += tradeValueInUSDT;
        }
    });

    // 清空最新交易数据
    latestTradeData = recentTrades;

    // 将买入和卖出的订单按次数排序并更新列表
    const sortedBuyOrders = Object.entries(buyOrders).sort((a, b) => b[1].count - a[1].count).slice(0, 10);
    const sortedSellOrders = Object.entries(sellOrders).sort((a, b) => b[1].count - a[1].count).slice(0, 10);

    updateList(buyList, sortedBuyOrders.map(([baseAsset, data]) => ({
        baseAsset,
        count: data.count,
        displayValue: `${data.totalValue.toFixed(2)} USDT`,
        className: 'buy'
    })));

    updateList(sellList, sortedSellOrders.map(([baseAsset, data]) => ({
        baseAsset,
        count: data.count,
        displayValue: `${data.totalValue.toFixed(2)} USDT`,
        className: 'sell'
    })));

    // 只显示单笔交易金额超过10000 USDT的大额交易，并按从大到小排序
    const sortedLargeTrades = largeTrades.sort((a, b) => b.value - a.value);
    updateList(tradesList, sortedLargeTrades.map(trade => ({
        baseAsset: trade.baseAsset,
        displayValue: `${trade.isBuyerMaker ? '-' : '+'} ${trade.displayValue}`,
        className: trade.className
    })));
}

function updateList(list, items) {
    list.innerHTML = ''; // 清空列表
    items.forEach(item => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<span>${item.baseAsset}</span>
                              <span class="count">${item.count}</span>
                              <span class="value">${item.displayValue}</span>`;
        if (item.className) {
            listItem.classList.add(item.className);
        }
        list.appendChild(listItem);
    });
}

// 初始化获取兑换率并订阅交易流
getExchangeRates().then(subscribeToTradeStreams);
