import { Keypair } from "@solana/web3.js";
import bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import { MNEMONIC } from "../utils/config.js";

if (!MNEMONIC) throw new Error("请在.env中配置MNEMONIC");

const seed = await bip39.mnemonicToSeed(MNEMONIC);
const DERIVATION_PATH = "m/44'/501'/0'/0'";
const { key } = derivePath(DERIVATION_PATH, seed.toString("hex"));
export const wallet = Keypair.fromSeed(key);
export const publicKey = wallet.publicKey;
