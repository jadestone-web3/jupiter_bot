// 测试流动性检查功能
import { checkLiquidity } from "../core/liquidity.js";
import { TOKENS, getTokenName } from "../utils/tokens.js";

const testPairs = [
    [TOKENS.USDC, TOKENS.SOL],
    [TOKENS.USDC, TOKENS.BONK],
    [TOKENS.USDC, TOKENS.JUP]
];

const AMOUNT = 1_000_000; // 1 USDC
const MAX_PRICE_IMPACT = 0.01; // 1%

async function main() {
    console.log("🧪 测试真实流动性检查功能...");
    for (const [tokenA, tokenB] of testPairs) {
        console.log(`\n${getTokenName(tokenA)} → ${getTokenName(tokenB)}`);
        const result = await checkLiquidity(tokenA, tokenB, AMOUNT, MAX_PRICE_IMPACT);
        if (result.passed) {
            console.log("✅ 流动性充足");
        } else {
            console.log(`❌ 流动性不足: ${result.reason}`);
        }
    }
}

main().catch(console.error); 