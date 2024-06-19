<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>币安代币监控</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            color: #333;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            height: 100vh;
            margin: 0;
        }
        h1 {
            margin-top: 20px;
            margin-bottom: 15px;
        }
        .container {
            display: flex;
            justify-content: space-around;
            width: 80%;
        }
        .section {
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            width: 30%;
            padding: 20px;
            margin-bottom: 20px;
        }
        .section h2 {
            margin-top: 0;
            text-align: center;
        }
        .section ul {
            list-style-type: none;
            padding: 0;
        }
        .section li {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding: 10px;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .buy {
            background-color: #d4edda;
        }
        .sell {
            background-color: #f8d7da;
        }
        .large-trade {
            background-color: #ffeeba;
        }
    </style>
</head>
<body>
    <h1>币安代币监控</h1>
    <div class="container">
        <div class="section" id="buy-orders">
            <h2>10分钟内买入次数最多的代币</h2>
            <ul id="buy-list"></ul>
        </div>
        <div class="section" id="sell-orders">
            <h2>10分钟内卖出次数最多的代币</h2>
            <ul id="sell-list"></ul>
        </div>
        <div class="section" id="large-trades">
            <h2>大额交易</h2>
            <ul id="trades-list"></ul>
        </div>
    </div>
    <script src="main.js"></script>
</body>
</html>
