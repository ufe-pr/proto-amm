import { TEST_BTC_ADDRESS2, buildProgram } from "metashrew-runes/lib/tests/utils/general";
import { DEBUG_WASM } from "./general";
import { describe, it, beforeEach, expect } from "vitest";
import { IndexerProgram } from "metashrew-test";

import { createMultipleProtoruneFixture } from "protorune/tests/utils/fixtures";

import { constructProtostoneTx } from "protorune/tests/utils/protoburn";
import { ProtoStone } from "protorune/src.ts/protostone";
import { u128 } from "@magiceden-oss/runestone-lib/dist/src/integer/u128";
import { u64 } from "@magiceden-oss/runestone-lib/dist/src/integer/u64";
import { RuneId } from "@magiceden-oss/runestone-lib/dist/src/runeid";
import { u32 } from "@magiceden-oss/runestone-lib/dist/src/integer/u32";

import { createCalldata } from "./utils/buffer";
import { TEST_PROTOCOL_TAG } from "./constants";
import { protorunesbyaddress, runtime } from "protorune/tests/utils/view-helpers";
import { nthRoot } from "./utils/math";

// TODO: Create helper functions for protomessages in testing

describe("Protorune AMM protocol", () => {
  let program: IndexerProgram;

  beforeEach(async () => {
    program = buildProgram(DEBUG_WASM);
    program.setBlockHeight(840000);
  });

  describe.skip("Burn", () => {
    const burnCalldata = createCalldata("burn");
    const mintCalldata = createCalldata("mint");
    it("should burn liquidity and give back original runes", async () => {
      let { runeId1, runeId2, output, block, refundOutput, premineAmount, pointerToReceiveRunes } =
        await createMultipleProtoruneFixture(TEST_PROTOCOL_TAG, false, 210000000n);

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
            calldata: mintCalldata,
          }),
        ],
        block,
        2
      );
      const poolId = new RuneId(u64(127), u32(3231855362));
      block = constructProtostoneTx(
        [
          {
            inputTxHash: block.transactions?.at(4)?.getHash(), //protoburn is at tx2
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
                id: poolId,
                output: u32(5),
              },
            ],
          }),
          ProtoStone.message({
            protocolTag: TEST_PROTOCOL_TAG,
            pointer: 2,
            refundPointer: 1,
            calldata: burnCalldata,
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
      expect(runtimeStats.balances.length).to.equal(0); // Since runtime is drained

      const addr2ptrns = await protorunesbyaddress(program, TEST_BTC_ADDRESS2, TEST_PROTOCOL_TAG);

      expect(
        addr2ptrns.balanceSheet.find((e) => e.rune.id.toString() === poolId.toString()).balance ?? 0
      ).toEqual(0n);
      expect(
        addr2ptrns.balanceSheet.find(
          (e) => e.rune.id.toString() === new RuneId(u64(runeId1.block), u32(runeId1.tx)).toString()
        ).balance ?? 0
      ).toEqual(premineAmount);
      expect(
        addr2ptrns.balanceSheet.find(
          (e) => e.rune.id.toString() === new RuneId(u64(runeId2.block), u32(runeId2.tx)).toString()
        ).balance ?? 0
      ).toEqual(premineAmount);
    });

    it("should burn liquidity with correct withdrawal of original runes", async () => {
      let { runeId1, runeId2, output, block, refundOutput, premineAmount, pointerToReceiveRunes } =
        await createMultipleProtoruneFixture(TEST_PROTOCOL_TAG, false, 210000000n);

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
                amount: u128(premineAmount / 2n),
                id: new RuneId(u64(runeId1.block), u32(runeId1.tx)),
                output: u32(5),
              },
            ],
          }),
          ProtoStone.message({
            protocolTag: TEST_PROTOCOL_TAG,
            pointer: 3,
            refundPointer: 1,
            calldata: mintCalldata,
          }),
        ],
        block,
        2
      );
      const poolId = new RuneId(u64(127), u32(3231855362));
      block = constructProtostoneTx(
        [
          {
            inputTxHash: block.transactions?.at(4)?.getHash(), //protoburn is at tx2
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
                amount: u128(nthRoot(premineAmount ** 2n / 2n)),
                id: poolId,
                output: u32(5),
              },
            ],
          }),
          ProtoStone.message({
            protocolTag: TEST_PROTOCOL_TAG,
            pointer: 2,
            refundPointer: 1,
            calldata: burnCalldata,
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
      expect(runtimeStats.balances.length).to.equal(0); // Since runtime is drained

      const addr2ptrns = await protorunesbyaddress(program, TEST_BTC_ADDRESS2, TEST_PROTOCOL_TAG);

      expect(
        addr2ptrns.balanceSheet.find((e) => e.rune.id.toString() === poolId.toString()).balance ?? 0
      ).toEqual(0n);
      expect(
        addr2ptrns.balanceSheet.find(
          (e) => e.rune.id.toString() === new RuneId(u64(runeId1.block), u32(runeId1.tx)).toString()
        ).balance ?? 0
      ).toEqual(premineAmount / 2n);
      expect(
        addr2ptrns.balanceSheet.find(
          (e) => e.rune.id.toString() === new RuneId(u64(runeId2.block), u32(runeId2.tx)).toString()
        ).balance ?? 0
      ).toEqual(premineAmount);
    });
  });
});
