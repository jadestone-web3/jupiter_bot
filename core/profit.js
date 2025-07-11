/**
 * 计算套利利润
 * @param {number} amountIn 输入金额（整数，最小单位）
 * @param {number} amountOut 输出金额（整数，最小单位）
 * @returns {{profit: number, profitPercent: number}}
 */
export function calcProfit(amountIn, amountOut) {
    const profit = amountOut - amountIn;
    const profitPercent = (profit / amountIn) * 100;
    return { profit, profitPercent };
} 