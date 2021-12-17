import {
  crypto,
  json,
  ByteArray,
  Bytes,
  store,
  ipfs,
  BigInt,
  BigDecimal,
  log,
  JSONValue,
  TypedMap,
} from "@graphprotocol/graph-ts";
import {
  BurningZombiesHonoraryERC721,
  Transfer,
} from "../generated/BurningZombiesHonoraryERC721/BurningZombiesHonoraryERC721";
import { getZeroAddress } from "./mapping";
import { HonoraryZombie } from "../generated/schema";

export function handleTransfer(event: Transfer): void {
  let contract = BurningZombiesHonoraryERC721.bind(event.address);
  let tokenId = event.params.tokenId;

  // mint
  if (event.params.from == getZeroAddress()) {
    let zombie = new HonoraryZombie(tokenId.toString());

    let tokenURI = contract.tokenURI(tokenId);
    let cid = tokenURI.split("ipfs://").join("");
    let result = ipfs.cat(cid);

    if (!result) {
      while (true) {
        result = ipfs.cat(cid);
        if (result) break;
      }
    }

    let data = json.fromBytes(result as Bytes).toObject();

    let name = data.get("name");
    let imageURI = data.get("image");

    if (!name || !imageURI) return;

    zombie.name = name.toString();
    zombie.imageURI = imageURI.toString();
    zombie.save();
    return;
  }

  // burn
  if (event.params.to == getZeroAddress()) {
    // TODO
  }
}
