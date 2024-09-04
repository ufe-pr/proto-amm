// import fs from "node:fs";

// import * as path from "node:path";
// import { expect } from "chai";
//@ts-ignore
// import bitcoinjs = require("bitcoinjs-lib");
import {
  buildProgram,
  // formatKv,
  // TEST_BTC_ADDRESS1,
  // TEST_BTC_ADDRESS2,
} from "metashrew-runes/lib/tests/utils/general";
// import {
//   initCompleteBlockWithRuneEtching,
//   runesbyaddress,
//   transferRune,
// } from "metashrew-runes/lib/tests/utils/rune-helpers";
// import {
//   buildCoinbaseToAddress,
//   buildDefaultBlock,
// } from "metashrew-runes/lib/tests/utils/block-helpers";
import {
  createProtomessageFixture,
  createProtoruneFixture,
} from "protorune/tests/utils/fixtures";
import { DEBUG_WASM } from "./general";
import { IndexerProgram, IndexPointer } from "metashrew-test";
// import { constructProtostoneTx } from "protorune/tests/utils/protoburn";
// import { inspect } from "node:util";
import { describe, it, beforeEach } from "vitest";
import { constructProtostoneTx } from "protorune/tests/utils/protoburn";
import { ProtoStone } from "protorune/src.ts/protostone";
import { u128 } from "@magiceden-oss/runestone-lib/dist/src/integer/u128";
import { u64 } from "@magiceden-oss/runestone-lib/dist/src/integer/u64";
import { RuneId } from "@magiceden-oss/runestone-lib/dist/src/runeid";
import { u32 } from "@magiceden-oss/runestone-lib/dist/src/integer/u32";

// class RuneId {
//   public height: number;
//   public txindex: number;

//   constructor(height: number, txindex: number) {
//     this.height = height;
//     this.txindex = txindex;
//   }

//   static from({ height, txindex }: any): RuneId {
//     const runeId = new RuneId(height, txindex);
//     return runeId;
//   }
//   toBytes(): Buffer {
//     const result = Buffer.allocUnsafe(16);
//     result.writeUintLE(this.height, 0, 16);
//     result.writeUintLE(this.txindex, 16, 16);
//     return result;
//   }
// }
const TEST_PROTOCOL_TAG = BigInt("20000024");
const addHexPrefix = (s) => (s.substr(0, 2) === "0x" ? s : "0x" + s);

const toHex = (v) => addHexPrefix(v.toString("hex"));
const concat = (...args: any[]) => toHex(Buffer.concat(args));

// const u32 = (v: number): string => {
//   const result = Buffer.allocUnsafe(4);
//   result.writeUint32LE(0, v);
//   return toHex(result);
// };

describe("QUORUM•GENESIS•PROTORUNE", () => {
  let program: IndexerProgram;
  beforeEach(async () => {
    program = buildProgram(DEBUG_WASM);
    program.setBlockHeight(849236);
  });

  it("should send message with protorunes", async () => {
    // let {
    //   runeId,
    //   output,
    //   block,
    //   refundOutput,
    //   input,
    //   premineAmount,
    //   pointerToReceiveRunes,
    // } = await createProtoruneFixture(TEST_PROTOCOL_TAG, false, 210000000n);
    // const calldata = Buffer.from("mint");
    // block = constructProtostoneTx(
    //   [
    //     {
    //       inputTxHash: block.transactions?.at(2)?.getHash(), //protoburn is at tx2
    //       inputTxOutputIndex: 1,
    //     },
    //   ],
    //   [output, refundOutput],
    //   [],
    //   [
    //     ProtoStone.edicts({
    //       protocolTag: TEST_PROTOCOL_TAG,
    //       edicts: [
    //         {
    //           amount: u128(premineAmount),
    //           id: new RuneId(u64(runeId.block), u32(runeId.tx)),
    //           output: u32(5),
    //         },
    //       ],
    //     }),
    //     ProtoStone.message({
    //       protocolTag: TEST_PROTOCOL_TAG,
    //       pointer: 2,
    //       refundPointer: 2,
    //       calldata,
    //     }),
    //   ],
    //   block,
    //   2
    // );
    const {block} = await createProtomessageFixture({
      protocolTag: TEST_PROTOCOL_TAG,
      protomessagePointer: 2,
      protomessageRefundPointer: 1
    })
    program.setBlock(block.toHex());

    await program.run("_start");

  });
});
