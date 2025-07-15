import { TOKENS, getTokenName } from "./utils/tokens.js";
import { getQuote, getSwapTransaction } from "./core/quote.js";
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

                const quote1 = await getQuote(tokenA, tokenB, AMOUNT);
                if (quote1.priceImpactPct > MAX_PRICE_IMPACT) {
                    console.log(`quote1 价格影响过大(${(quote1.priceImpactPct * 100).toFixed(2)}%)`);
                    continue;
                }
                const quote2 = await getQuote(tokenB, tokenC, quote1.outAmount);
                if (quote2.priceImpactPct > MAX_PRICE_IMPACT) {
                    console.log(`quote2 价格影响过大(${(quote2.priceImpactPct * 100).toFixed(2)}%)`);
                    continue;
                }
                const quote3 = await getQuote(tokenC, tokenA, quote2.outAmount);
                if (quote3.priceImpactPct > MAX_PRICE_IMPACT) {
                    console.log(`quote3 价格影响过大(${(quote3.priceImpactPct * 100).toFixed(2)}%)`);
                    continue;
                }

                console.log(`quote time = ${Date.now() - startTime}`);

                // calculate profit
                const profit = quote3.outAmount - AMOUNT;
                const profitPercent = (profit / AMOUNT) * 100;

                console.log(`预期利润: ${profit / 1e6} (${profitPercent.toFixed(4)}%)`);
                // 3.3 满足条件则执行套利
                if (profitPercent > MIN_PROFIT_PERCENT) {
                    if (ENABLE_REAL_TRADE) {
                        // 真实交易
                        try {
                            // 解析所有 swap 交易
                            const swapTxs = await Promise.all([
                                getSwapTransaction(quote1, wallet.publicKey),
                                getSwapTransaction(quote2, wallet.publicKey),
                                getSwapTransaction(quote3, wallet.publicKey),
                            ]);
                            console.log(`getSwapTransaction time = ${Date.now() - startTime}`);
                            const sig = await executeBatchSwap(swapTxs, startTime);
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