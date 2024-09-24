import { _flush, input } from "metashrew-as/assembly/indexer/index";
import { Block } from "metashrew-as/assembly/blockdata/block";
import { parsePrimitive } from "metashrew-as/assembly/utils/utils";
import { SpendablesIndex } from "metashrew-spendables/assembly/indexer";
export * from "protorune/assembly/view";
import { Box } from "metashrew-as/assembly/utils/box";
import { AMMIndex } from "./indexer/AMMIndex";
import { console } from "metashrew-as/assembly/utils";

export function _start(): void {
  const data = Box.from(input());
  const height = parsePrimitive<u32>(data);
  const block = new Block(data);
  console.log("Indexer started...");
  new SpendablesIndex().indexBlock(height, block);
  new AMMIndex().indexBlock(height, block);
  _flush();
}
