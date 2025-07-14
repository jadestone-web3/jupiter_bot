import { wallet } from "./wallet.js";
import { Connection, Transaction } from "@solana/web3.js";
import { ENABLE_REAL_TRADE, RPC_LIST } from "../utils/config.js";
import { getCurrentRpc } from "../utils/rpc.js";
import { BlockEngineClient } from "@jito-foundation/jito-ts";

const blockEngineUrl = "https://mainnet.block-engine.jito.network/api/v1/"; // Jito主网endpoint
const blockEngineClient = new BlockEngineClient(blockEngineUrl);


// 支持批量swap，自动判断模拟/实盘，助记词钱包签名，自动广播和确认。

/**
 * 执行批量swap（支持模拟/实盘）
 * @param {Array<Buffer>} swapTxs
 * @returns {Promise<string>} 交易哈希或模拟标识
 */
export async function executeBatchSwap(swapTxs, startTime, startSlot) {
    if (!ENABLE_REAL_TRADE) {
        return "SIMULATED_BATCH_SIGNATURE";
    }
    try {
        const connection = new Connection(getCurrentRpc(), "confirmed");

        const { blockhash } = await connection.getLatestBlockhash();
        const transaction = new Transaction();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;
        transaction.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 }));
        for (const swapTx of swapTxs) {
            const tx = Transaction.from(swapTx);
            transaction.add(...tx.instructions);
        }
        transaction.sign(wallet);

        // jito
        // 序列化交易
        const serializedTx = transaction.serialize().toString('base64');

         // 检查耗时和slot
         const now = Date.now();
         const nowSlot = await connection.getSlot();
         if ((now - startTime) > 300 || nowSlot !== startSlot) {
             console.log(`⏱️ 超时或slot变化，取消本次套利: 耗时${now - startTime}ms, slot变化${startSlot}→${nowSlot}`);
             throw new Error('slot超时');
         }
        // 提交 Bundle 到 Jito
        const bundleId = await blockEngineClient.sendBundle([serializedTx]);
        console.log(`Bundle 已提交，Bundle ID: ${bundleId}`);

        // 轮询 Bundle 状态以确认执行
        let bundleStatus = null;
        for (let i = 0; i < 10; i++) {
        const statuses = await blockEngineClient.getBundleStatuses([bundleId]);
        bundleStatus = statuses.value[0];

        if (bundleStatus && bundleStatus.confirmation_status === 'confirmed') {
            console.log(`Bundle 已确认，Signature: ${bundleStatus.transactions[0]}`);
            return bundleStatus.transactions[0]; // 返回第一个交易的签名
        }

        // 等待 1 秒后重试
        await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        throw new Error('Bundle 未在规定时间内确认');

        // const signature = await connection.sendRawTransaction(transaction.serialize(), {
        //     skipPreflight: false,
        //     preflightCommitment: 'confirmed'
        // });
        // await connection.confirmTransaction(signature, 'confirmed');
        // return signature;
    } catch (e) {
        throw new Error("批量swap执行失败: " + e.message);
    }
}