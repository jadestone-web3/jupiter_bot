import { getQuote } from "./quote.js";
import { getTokenName } from "../utils/tokens.js";

/**
 * 检查流动性
 * @param {string} inputMint
 * @param {string} outputMint
 * @param {number} amount
 * @param {number} maxPriceImpact
 * @returns {Promise<{passed: boolean, reason?: string, quote?: object}>}
 */
export async function checkLiquidity(inputMint, outputMint, amount, maxPriceImpact = 0.01) {
    try {
        const quote = await getQuote(inputMint, outputMint, amount);
        if (quote.priceImpactPct > maxPriceImpact) {
            return { passed: false, reason: `价格影响过大(${(quote.priceImpactPct * 100).toFixed(2)}%)`, quote };
        }
        if (quote.outAmount < amount * 0.95) {
            return { passed: false, reason: "输出金额过低", quote };
        }
        return { passed: true, quote };
    } catch (e) {
        return { passed: false, reason: e.message };
    }
} 