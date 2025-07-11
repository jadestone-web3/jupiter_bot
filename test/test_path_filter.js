// 路径过滤与筛选测试
const ARBITRAGE_PAIRS = [
    ["USDC", "SOL", "USDT"],
    ["USDC", "BONK", "JUP"],
    ["USDC", "JUP", "SOL"]
];

function filterPairs(pairs, token) {
    return pairs.filter(path => path.includes(token));
}

function testPathFilter() {
    const filtered = filterPairs(ARBITRAGE_PAIRS, "SOL");
    console.log("【路径筛选测试】包含SOL的套利路径：");
    filtered.forEach(path => console.log(path.join(" → ")));
}

testPathFilter();