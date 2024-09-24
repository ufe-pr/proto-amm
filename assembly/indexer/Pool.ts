import { u128 } from "as-bignum/assembly/integer/u128";
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";
import { RuneId } from "metashrew-runes/assembly/indexer/RuneId";
import { POOLS } from "../tables";
import { BalanceSheet } from "metashrew-runes/assembly/indexer/BalanceSheet";
import { Swap } from "./Swap";
import { ProtoruneRuneId } from "protorune/assembly/indexer/ProtoruneRuneId";

import { console } from "metashrew-as/assembly/utils";
import { fromArrayBuffer, nameToArrayBuffer, toArrayBuffer } from "metashrew-runes/assembly/utils";
import { ProtoruneTable } from "protorune/assembly/indexer/tables/protorune";

export class Pool {
  public rune1: RuneId;
  public rune2: RuneId;
  private _runeId: RuneId;
  constructor(rune1: RuneId, rune2: RuneId) {
    const prid = ProtoruneRuneId.encode([
      fromArrayBuffer(nameToArrayBuffer("AMMLP")),
      rune1.block,
      rune1.tx,
      rune2.block,
      rune2.tx,
    ]);
    this._runeId = RuneId.fromBytes(prid.toBytes());
    this.rune1 = rune1;
    this.rune2 = rune2;
  }

  static from(ptr: IndexPointer, poolId: RuneId): Pool {
    const poolPointer = ptr.select(poolId.toBytes());
    const rune1 = RuneId.fromBytes(poolPointer.keyword("/rune1").get());
    if (changetype<usize>(rune1) === 0) return changetype<Pool>(0);

    return new Pool(rune1, RuneId.fromBytes(poolPointer.keyword("/rune2").get()));
  }

  poolId(): RuneId {
    return this._runeId;
  }

  serialize(): ArrayBuffer {
    return IndexPointer.wrap(new ArrayBuffer(0))
      .select(this.rune1.toBytes())
      .select(this.rune2.toBytes())
      .unwrap();
  }

  etchPoolToken(table: ProtoruneTable): void {
    // TODO: Etch LP protorune details, name, symbol, divisibility, spacers...
    let name = table.RUNE_ID_TO_ETCHING.select(this.poolId().toBytes()).get();
    if (name.byteLength !== 0) return;
    console.log("Etching pool token... " + this.poolId().inspect());
    // TODO: Come up with a better way to have different names for different pools
    name = nameToArrayBuffer("BMMLP");
    table.RUNE_ID_TO_ETCHING.select(this.poolId().toBytes()).set(name);
    table.SYMBOL.select(name).set(new ArrayBuffer(1));
    table.ETCHINGS.append(name);
  }

  save(ptr: IndexPointer, table: ProtoruneTable): void {
    this.etchPoolToken(table);
    const id = this.poolId().toBytes();
    const poolPointer = ptr.select(id);
    const exists = poolPointer.keyword("/rune1").get().byteLength !== 0;
    poolPointer.keyword("/rune1").set(this.rune1.toBytes());
    poolPointer.keyword("/rune2").set(this.rune2.toBytes());
    if (!exists) {
      POOLS.append(id);
    }
  }

  increaseTotalSupply(ptr: IndexPointer, amount: u128): void {
    const poolPointer = ptr.select(this.poolId().toBytes());
    const totalSupply = fromArrayBuffer(poolPointer.keyword("/totalSupply").get());
    poolPointer.keyword("/totalSupply").set(toArrayBuffer(u128.add(totalSupply, amount)));
  }

  decreaseTotalSupply(ptr: IndexPointer, amount: u128): void {
    const poolPointer = ptr.select(this.poolId().toBytes());
    const totalSupply = fromArrayBuffer(poolPointer.keyword("/totalSupply").get());
    poolPointer.keyword("/totalSupply").set(toArrayBuffer(u128.sub(totalSupply, amount)));
  }

  totalSupply(ptr: IndexPointer): u128 {
    const poolPointer = ptr.select(this.poolId().toBytes());
    return fromArrayBuffer(poolPointer.keyword("/totalSupply").get());
  }

  // Constant product
  static calculateOutput(inputAmount: u128, inputBalance: u128, outputBalance: u128): u128 {
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
    const outputAmount = Pool.calculateOutput(inputAmount, inputBalance, outputBalance);
    if (outputAmount.isZero()) return false;
    // @ts-ignore
    poolSheet.set(input.toBytes(), inputBalance + swap.amount);
    // @ts-ignore
    poolSheet.set(output.toBytes(), outputBalance - outputAmount);

    return true;
  }
}
