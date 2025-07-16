import { Connection } from "@solana/web3.js";
import { getConnection } from "../utils/rpc.js";

const connection = getConnection();

async function testSlot(times) {
    const start = Date.now();
    for (let i = 0; i < times; i++) {
        try {
            await connection.getSlot();
        } catch (e) {
            console.error(`getSlot 第${i + 1}次出错:`, e.message);
        }
    }
    const end = Date.now();
    console.log(`getSlot ${times} 次总耗时: ${end - start} ms`);
}

async function testBlockhash(times) {
    const start = Date.now();
    for (let i = 0; i < times; i++) {
        try {
            await connection.getLatestBlockhash();
        } catch (e) {
            console.error(`getLatestBlockhash 第${i + 1}次出错:`, e.message);
        }
    }
    const end = Date.now();
    console.log(`getLatestBlockhash ${times} 次总耗时: ${end - start} ms`);
}

async function main() {
    console.log("=== Slot 测试 ===");
    await testSlot(1);


    await testSlot(1);
    await testSlot(1);
    await testSlot(2);

    console.log("\n=== Blockhash 测试 ===");
    await testBlockhash(1);
    await testBlockhash(1);
    await testBlockhash(1);
    await testBlockhash(2);

}

main().catch(console.error); 