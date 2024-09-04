import { u128 } from "as-bignum/assembly/integer/u128";
import { RuneId } from "metashrew-runes/assembly/indexer/RuneId";

export class Swap {
  public amount: u128;
  public input: RuneId;
  public output: RuneId;

  constructor(amount: u128, input: RuneId, output: RuneId) {
    this.amount = amount;
    this.input = input;
    this.output = output;
  }
}
