import { getTokenBalance } from "./balance.js";
import { getQuote } from "./quote.js";
import { executeBatchSwap } from "./trade.js";
import { TOKENS } from "../utils/tokens.js";
// 主币余额低于阈值时，自动将其他币种兑换为主币（USDC），排除SOL作为gas费。
export async function autoGatherToMainToken(wallet, mainToken, pairs, minAmount = 0.1) {
    const gatherTokens = Array.from(new Set(pairs.map(pair => pair[1])));
    for (const token of gatherTokens) {
        if (token === mainToken || token === TOKENS.SOL) continue;
        const bal = await getTokenBalance(wallet.publicKey.toBase58(), token);
        if (bal >= minAmount) {
            const quote = await getQuote(token, mainToken, Math.floor(bal * 1e6));
            if (quote && quote.outAmount > 0) {
                // 这里应集成真实swap
                await executeBatchSwap([Buffer.from(quote.swapTransaction, 'base64')]);
            }
        }
    }
}
