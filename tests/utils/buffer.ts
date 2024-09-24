export const addHexPrefix = (s) => (s.substr(0, 2) === "0x" ? s : "0x" + s);

export const toHex = (v) => addHexPrefix(v.toString("hex"));
export const concat = (...args: any[]) => toHex(Buffer.concat(args));

export function createCalldata(action: string, data?: Buffer): Buffer {
  const magic = Buffer.alloc(1);
  magic[0] = 1;
  const result = Buffer.concat([magic, Buffer.from(action), magic, data || Buffer.alloc(0)]);
  return result;
}
