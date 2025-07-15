import fetch from "node-fetch";

/**
 * 获取Jupiter报价
 * @param {string} inputMint 输入币种mint
 * @param {string} outputMint 输出币种mint
 * @param {number} amount 输入数量（整数，按最小单位）
 * @param {number} slippageBps 滑点，默认30（0.3%）
 * @returns {Promise<object>} Jupiter报价返回对象
 */
export async function getQuote(inputMint, outputMint, amount, slippageBps = 30) {
    const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Quote fetch failed");
    return await res.json();
}

export async function getSwapTransaction(quoteResponse, publicKey) {
    const { swapTransaction } = await (
        await fetch('https://quote-api.jup.ag/v6/swap', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                // quoteResponse from /quote api
                quoteResponse,
                // user public key to be used for the swap
                userPublicKey: publicKey.toString(),
                // auto wrap and unwrap SOL. default is true
                wrapAndUnwrapSol: true,
                // Optional, use if you want to charge a fee.  feeBps must have been passed in /quote API.
                // feeAccount: "fee_account_public_key"
            })
        })
    ).json();
    return Buffer.from(swapTransaction, 'base64');
}
// get serialized transactions for the swap
