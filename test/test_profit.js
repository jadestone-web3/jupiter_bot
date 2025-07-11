import { calcProfit } from "../core/profit.js";

const testCases = [
    { amountIn: 5_000_000, amountOut: 5_050_000 }, // 5 → 5.05
    { amountIn: 1_000_000, amountOut: 950_000 },   // 1 → 0.95
    { amountIn: 2_000_000, amountOut: 2_000_000 }  // 2 → 2
];

function main() {
    console.log("🧪 利润计算测试...");
    for (const { amountIn, amountOut } of testCases) {
        const { profit, profitPercent } = calcProfit(amountIn, amountOut);
        console.log(`输入: ${amountIn / 1e6}, 输出: ${amountOut / 1e6}`);
        console.log(`利润: ${profit / 1e6}, 利润率: ${profitPercent.toFixed(4)}%\n`);
    }
}

main(); 