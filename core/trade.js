import { wallet } from "./wallet.js";
import { Connection, Transaction } from "@solana/web3.js";
import { ENABLE_REAL_TRADE, RPC_LIST } from "../utils/config.js";
import { getCurrentRpc } from "../utils/rpc.js";

// 支持批量swap，自动判断模拟/实盘，助记词钱包签名，自动广播和确认。

/**
 * 执行批量swap（支持模拟/实盘）
 * @param {Array<Buffer>} swapTxs
 * @returns {Promise<string>} 交易哈希或模拟标识
 */
export async function executeBatchSwap(swapTxs) {
    if (!ENABLE_REAL_TRADE) {
        return "SIMULATED_BATCH_SIGNATURE";
    }
    try {
        const connection = new Connection(getCurrentRpc(), "confirmed");

        const { blockhash } = await connection.getLatestBlockhash();
        const transaction = new Transaction();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;
        for (const swapTx of swapTxs) {
            const tx = Transaction.from(swapTx);
            transaction.add(...tx.instructions);
        }
        transaction.sign(wallet);
        const signature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
        });
        await connection.confirmTransaction(signature, 'confirmed');
        return signature;
    } catch (e) {
        throw new Error("批量swap执行失败: " + e.message);
    }
}