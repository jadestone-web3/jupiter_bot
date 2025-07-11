async function testQuote() {
    const inputMint = TOKENS.USDC;
    const outputMint = TOKENS.SOL;
    const amount = 1_000_000; // 1 USDC

    const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=30`;
    const res = await fetch(url);
    const data = await res.json();

    console.log("【Jupiter报价测试】");
    console.log(`USDC → SOL 1 USDC`);
    console.log("返回数据：", data);
}

testQuote().catch(console.error); 