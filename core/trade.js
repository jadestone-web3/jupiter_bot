import { wallet } from "./wallet.js";
import { Connection, Transaction, ComputeBudgetProgram, PublicKey } from "@solana/web3.js";
import { ENABLE_REAL_TRADE, RPC_LIST } from "../utils/config.js";
import { getCurrentRpc, getConnection } from "../utils/rpc.js";


const blockEngineUrl = "https://mainnet.block-engine.jito.network/api/v1/"; // Jito主网endpoint
const JITO_TIP_ACCOUNT = new PublicKey("T1pyyaTNZsKv2WcRAB8oVnk93mLJw2XzjtVYqCsaHqt"); // Jito 提示账户
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
        const connection = getConnection();

        const { blockhash } = await connection.getLatestBlockhash();
        const transaction = new Transaction();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;
        transaction.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5000 }));
        // 调试和验证 swapTxs
        console.log("swapTxs:", swapTxs);
        if (!Array.isArray(swapTxs) || swapTxs.length === 0) {
            throw new Error("swapTxs 无效或为空");
        }

        for (const swapTx of swapTxs) {
            if (!(swapTx instanceof Buffer) || swapTx.length === 0) {
                console.error("无效的 swapTx:", swapTx);
                throw new Error("swapTx 不是有效的 Buffer");
            }
            const tx = Transaction.from(swapTx);
            if (!tx.instructions || tx.instructions.length === 0) {
                console.warn("空指令集:", swapTx);
                continue;
            }
            transaction.add(...tx.instructions);
        }

        // 添加提示费用
        const tipAmount = 5000; // 0.01 SOL (10,000,000 lamports)
        transaction.add(
            SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: JITO_TIP_ACCOUNT,
                lamports: tipAmount,
            })
        );


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
            jsonrpc: "2.0",
            id: 1,
            method: "sendBundle",
            max_tip: 5000,
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