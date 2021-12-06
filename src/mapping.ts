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
  BurningZombiesERC721,
  Approval,
  ApprovalForAll,
  OwnershipTransferred,
  BurnedReflectionDivided,
  Transfer,
} from "../generated/BurningZombiesERC721/BurningZombiesERC721";

import {
  Zombie,
  Trait,
  TokenHistory,
  MarketStats,
  Collection,
  MarketStats,
} from "../generated/schema";

export const getBaseURI = (): string => {
  return "ipfs://QmXZDD4tFBsPX6512G62B53P6Ek41Jvd7GWEQT8GqXnfFS/";
};

export const getZeroAddress = (): ByteArray => {
  return ByteArray.fromHexString("0x0000000000000000000000000000000000000000");
};

export const createTokenEvent = (
  tokenId: BigInt,
  eventType: string,
  price: BigInt,
  from: Bytes,
  to: Bytes,
  date: BigInt
): void => {
  let tokenHistory = new TokenHistory(
    crypto
      .keccak256(
        ByteArray.fromUTF8(
          tokenId.toString() +
            eventType +
            price.toString() +
            from.toString() +
            to.toString() +
            date.toString()
        )
      )
      .toHexString()
  );
  tokenHistory.tokenId = tokenId;
  tokenHistory.eventType = eventType;
  tokenHistory.price = price;
  tokenHistory.from = from;
  tokenHistory.to = to;
  tokenHistory.date = date;
  tokenHistory.save();

  let zombieHistory: Array<string>;
  let zombie = Zombie.load(tokenId.toString());
  if (!zombie) return;
  zombieHistory = zombie.history;
  zombieHistory.push(tokenHistory.id);
  zombie.history = zombieHistory;
  zombie.save();
  log.info("Token event created.", []);
};

const updateCollectionInfo = (contract: BurningZombiesERC721): void => {
  let collection = Collection.load("0");
  if (!collection) {
    collection = new Collection("0");
  }
  collection.totalSupply = contract.totalSupply();
  collection.save();
  return;
};

const findOrNewTrait = (type: string, value: string): Trait => {
  let trait = Trait.load(type + " - " + value);
  if (trait == null) {
    trait = new Trait(type + " - " + value);
    trait.type = type;
    trait.value = value;
    trait.amount = BigInt.zero();
    trait.save();
  }
  return trait;
};

const refreshScores = (contract: BurningZombiesERC721): void => {
  let totalSupply = contract.totalSupply();

  for (let i = 0; totalSupply.toI32() > i; ++i) {
    let totalScore = 0.0;

    let zombie = Zombie.load(i.toString());
    if (!zombie) break;

    let zombieTraits = zombie.attributes.length;
    for (let x = 0; zombieTraits > x; ++x) {
      let trait = Trait.load(zombie.attributes[x]);
      log.info(`trait id: ${zombie.attributes[x]}`, []);
      if (!trait) break;

      let score =
        1 /
        (parseInt(trait.amount.toString()) / parseInt(totalSupply.toString()));
      totalScore = totalScore + score;
    }

    zombie.score = BigDecimal.fromString(totalScore.toString());
    zombie.save();
  }
};

const getIPFSData = (tokenId: BigInt): TypedMap<string, JSONValue> => {
  let tokenURI = getBaseURI() + tokenId.toString();
  let hash = tokenURI.split("ipfs://").join("");
  let result = ipfs.cat(hash);

  if (!result) {
    while (true) {
      result = ipfs.cat(hash);
      if (result) break;
    }
  }

  log.info("Data fetched from ipfs node.", []);
  return json.fromBytes(result as Bytes).toObject();
};

export function handleApproval(event: Approval): void {}
export function handleBurnedReflectionDivided(
  event: BurnedReflectionDivided
): void {}
export function handleApprovalForAll(event: ApprovalForAll): void {}
export function handleOwnershipTransferred(event: OwnershipTransferred): void {}

export function handleTransfer(event: Transfer): void {
  let contract = BurningZombiesERC721.bind(event.address);
  let tokenId = event.params.tokenId;
  let from = event.params.from;
  let to = event.params.to;
  let now = event.block.timestamp;

  let zombie = Zombie.load(tokenId.toString());
  if (zombie === null) {
    let data = getIPFSData(tokenId);
    let name = data.get("name");
    let description = data.get("description");
    let image = data.get("image");
    let _attributes = data.get("attributes");

    if (!name || !description || !image || !_attributes) return;

    let attributes = _attributes.toArray();
    let traits: Array<string> = [];

    for (let i = 0; attributes.length > i; ++i) {
      let traitType = attributes[i].toObject().get("trait_type")!.toString();
      let traitValue = attributes[i].toObject().get("value")!.toString();

      let trait = findOrNewTrait(traitType, traitValue);
      let oldAmount = trait.amount;
      trait.amount = oldAmount.plus(BigInt.fromI32(1));
      trait.save();
      traits.push(trait.id);
    }

    let gender = attributes[0].toObject().get("value")!.toString();
    let background = attributes[1].toObject().get("value")!.toString();
    let skin = attributes[2].toObject().get("value")!.toString();
    let mouth = attributes[3].toObject().get("value")!.toString();
    let eyes = attributes[5].toObject().get("value")!.toString();

    zombie = new Zombie(tokenId.toString());
    zombie.owner = event.params.to;
    zombie.minter = event.params.to;
    zombie.tokenURI = getBaseURI() + tokenId.toString();
    zombie.mintedAt = event.block.timestamp;
    zombie.updatedAt = event.block.timestamp;
    zombie.attributes = traits;
    zombie.imageURI = image.toString();
    zombie.name = name.toString();
    zombie.desc = description.toString();
    zombie.sale = false;
    zombie.price = BigInt.zero();

    // main zombie attributes
    zombie.gender = gender;
    zombie.background = background;
    zombie.skin = skin;
    zombie.mouth = mouth;
    zombie.eyes = eyes;

    zombie.save();

    createTokenEvent(tokenId, "Minting", BigInt.zero(), from, to, now);
    updateCollectionInfo(contract);

    let stats = MarketStats.load("0");
    if (stats === null) {
      stats = new MarketStats("0");
      stats.highestSale = BigInt.zero();
      stats.totalVolume = BigInt.zero();
      stats.save();
    }

    if (contract.isSaleActive()) refreshScores(contract);
    log.info("New mint.", []);
    return;
  }

  if (event.params.to == getZeroAddress()) {
    let data = getIPFSData(tokenId);
    let _attributes = data.get("attributes");

    if (!_attributes) return;

    let attributes = _attributes.toArray();
    for (let i = 0; attributes.length > i; ++i) {
      let traitType = attributes[i].toObject().get("trait_type")!.toString();
      let traitValue = attributes[i].toObject().get("value")!.toString();

      let trait = findOrNewTrait(traitType, traitValue);
      let oldAmount = trait.amount;
      trait.amount = oldAmount.minus(BigInt.fromI32(1));
      trait.save();
    }

    store.remove("Zombie", tokenId.toString());

    createTokenEvent(tokenId, "Burning", BigInt.zero(), from, to, now);
    updateCollectionInfo(contract);
    refreshScores(contract);
    log.info("Token burned.", []);
    return;
  }

  zombie.sale = false;
  zombie.price = BigInt.zero();
  zombie.owner = to;
  zombie.updatedAt = now;
  zombie.save();
  updateCollectionInfo(contract);
  createTokenEvent(tokenId, "Transfer", BigInt.zero(), from, to, now);
  log.info("Token transferred.", []);
  return;
}
