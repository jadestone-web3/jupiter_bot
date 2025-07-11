// 套利利润计算测试
function calcProfit(amountIn, amountOut) {
    const profit = amountOut - amountIn;
    const profitPercent = (profit / amountIn) * 100;
    return { profit, profitPercent };
}

function testProfitCalc() {
    const amountIn = 5_000_000; // 5 USDC, 6位小数
    const amountOut = 5_050_000; // 5.05 USDC
    const { profit, profitPercent } = calcProfit(amountIn, amountOut);

    console.log("【套利利润计算测试】");
    console.log(`初始: ${amountIn / 1e6} USDC, 最终: ${amountOut / 1e6} USDC`);
    console.log(`利润: ${profit / 1e6} USDC, 利润率: ${profitPercent.toFixed(4)}%`);
}

testProfitCalc();