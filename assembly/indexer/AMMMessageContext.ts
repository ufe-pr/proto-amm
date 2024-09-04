import { decodeHex } from "metashrew-as/assembly";
import { MessageContext } from "protorune/assembly/indexer/protomessage";
import { AMMField } from "./fields/AMMField";
import { Pool } from "./Pool";
import { POOLS } from "../tables";
import { RunestoneMessage } from "metashrew-runes/assembly/indexer/RunestoneMessage";
import { u128 } from "as-bignum/assembly/integer/u128";
import { console } from "metashrew-as/assembly/utils";

export class AMMMessageContext extends MessageContext {
  @inline
  protocolTag(): u128 {
    return u128.from(20000024);
  }

  handle(): boolean {
    console.log("AMMContext is handling message...");
    console.log("Basesheet: "+ this.baseSheet.inspect());
    console.log("Runtime sheet: " + this.runtimeBalance.inspect());
    // const keys = this.sheets.keys();
    // for (let i = 0; i < keys.length; i++) {
    //   console.log("Key: " + keys[i].toString());
    //   console.log("Value sheet: " + this.sheets.get(keys[i]).inspect());
    // }
    console.log("Runes (" + this.runes.length.toString() + " in total):");
    this.runes.forEach((rune) => {
      console.log(rune.runeId.inspect());
    });
    const decodedCalldata = String.UTF8.decode(this.calldata);
    // const action = RunestoneMessage.parse(this.calldata, 0);
    console.log("Calldata: " + decodedCalldata);
    if (decodedCalldata === "mint") {
      console.log("Minting liquidity...");
      // Ensure that inputs are valid
      if (this.runes.length !== 2) return false;
      for (let i = 0; i < this.runes.length; i++) {
        const incomingRune = this.runes[i];
        if (incomingRune.amount.isZero()) return false;
      }

      const one = new u128(
        this.runes[0].runeId.tx.as<u64>(),
        this.runes[0].runeId.block.as<u64>()
      );
      const two = new u128(
        this.runes[1].runeId.tx.as<u64>(),
        this.runes[1].runeId.block.as<u64>()
      );

      const toComeFirst = one <= two ? 0 : 1;
      const pool = new Pool(
        this.runes[toComeFirst].runeId,
        this.runes[toComeFirst === 0 ? 1 : 0].runeId
      );
      // TODO: Mint Liquidity tokens
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
