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
    const response = await fetch('https://api.binance.com/api/v3/ticker/price', {
        headers: {
            'X-MBX-APIKEY': 'eEftomUZsIS6LuD3qpCmgmoljw9GZgr0VLwrzPOD8ODTFgp4OSDHFBVzACngACqO' // 替换为你的API密钥
        }
    });
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
        displayTrade({
            baseAsset,
            value: tradeValueInUSDT,
            displayValue: tradeValueInUSDT.toFixed(2),
            className: 'large-trade',
            isBuyerMaker,
            time: new Date(trade.T).toLocaleTimeString()
        });
    }
}

// 显示大额交易
function displayTrade(trade) {
    const tradeElement = document.createElement('li');
    tradeElement.innerHTML = `<span>${trade.baseAsset}</span>
                              <span class="value">${trade.displayValue}</span> USDT
                              <span class="time">${trade.time}</span>`;
    if (trade.className) {
        tradeElement.classList.add(trade.className);
    }
    tradesList.appendChild(tradeElement);
}

// 批量订阅交易对的逐笔交易数据
function subscribeToTradeStreams(symbols) {
    const tradeUrl = `wss://stream.binance.com:9443/stream?streams=${symbols.map(symbol => `${symbol.toLowerCase()}@trade`).join('/')}`;
    const tradeSocket = new WebSocket(tradeUrl);

    tradeSocket.onmessage = handleTradeMessage;
}

// 获取所有交易对并分批订阅
async function init() {
    await getExchangeRates();
    const response = await fetch('https://api.binance.com/api/v3/exchangeInfo', {
        headers: {
            'X-MBX-APIKEY': 'eEftomUZsIS6LuD3qpCmgmoljw9GZgr0VLwrzPOD8ODTFgp4OSDHFBVzACngACqO' // 替换为你的API密钥
        }
    });
    const data = await response.json();
    const symbols = data.symbols.map(symbol => symbol.symbol);

    // 每次订阅200个交易对，避免资源不足
    const chunkSize = 200;
    for (let i = 0; i < symbols.length; i += chunkSize) {
        const chunk = symbols.slice(i, i + chunkSize);
        setTimeout(() => {
            subscribeToTradeStreams(chunk);
        }, i * 100); // 延时订阅，避免资源不足
    }
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
                displayValue: tradeValueInUSDT.toFixed(2),
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
        totalValue: data.totalValue.toFixed(2),
        className: 'buy'
    })));

    updateList(sellList, sortedSellOrders.map(([baseAsset, data]) => ({
        baseAsset,
        count: data.count,
        totalValue: data.totalValue.toFixed(2),
        className: 'sell'
    })));

    // 只显示单笔交易金额超过10000 USDT的大额交易，并按从大到小排序
    const sortedLargeTrades = largeTrades.sort((a, b) => b.value - a.value);
    updateLargeTradesList(tradesList, sortedLargeTrades);
}

function updateList(list, items) {
    list.innerHTML = ''; // 清空列表
    items.forEach(item => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<span>${item.baseAsset}</span>
                              <span class="count">${item.count}</span>
                              <span class="value">${item.totalValue}</span> USDT`;
        if (item.className) {
            listItem.classList.add(item.className);
        }
        list.appendChild(listItem);
    });
}

function updateLargeTradesList(list, items) {
    list.innerHTML = ''; // 清空列表
    items.forEach(item => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<span>${item.baseAsset}</span>
                              <span class="value">${item.displayValue}</span> USDT`;
        if (item.className) {
            listItem.classList.add(item.className);
        }
        list.appendChild(listItem);
    });
}

// 初始化获取兑换率并订阅交易流
init();
