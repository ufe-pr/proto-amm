import { u128 } from "as-bignum/assembly/integer/u128";
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";
import { RuneId } from "metashrew-runes/assembly/indexer/RuneId";
import { POOLS } from "../tables";
import { BalanceSheet } from "metashrew-runes/assembly/indexer/BalanceSheet";
import { Swap } from "./Swap";
import { ProtoruneRuneId } from "protorune/assembly/indexer/ProtoruneRuneId";

import { console } from "metashrew-as/assembly/utils";
import {
  fromArrayBuffer,
  nameToArrayBuffer,
} from "metashrew-runes/assembly/utils";

export class Pool {
  public rune1: RuneId;
  public rune2: RuneId;
  constructor(rune1: RuneId, rune2: RuneId) {
    this.rune1 = rune1;
    this.rune2 = rune2;
  }

  static from(ptr: IndexPointer, poolId: RuneId): Pool {
    const poolPointer = ptr.select(poolId.toBytes());
    const rune1 = RuneId.fromBytes(poolPointer.keyword("/rune1").get());
    if (changetype<usize>(rune1) === 0) return changetype<Pool>(0);

    return new Pool(
      rune1,
      RuneId.fromBytes(poolPointer.keyword("/rune2").get())
    );
  }

  poolId(): ProtoruneRuneId {
    return ProtoruneRuneId.encode([
      fromArrayBuffer(nameToArrayBuffer("AMMLP")),
      this.rune1.block,
      this.rune1.tx,
      this.rune2.block,
      this.rune2.tx,
    ]);
  }

  serialize(): ArrayBuffer {
    return IndexPointer.wrap(new ArrayBuffer(0))
      .select(this.rune1.toBytes())
      .select(this.rune2.toBytes())
      .unwrap();
  }

  save(ptr: IndexPointer): void {
    const id = this.poolId().toBytes();
    const poolPointer = ptr.select(id);
    const exists = poolPointer.keyword("/rune1").get().byteLength !== 0;
    poolPointer.keyword("/rune1").set(this.rune1.toBytes());
    poolPointer.keyword("/rune2").set(this.rune2.toBytes());
    if (!exists) {
      POOLS.append(id);
    }
  }

  // Constant product
  static calculateOutput(
    inputAmount: u128,
    inputBalance: u128,
    outputBalance: u128
  ): u128 {
    return u128.from(
      // @ts-ignore
      (inputAmount * outputBalance) / (inputBalance + inputAmount)
    );
  }

  executeSwap(poolSheet: BalanceSheet, swap: Swap): bool {
    // @ts-ignore
    const inputAmount = u128.from((swap.amount * 9970) / 10000); // 0.3% protocol fee
    if (inputAmount.isZero()) return false;
    const input = swap.input;
    const output = swap.output;

    const inputBalance = poolSheet.get(input.toBytes());
    const outputBalance = poolSheet.get(output.toBytes());
    const outputAmount = Pool.calculateOutput(
      inputAmount,
      inputBalance,
      outputBalance
    );
    if (outputAmount.isZero()) return false;
    // @ts-ignore
    poolSheet.set(input.toBytes(), inputBalance + swap.amount);
    // @ts-ignore
    poolSheet.set(output.toBytes(), outputBalance - outputAmount);

    return true;
  }
}
