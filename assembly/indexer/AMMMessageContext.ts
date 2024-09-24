import { MessageContext } from "protorune/assembly/indexer/protomessage";
import { Pool } from "./Pool";
import { POOLS } from "../tables";
import { u128 } from "as-bignum/assembly/integer/u128";
import { console, encodeHexFromBuffer } from "metashrew-as/assembly/utils";
import { ProtoruneBalanceSheet } from "protorune/assembly/indexer/ProtoruneBalanceSheet";

function parseCallDataAndRemoveMagic(calldata: ArrayBuffer): string {
  let actionBuffer = calldata.slice(1, calldata.byteLength - 1);

  return String.UTF8.decode(actionBuffer);
}

export class AMMMessageContext extends MessageContext {
  @inline
  protocolTag(): u128 {
    return u128.from(20000024);
  }

  handle(): boolean {
    console.log("AMMContext is handling message...");
    console.log(
      "=====================================\n" +
        "Runes (" +
        this.runes.length.toString() +
        " in total):"
    );
    this.runes.map<u8>((rune, index) => {
      console.log((index + 1).toString() + ".\t" + rune.runeId.inspect());
      return 0;
    });
    console.log("=====================================");
    const decodedCalldata = parseCallDataAndRemoveMagic(this.calldata);
    console.log("Decoded calldata: " + decodedCalldata);
    // const action = RunestoneMessage.parse(this.calldata, 0);
    if (decodedCalldata === "mint") {
      console.log("Minting liquidity...");
      // Ensure that inputs are valid
      if (this.runes.length !== 2) return false;
      // Ensure that runes are not empty
      for (let i = 0; i < this.runes.length; i++) {
        const incomingRune = this.runes[i];
        if (incomingRune.amount.isZero()) {
          return false;
        }
      }
      // Ensure that runes are not the same
      if (
        this.runes[0].runeId.tx === this.runes[1].runeId.tx &&
        this.runes[0].runeId.block === this.runes[1].runeId.block
      ) {
        return false;
      }

      const one = new u128(this.runes[0].runeId.tx.toU64(), this.runes[0].runeId.block.toU64());
      const two = new u128(this.runes[1].runeId.tx.toU64(), this.runes[1].runeId.block.toU64());

      const toComeFirst = one <= two ? 0 : 1;
      const rune1 = this.runes[toComeFirst];
      const rune2 = this.runes[toComeFirst === 0 ? 1 : 0];
      const lpAmount = u128.sqrt(u128.mul(rune1.amount, rune2.amount));
      console.log("LP amount: " + lpAmount.toString());
      const pool = new Pool(rune1.runeId, rune2.runeId);
      if (!rune1.depositAll() || !rune2.depositAll()) return false;

      const poolIdBytes = pool.poolId().toBytes();
      // console.log("protoruneid");
      // console.log(encodeHexFromBuffer(poolIdBytes));
      // console.log("runeid");
      // console.log(encodeHexFromBuffer(new RuneId(127, u32(3231855362)).toBytes()));

      const checkingSheet = ProtoruneBalanceSheet.loadFromAtomicTx(
        this.table.OUTPOINT_TO_RUNES.select(this.refund_pointer.toArrayBuffer()),
        this.runtime
      );
      checkingSheet.set(poolIdBytes, lpAmount);

      const isSamePointer = this.refund_pointer.index == this.pointer.index;

      this.baseSheet.set(
        poolIdBytes,
        u128.mul(lpAmount, isSamePointer ? u128.from(2) : u128.from(1))
      );
      checkingSheet.saveToAtomicTx(
        this.table.OUTPOINT_TO_RUNES.select(this.refund_pointer.toArrayBuffer()),
        this.runtime
      );
      pool.save(POOLS, this.table);
      pool.increaseTotalSupply(POOLS, lpAmount);
    } else if (decodedCalldata === "burn") {
      console.log("Burning liquidity...");
      // Ensure that only the liquidity rune is sent
      if (this.runes.length !== 1) return false;
      const lpRune = this.runes[0];
      const runeId = lpRune.runeId;
      // Fetch pool from pool ID
      const pool = Pool.from(POOLS, lpRune.runeId);
      if (changetype<usize>(pool.rune1) === 0) return false;

      const checkingSheet = ProtoruneBalanceSheet.loadFromAtomicTx(
        this.table.OUTPOINT_TO_RUNES.select(this.refund_pointer.toArrayBuffer()),
        this.runtime
      );
      checkingSheet.decrease(runeId.toBytes(), lpRune.amount);
      this.baseSheet.decrease(runeId.toBytes(), lpRune.amount);

      const isSamePointer = this.refund_pointer.index == this.pointer.index;
      const balance1 = this.runtimeBalance.get(pool.rune1.toBytes());
      const balance2 = this.runtimeBalance.get(pool.rune2.toBytes());
      const ts = pool.totalSupply(POOLS);

      const rune1Amount = u128.muldiv(lpRune.amount, balance1, ts);
      const rune2Amount = u128.muldiv(lpRune.amount, balance2, ts);

      this.runtimeBalance.decrease(pool.rune1.toBytes(), rune1Amount);
      this.runtimeBalance.decrease(pool.rune2.toBytes(), rune2Amount);
      this.baseSheet.increase(
        pool.rune1.toBytes(),
        u128.mul(rune1Amount, isSamePointer ? u128.from(2) : u128.from(1))
      );
      checkingSheet.increase(
        pool.rune1.toBytes(),
        u128.mul(rune1Amount, isSamePointer ? u128.from(2) : u128.from(1))
      );
      checkingSheet.increase(
        pool.rune2.toBytes(),
        u128.mul(rune2Amount, isSamePointer ? u128.from(2) : u128.from(1))
      );
      this.baseSheet.increase(
        pool.rune2.toBytes(),
        u128.mul(rune2Amount, isSamePointer ? u128.from(2) : u128.from(1))
      );
      checkingSheet.saveToAtomicTx(
        this.table.OUTPOINT_TO_RUNES.select(this.refund_pointer.toArrayBuffer()),
        this.runtime
      );
      pool.decreaseTotalSupply(POOLS, lpRune.amount);
    } else if (decodedCalldata === "swap") {
      console.log("Swapping tokens...");
    } else {
      console.log("Invalid action...");
      return false;
    }

    return true;
  }
}
