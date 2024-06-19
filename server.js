const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = 3000;

const apiKey = 'eEftomUZsIS6LuD3qpCmgmoljw9GZgr0VLwrzPOD8ODTFgp4OSDHFBVzACngACqO'; // 替换为你的API Key

app.get('/api/ticker', async (req, res) => {
    try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/price', {
            headers: {
                'X-MBX-APIKEY': apiKey
            }
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).send(error.toString());
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
