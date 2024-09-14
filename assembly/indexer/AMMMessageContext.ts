import { MessageContext } from "protorune/assembly/indexer/protomessage";
import { Pool } from "./Pool";
import { POOLS } from "../tables";
import { u128 } from "as-bignum/assembly/integer/u128";
import { console } from "metashrew-as/assembly/utils";
import { ProtoruneBalanceSheet } from "protorune/assembly/indexer/ProtoruneBalanceSheet";

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
    const decodedCalldata = String.UTF8.decode(this.calldata);
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
      console.log("Creating pool ID...");

      const one = new u128(this.runes[0].runeId.tx.toU64(), this.runes[0].runeId.block.toU64());
      const two = new u128(this.runes[1].runeId.tx.toU64(), this.runes[1].runeId.block.toU64());

      const toComeFirst = one <= two ? 0 : 1;
      const pool = new Pool(
        this.runes[toComeFirst].runeId,
        this.runes[toComeFirst === 0 ? 1 : 0].runeId
      );
      if (!this.runes[0].depositAll() || !this.runes[1].depositAll()) return false;

      // TODO: Mint Liquidity tokens
      const index = this.refund_pointer.index;
      // console.log("Index: " + index.toString());
      const poolIdBytes = pool.poolId().toBytes();
      // const poolIdBytes = this.runes[0].runeId.toBytes();
      // this.sheets.get(index).increase(poolIdBytes, u128.from(1));

      const checkingSheet = ProtoruneBalanceSheet.loadFromAtomicTx(
        this.table.OUTPOINT_TO_RUNES.select(this.refund_pointer.toArrayBuffer()),
        this.runtime
      );
      // console.log(checkingSheet.inspect());
      // console.log(
      //   ProtoruneBalanceSheet.loadFromAtomicTx(
      //     this.table.OUTPOINT_TO_RUNES.select(this.refund_pointer.toArrayBuffer()),
      //     this.runtime
      //   ).inspect()
      // );
      checkingSheet.set(poolIdBytes, u128.from(1000));
      // console.log(checkingSheet.inspect());
      this.baseSheet.set(poolIdBytes, u128.from(1000));
      // checkingSheet.save(this.table.OUTPOINT_TO_RUNES.select(this.refund_pointer.toArrayBuffer()));
      checkingSheet.saveToAtomicTx(
        this.table.OUTPOINT_TO_RUNES.select(this.refund_pointer.toArrayBuffer()),
        this.runtime
      );
      // console.log("refund (indexed - " + this.refund_pointer.index.toString() + ")");
      // console.log(
      //   ProtoruneBalanceSheet.loadFromAtomicTx(
      //     this.table.OUTPOINT_TO_RUNES.select(this.refund_pointer.toArrayBuffer()),
      //     this.runtime
      //   ).inspect()
      // );
      // console.log("pointer (indexed - " + this.pointer.index.toString() + ")");
      // console.log(
      //   ProtoruneBalanceSheet.loadFromAtomicTx(
      //     this.table.OUTPOINT_TO_RUNES.select(this.pointer.toArrayBuffer()),
      //     this.runtime
      //   ).inspect()
      // );
    } else if (decodedCalldata === "burn") {
      console.log("Burning liquidity...");
      // Ensure that only the liquidity rune is sent
      if (this.runes.length !== 1) return false;
      const runeId = this.runes[0];
      // Fetch pool from pool ID
      const pool = Pool.from(POOLS, runeId.runeId);
      if (changetype<usize>(pool.poolId()) === 0) return false;

      // TODO: Burn Liquidity tokens
    } else if (decodedCalldata === "swap") {
      console.log("Swapping tokens...");
    } else {
      console.log("Invalid action...");
      return false;
    }

    return true;
  }
}
