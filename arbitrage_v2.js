import { TOKENS, getTokenName } from "./utils/tokens.js";
import { getQuote } from "./core/quote.js";
import { checkLiquidity } from "./core/liquidity.js";
import { calcProfit } from "./core/profit.js";
import { getTokenBalance } from "./core/balance.js";
import { wallet, publicKey } from "./core/wallet.js";
import { ENABLE_REAL_TRADE, MIN_PROFIT_PERCENT, MAIN_TOKEN_DECIMALS, SLIPPAGE_BPS } from "./utils/config.js";
import { executeBatchSwap } from "./core/trade.js";
import { logArbitrage } from "./core/log.js";
import { updateSuccessRate, shouldStop } from "./core/risk.js";
import { autoGatherToMainToken } from "./core/auto_gather.js";
import { getCurrentRpc, switchRpc, getConnection } from "./utils/rpc.js";

const ARBITRAGE_PAIRS = [
    [TOKENS.USDC, TOKENS.SOL, TOKENS.USDT],
    [TOKENS.USDC, TOKENS.BONK, TOKENS.JUP],
    [TOKENS.USDC, TOKENS.JUP, TOKENS.SOL]
];
const MAIN_TOKEN = TOKENS.USDC;
const AMOUNT = 1_000_000; // 1 USDC
const MAX_PRICE_IMPACT = 0.01; // 1%

async function main() {
    console.log("🚀 启动三角套利主流程...");
    console.log("钱包地址:", publicKey.toBase58());

    while (true) {
        try {
            // 1. 检查主币余额
            const balance = await getTokenBalance(getCurrentRpc(), publicKey.toBase58(), MAIN_TOKEN);
            console.log(`主币(${getTokenName(MAIN_TOKEN)})余额:`, balance);
            if (balance < AMOUNT / Math.pow(10, MAIN_TOKEN_DECIMALS)) {
                console.log("❌ 主币余额不足，自动归集...");
                await autoGatherToMainToken(wallet, MAIN_TOKEN, ARBITRAGE_PAIRS, 0.1);
                continue;
            }

            // 2. 风控检查
            // 这里可根据实际风控参数调用shouldStop

            // 3. 遍历套利路径
            for (const [tokenA, tokenB, tokenC] of ARBITRAGE_PAIRS) {
                console.log(`\n【模拟三角套利】${getTokenName(tokenA)} → ${getTokenName(tokenB)} → ${getTokenName(tokenC)} → ${getTokenName(tokenA)}`);
                // 记录报价开始时间和slot
                const startTime = Date.now();
                const startSlot = await getConnection().getSlot();

                // 3.1 检查每一步流动性
                const l1 = await checkLiquidity(tokenA, tokenB, AMOUNT, MAX_PRICE_IMPACT);
                if (!l1.passed) { console.log("❌ 第一步流动性不足:", l1.reason); continue; }
                const l2 = await checkLiquidity(tokenB, tokenC, l1.quote.outAmount, MAX_PRICE_IMPACT);
                if (!l2.passed) { console.log("❌ 第二步流动性不足:", l2.reason); continue; }
                const l3 = await checkLiquidity(tokenC, tokenA, l2.quote.outAmount, MAX_PRICE_IMPACT);
                if (!l3.passed) { console.log("❌ 第三步流动性不足:", l3.reason); continue; }
                // 3.2 计算利润
                const { profit, profitPercent } = calcProfit(AMOUNT, l3.quote.outAmount);
                console.log(`预期利润: ${profit / 1e6} (${profitPercent.toFixed(4)}%)`);
                // 3.3 满足条件则执行套利
                if (profitPercent > MIN_PROFIT_PERCENT) {
                    if (ENABLE_REAL_TRADE) {

                        // 真实交易
                        try {
                            console.log("l1.quote:", l1.quote);
                            console.log("l2.quote:", l2.quote);
                            console.log("l3.quote:", l3.quote);
                            if (!l1.quote.swapTransaction || !l2.quote.swapTransaction || !l3.quote.swapTransaction) {
                                console.log("❌ swapTransaction 字段缺失，无法执行真实套利");
                                continue;
                            }
                            const sig = await executeBatchSwap([
                                Buffer.from(l1.quote.swapTransaction, 'base64'),
                                Buffer.from(l2.quote.swapTransaction, 'base64'),
                                Buffer.from(l3.quote.swapTransaction, 'base64')
                            ], startTime, startSlot);
                            console.log("✅ 真实套利成功，交易哈希:", sig);
                            logArbitrage({ time: new Date().toISOString(), path: [tokenA, tokenB, tokenC], profit, profitPercent, sig });
                            updateSuccessRate(true, profit / 1e6);
                        } catch (e) {
                            console.log("❌ 真实套利失败:", e.message);
                            updateSuccessRate(false, 0);
                        }
                    } else {
                        // 只模拟
                        console.log("✅ 满足利润阈值，仅模拟");
                        logArbitrage({ time: new Date().toISOString(), path: [tokenA, tokenB, tokenC], profit, profitPercent, simulated: true });
                        updateSuccessRate(true, profit / 1e6);
                    }
                } else {
                    console.log("未达利润阈值，仅模拟");
                    updateSuccessRate(false, 0);
                }
            }
        } catch (e) {
            console.error("主循环异常:", e.message);
            if (e.message.includes("429") || e.message.includes("ECONNREFUSED") || e.message.includes("ENOTFOUND")) {
                switchRpc();
            }
        }
        // 休眠一段时间
        await new Promise(r => setTimeout(r, 10000));
    }
}

main().catch(console.error);