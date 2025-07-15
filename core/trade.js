import { wallet } from "./wallet.js";
import { Connection, Transaction } from "@solana/web3.js";
import { ENABLE_REAL_TRADE, RPC_LIST } from "../utils/config.js";
import { getCurrentRpc } from "../utils/rpc.js";


const blockEngineUrl = "https://mainnet.block-engine.jito.network/api/v1/"; // Jito主网endpoint

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
        transaction.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 2000 }));

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
        const body = {
            transactions: [serializedTx], // 这里是 base64 编码的交易
            // 其他参数可根据需要添加
        };

        const response = await fetch(blockEngineUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Jito Block Engine 返回错误: ${response.status} ${await response.text()}`);
        }

        const result = await response.json();
        console.log(`request jito result = ${result}`);
        return await pollBundleStatus(result.bundle_id);
    } catch (e) {
        throw new Error("批量swap执行失败: " + e.message);
    }

    // 2. 轮询 Bundle 状态（HTTP GET）
    async function pollBundleStatus(bundleId) {
        const statusUrl = `https://mainnet.block-engine.jito.network/api/v1/bundles/${bundleId}`;
        let bundleStatus = null;

        for (let i = 0; i < 10; i++) {
            const response = await fetch(statusUrl);
            if (!response.ok) {
                throw new Error(`查询 bundle 状态失败: ${response.status} ${await response.text()}`);
            }
            const result = await response.json();
            bundleStatus = result;

            if (bundleStatus && bundleStatus.confirmation_status === 'confirmed') {
                console.log(`Bundle 已确认，Signature: ${bundleStatus.transactions[0]}`);
                return bundleStatus.transactions[0]; // 返回第一个交易的签名
            }

            // 等待 1 秒后重试
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        throw new Error('Bundle 状态未在超时时间内确认');
    }

}