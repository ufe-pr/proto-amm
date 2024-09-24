import {
  TEST_BTC_ADDRESS1,
  TEST_BTC_ADDRESS2,
  buildProgram,
} from "metashrew-runes/lib/tests/utils/general";
import { createMultipleProtoruneFixture } from "protorune/tests/utils/fixtures";
import { DEBUG_WASM } from "./general";
import { IndexerProgram, IndexPointer } from "metashrew-test";
import { describe, it, beforeEach, expect, beforeAll } from "vitest";
import { constructProtostoneTx } from "protorune/tests/utils/protoburn";
import { ProtoStone } from "protorune/src.ts/protostone";
import { u128 } from "@magiceden-oss/runestone-lib/dist/src/integer/u128";
import { u64 } from "@magiceden-oss/runestone-lib/dist/src/integer/u64";
import { RuneId } from "@magiceden-oss/runestone-lib/dist/src/runeid";
import { u32 } from "@magiceden-oss/runestone-lib/dist/src/integer/u32";

import { protorunesbyaddress, runtime } from "protorune/tests/utils/view-helpers";

import { nthRoot } from "./utils/math";
import { createCalldata } from "./utils/buffer";
import { TEST_PROTOCOL_TAG } from "./constants";

describe("Protorune AMM protocol", () => {
  let program: IndexerProgram;

  beforeEach(async () => {
    program = buildProgram(DEBUG_WASM);
    program.setBlockHeight(840000);
  });

  describe.skip("Mint", () => {
    it("should send mint LP token at all", async () => {
      let { runeId1, runeId2, output, block, refundOutput, premineAmount, pointerToReceiveRunes } =
        await createMultipleProtoruneFixture(TEST_PROTOCOL_TAG, false, 210000000n);
      const calldata = createCalldata("mint");
      block = constructProtostoneTx(
        [
          {
            inputTxHash: block.transactions?.at(3)?.getHash(), //protoburn is at tx2
            inputTxOutputIndex: pointerToReceiveRunes,
          },
        ],
        [output, refundOutput],
        [],
        [
          ProtoStone.edicts({
            protocolTag: TEST_PROTOCOL_TAG,
            edicts: [
              {
                amount: u128(premineAmount),
                id: new RuneId(u64(runeId2.block), u32(runeId2.tx)),
                output: u32(5),
              },
              {
                amount: u128(premineAmount),
                id: new RuneId(u64(runeId1.block), u32(runeId1.tx)),
                output: u32(5),
              },
            ],
          }),
          ProtoStone.message({
            protocolTag: TEST_PROTOCOL_TAG,
            pointer: 2,
            refundPointer: 1,
            calldata,
          }),
        ],
        block,
        2
      );
      program.setBlock(block.toHex());

      await program.run("_start");
      const runtimeStats = await runtime(program, TEST_PROTOCOL_TAG, {
        height: Number(runeId2.block),
        txindex: runeId2.tx,
      });
      expect(runtimeStats.balances.length).to.equal(2); // Two protorunes were sent to the runtime (it doesn't own its own LP tokens)
      expect(runtimeStats.balances[0].balance).to.equal(premineAmount);
      expect(runtimeStats.balances[1].balance).to.equal(premineAmount);

      const addr2ptrns = await protorunesbyaddress(program, TEST_BTC_ADDRESS2, TEST_PROTOCOL_TAG);
      expect(addr2ptrns.balanceSheet.length).to.equal(3); // Third item is the pool specific protorune
    });

    it("should mint correct token amount (premine amount)", async () => {
      let { runeId1, runeId2, output, block, refundOutput, premineAmount, pointerToReceiveRunes } =
        await createMultipleProtoruneFixture(TEST_PROTOCOL_TAG, false, 210000000n);
      const calldata = createCalldata("mint");
      block = constructProtostoneTx(
        [
          {
            inputTxHash: block.transactions?.at(3)?.getHash(), //protoburn is at tx2
            inputTxOutputIndex: pointerToReceiveRunes,
          },
        ],
        [output, refundOutput],
        [],
        [
          ProtoStone.edicts({
            protocolTag: TEST_PROTOCOL_TAG,
            edicts: [
              {
                amount: u128(premineAmount),
                id: new RuneId(u64(runeId2.block), u32(runeId2.tx)),
                output: u32(5),
              },
              {
                amount: u128(premineAmount),
                id: new RuneId(u64(runeId1.block), u32(runeId1.tx)),
                output: u32(5),
              },
            ],
          }),
          ProtoStone.message({
            protocolTag: TEST_PROTOCOL_TAG,
            pointer: 2,
            refundPointer: 1,
            calldata,
          }),
        ],
        block,
        2
      );
      // const {block} = await createProtomessageFixture({
      //   protocolTag: TEST_PROTOCOL_TAG,
      //   protomessagePointer: 2,
      //   protomessageRefundPointer: 1
      // })
      program.setBlock(block.toHex());

      await program.run("_start");
      const addr2ptrns = await protorunesbyaddress(program, TEST_BTC_ADDRESS2, TEST_PROTOCOL_TAG);
      expect(addr2ptrns.balanceSheet.length).to.equal(3); // Third item is the pool specific protorune
      expect(addr2ptrns.balanceSheet[2].balance).to.equal(premineAmount);
    });

    it("should mint correct token amount (premine amount, same pointer and refund pointer)", async () => {
      let { runeId1, runeId2, output, block, refundOutput, premineAmount, pointerToReceiveRunes } =
        await createMultipleProtoruneFixture(TEST_PROTOCOL_TAG, false, 210000000n);
      const calldata = createCalldata("mint");
      block = constructProtostoneTx(
        [
          {
            inputTxHash: block.transactions?.at(3)?.getHash(), //protoburn is at tx2
            inputTxOutputIndex: pointerToReceiveRunes,
          },
        ],
        [output, refundOutput],
        [],
        [
          ProtoStone.edicts({
            protocolTag: TEST_PROTOCOL_TAG,
            edicts: [
              {
                amount: u128(premineAmount),
                id: new RuneId(u64(runeId2.block), u32(runeId2.tx)),
                output: u32(5),
              },
              {
                amount: u128(premineAmount),
                id: new RuneId(u64(runeId1.block), u32(runeId1.tx)),
                output: u32(5),
              },
            ],
          }),
          ProtoStone.message({
            protocolTag: TEST_PROTOCOL_TAG,
            pointer: 1,
            refundPointer: 1,
            calldata,
          }),
        ],
        block,
        2
      );
      // const {block} = await createProtomessageFixture({
      //   protocolTag: TEST_PROTOCOL_TAG,
      //   protomessagePointer: 2,
      //   protomessageRefundPointer: 1
      // })
      program.setBlock(block.toHex());

      await program.run("_start");
      const addr2ptrns = await protorunesbyaddress(program, TEST_BTC_ADDRESS2, TEST_PROTOCOL_TAG);
      expect(addr2ptrns.balanceSheet.length).to.equal(3); // Third item is the pool specific protorune
      expect(addr2ptrns.balanceSheet[2].balance).to.equal(premineAmount);
    });

    it("should mint correct token amount (A - premine amount, B - half premine amount)", async () => {
      let { runeId1, runeId2, output, block, refundOutput, premineAmount, pointerToReceiveRunes } =
        await createMultipleProtoruneFixture(TEST_PROTOCOL_TAG, false, 210000000n);
      const calldata = createCalldata("mint");
      block = constructProtostoneTx(
        [
          {
            inputTxHash: block.transactions?.at(3)?.getHash(), //protoburn is at tx2
            inputTxOutputIndex: pointerToReceiveRunes,
          },
        ],
        [output, refundOutput],
        [],
        [
          ProtoStone.edicts({
            protocolTag: TEST_PROTOCOL_TAG,
            edicts: [
              {
                amount: u128(premineAmount / 2n),
                id: new RuneId(u64(runeId2.block), u32(runeId2.tx)),
                output: u32(5),
              },
              {
                amount: u128(premineAmount),
                id: new RuneId(u64(runeId1.block), u32(runeId1.tx)),
                output: u32(5),
              },
            ],
          }),
          ProtoStone.message({
            protocolTag: TEST_PROTOCOL_TAG,
            pointer: 3, // Don't know why but using 2 here causes a runtime error
            refundPointer: 1,
            calldata,
          }),
        ],
        block,
        2
      );
      program.setBlock(block.toHex());

      await program.run("_start");

      const addr2ptrns = await protorunesbyaddress(program, TEST_BTC_ADDRESS2, TEST_PROTOCOL_TAG);

      expect(addr2ptrns.balanceSheet.length).to.equal(3); // Third item is the pool specific protorune
      // Constant product
      expect(addr2ptrns.balanceSheet[2].balance).to.equal(
        nthRoot((premineAmount * premineAmount) / 2n)
      );
    });

    it("should mint correct token amount (A - premine amount, B - half premine amount, same pointer and refund pointer)", async () => {
      let { runeId1, runeId2, output, block, refundOutput, premineAmount, pointerToReceiveRunes } =
        await createMultipleProtoruneFixture(TEST_PROTOCOL_TAG, false, 210000000n);
      const calldata = createCalldata("mint");
      block = constructProtostoneTx(
        [
          {
            inputTxHash: block.transactions?.at(3)?.getHash(), //protoburn is at tx2
            inputTxOutputIndex: pointerToReceiveRunes,
          },
        ],
        [output, refundOutput],
        [],
        [
          ProtoStone.edicts({
            protocolTag: TEST_PROTOCOL_TAG,
            edicts: [
              {
                amount: u128(premineAmount / 2n),
                id: new RuneId(u64(runeId2.block), u32(runeId2.tx)),
                output: u32(5),
              },
              {
                amount: u128(premineAmount),
                id: new RuneId(u64(runeId1.block), u32(runeId1.tx)),
                output: u32(5),
              },
            ],
          }),
          ProtoStone.message({
            protocolTag: TEST_PROTOCOL_TAG,
            pointer: 1,
            refundPointer: 1,
            calldata,
          }),
        ],
        block,
        2
      );
      program.setBlock(block.toHex());

      await program.run("_start");

      const addr2ptrns = await protorunesbyaddress(program, TEST_BTC_ADDRESS2, TEST_PROTOCOL_TAG);

      expect(addr2ptrns.balanceSheet.length).to.equal(3); // Third item is the pool specific protorune
      // Constant product
      expect(addr2ptrns.balanceSheet[2].balance).to.equal(
        nthRoot((premineAmount * premineAmount) / 2n)
      );
    });
  });
});
