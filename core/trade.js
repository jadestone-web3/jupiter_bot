import { wallet } from "./wallet.js";
import { SystemProgram, Transaction, PublicKey } from "@solana/web3.js";
import { ENABLE_REAL_TRADE } from "../utils/config.js";
import { getConnection } from "../utils/rpc.js";


const blockEngineUrl = "https://mainnet.block-engine.jito.wtf/api/v1/"; // Jito主网endpoint
const JITO_TIP_ACCOUNT = new PublicKey("T1pyyaTNZsKv2WcRAB8oVnk93mLJw2XzjtVYqCsaHqt"); // Jito 提示账户
// 支持批量swap，自动判断模拟/实盘，助记词钱包签名，自动广播和确认。

/**
 * 执行批量swap（支持模拟/实盘）
 * @param {Array<Buffer>} swapTxs
 * @returns {Promise<string>} 交易哈希或模拟标识
 */
export async function executeBatchSwap(swapTxs, startTime) {
    if (!ENABLE_REAL_TRADE) {
        return "SIMULATED_BATCH_SIGNATURE";
    }
    try {

        // 检查耗时和slot
        const connection = getConnection();
        const now = Date.now();
        if ((now - startTime) > 750) {
            console.log(`⏱️ 超时或slot变化，取消本次套利: 耗时${now - startTime}ms`);
            throw new Error('slot超时');
        }

        // 构造 tip 交易
        const tipTx = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: wallet.publicKey,
                toPubkey: JITO_TIP_ACCOUNT,
                lamports: 5000, // 0.000005 SOL
            })
        );
        tipTx.feePayer = wallet.publicKey;
        tipTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        tipTx.sign(wallet);
        const tipTxBase64 = tipTx.serialize().toString('base64');

        const bundleTxs = [tipTxBase64, ...swapTxs];
        // 直接打包发送给 Jito
        const body = {
            transactions: bundleTxs, // base64字符串数组
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
        console.log(`request jito result =`, result);
        return await pollBundleStatus(result.bundle_id);
    } catch (e) {
        console.error("❌ 批量swap执行失败，完整异常对象：", e);

        if (e.response) {
            const text = await e.response.text?.();
            console.error("返回体：", text);
        }

        throw new Error("批量swap执行失败: " + (e.stack || e.message || e));
    }

    // 2. 轮询 Bundle 状态（HTTP GET）
    async function pollBundleStatus(bundleId) {
        const statusUrl = `https://mainnet.block-engine.jito.wtf/api/v1/bundles/${bundleId}`;
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