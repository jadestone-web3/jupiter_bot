import { getQuote } from "../core/quote.js";
import { TOKENS, getTokenName } from "../utils/tokens.js";

const testPairs = [
    [TOKENS.USDC, TOKENS.SOL],
    [TOKENS.USDC, TOKENS.BONK],
    [TOKENS.USDC, TOKENS.JUP]
];

const AMOUNT = 1_000_000; // 1 USDC

async function main() {
    console.log("🧪 Jupiter报价接口测试...");
    for (const [tokenA, tokenB] of testPairs) {
        try {
            const quote = await getQuote(tokenA, tokenB, AMOUNT);
            console.log(`\n${getTokenName(tokenA)} → ${getTokenName(tokenB)}`);
            console.log("outAmount:", quote.outAmount / 1e6);
            console.log("priceImpact:", (quote.priceImpactPct * 100).toFixed(4) + "%");
            console.log("routePlan数:", quote.routePlan?.length || 0);
        } catch (e) {
            console.log(`\n${getTokenName(tokenA)} → ${getTokenName(tokenB)} 报价失败:`, e.message);
        }
    }
}

main().catch(console.error); 