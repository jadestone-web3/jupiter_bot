const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// 提供静态页面
app.use(express.static(path.join(__dirname, 'public')));

// API: 返回套利日志
app.get('/api/logs', (req, res) => {
    if (fs.existsSync('arbitrage_log.json')) {
        res.json(JSON.parse(fs.readFileSync('arbitrage_log.json')));
    } else {
        res.json([]);
    }
});

app.listen(PORT, () => {
    console.log(`Web服务已启动: http://localhost:${PORT}`);
});

// 自动创建public/index.html（如不存在）
const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>套利监控</title>
    <script src="https://cdn.jsdelivr.net/npm/echarts/dist/echarts.min.js"></script>
</head>
<body>
    <h2>套利净利润趋势</h2>
    <div id="main" style="width: 1000px;height:400px;"></div>
    <h2>账户余额变化</h2>
    <div id="balance" style="width: 1000px;height:400px;"></div>
    <script>
        async function fetchData() {
            const res = await fetch('/api/logs');
            return await res.json();
        }
        function render(logs) {
            const sim = logs.filter(x=>x.type==='sim');
            const real = logs.filter(x=>x.type==='real');
            let simSum = 0, realSum = 0;
            const simData = sim.map(x => {
                simSum += x.profit;
                return [x.timestamp, simSum];
            });
            const realData = real.map(x => {
                realSum += x.profit;
                return [x.timestamp, realSum];
            });
            const chart = echarts.init(document.getElementById('main'));
            chart.setOption({
                xAxis: { type: 'time' },
                yAxis: { type: 'value' },
                legend: { data: ['模拟累计净利润', '真实累计净利润'] },
                series: [
                    { name: '模拟累计净利润', type: 'line', data: simData },
                    { name: '真实累计净利润', type: 'line', data: realData }
                ]
            });
            // 余额曲线
            const sol = logs.map(x => [x.timestamp, x.sol]);
            const usdc = logs.map(x => [x.timestamp, x.usdc]);
            const usdt = logs.map(x => [x.timestamp, x.usdt]);
            const chart2 = echarts.init(document.getElementById('balance'));
            chart2.setOption({
                xAxis: { type: 'time' },
                yAxis: { type: 'value' },
                legend: { data: ['SOL', 'USDC', 'USDT'] },
                series: [
                    { name: 'SOL', type: 'line', data: sol },
                    { name: 'USDC', type: 'line', data: usdc },
                    { name: 'USDT', type: 'line', data: usdt }
                ]
            });
        }
        fetchData().then(render);
        setInterval(async () => { render(await fetchData()); }, 10000); // 10秒刷新
    </script>
</body>
</html>
`;
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
const indexPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(indexPath)) fs.writeFileSync(indexPath, html); 