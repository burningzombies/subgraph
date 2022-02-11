import { Bytes, ByteArray, BigInt } from "@graphprotocol/graph-ts";
import {
  Market,
  ListingCancelled,
  ListingCreated,
  OwnershipTransferred,
  Paused,
  Sale,
  Unpaused,
} from "../generated/Market/Market";
import { Zombie, MarketStats } from "../generated/schema";

import { getZeroAddress, createTokenEvent } from "./mapping";

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}
export function handlePaused(event: Paused): void {}
export function handleUnpaused(event: Unpaused): void {}

export function handleListingCancelled(event: ListingCancelled): void {
  let tokenId = event.params.tokenId;
  let zombie = Zombie.load(tokenId.toString());

  let zero = Bytes.fromByteArray(getZeroAddress());

  if (zombie === null) return;

  zombie.sale = false;
  zombie.price = BigInt.fromI32(0);
  zombie.updatedAt = event.block.timestamp;

  zombie.save();

  createTokenEvent(
    tokenId,
    "Cancel Listing",
    BigInt.zero(),
    zero,
    zero,
    event.block.timestamp
  );
}

export function handleListingCreated(event: ListingCreated): void {
  let tokenId = event.params.tokenId;
  let marketPrice = event.params.price;
  let zombie = Zombie.load(tokenId.toString());
  if (zombie === null) return;

  zombie.sale = true;
  zombie.price = marketPrice;
  zombie.updatedAt = event.block.timestamp;

  zombie.save();

  let stats = MarketStats.load("0");
  if (stats === null) {
    stats = new MarketStats("0");
    stats.highestSale = BigInt.zero();
    stats.totalVolume = BigInt.zero();
    stats.save();
  }

  createTokenEvent(
    tokenId,
    "Listing",
    marketPrice,
    event.params.seller,
    event.params.buyer,
    event.block.timestamp
  );
}

export function handleSale(event: Sale): void {
  let tokenId = event.params.tokenId;
  let buyer = event.params.buyer;
  let price = event.params.price;
  let zombie = Zombie.load(tokenId.toString());
  if (zombie === null) return;

  zombie.sale = false;
  zombie.price = BigInt.fromI32(0);
  zombie.owner = buyer;
  zombie.updatedAt = event.block.timestamp;

  zombie.save();

  let stats = MarketStats.load("0");
  if (stats === null) return;
  let totalVolume = stats.totalVolume;
  let highestSale = stats.highestSale;
  let newVolume = totalVolume + price;
  stats.totalVolume = newVolume;

  if (price > highestSale) {
    stats.highestSale = price;
  }

  let contract = Market.bind(event.address);
  stats.reflectionBalance = contract.reflectionBalance();
  stats.save();

  createTokenEvent(
    tokenId,
    "Sold",
    event.params.price,
    event.params.seller,
    event.params.buyer,
    event.block.timestamp
  );
}
