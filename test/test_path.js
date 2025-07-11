import { filterPairs } from "../core/path.js";

const ARBITRAGE_PAIRS = [
    ["USDC", "SOL", "USDT"],
    ["USDC", "BONK", "JUP"],
    ["USDC", "JUP", "SOL"]
];

function main() {
    const filtered = filterPairs(ARBITRAGE_PAIRS, "SOL");
    console.log("包含SOL的套利路径：");
    filtered.forEach(path => console.log(path.join(" → ")));
}

main(); 