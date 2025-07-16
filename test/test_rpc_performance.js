import { Connection } from "@solana/web3.js";
import { getConnection } from "../utils/rpc.js";

const connection = getConnection();

async function testSlot(times) {
    const start = Date.now();
    for (let i = 0; i < times; i++) {
        await connection.getSlot();
    }
    const end = Date.now();
    console.log(`getSlot ${times} 次总耗时: ${end - start} ms`);
}

async function testBlockhash(times) {
    const start = Date.now();
    for (let i = 0; i < times; i++) {
        await connection.getLatestBlockhash();
    }
    const end = Date.now();
    console.log(`getLatestBlockhash ${times} 次总耗时: ${end - start} ms`);
}

async function main() {
    console.log("=== Slot 测试 ===");
    await testSlot(1);
    await testSlot(10);
    await testSlot(100);

    console.log("\n=== Blockhash 测试 ===");
    await testBlockhash(1);
    await testBlockhash(10);
    await testBlockhash(100);
}

main().catch(console.error); 