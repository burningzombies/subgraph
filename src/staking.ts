import { BigInt } from "@graphprotocol/graph-ts";
import {
  StakingRewards,
  OwnershipTransferred,
  Recovered,
  RewardAdded,
  RewardPaid,
  RewardsDurationUpdated,
  Staked,
  Withdrawn,
} from "../generated/StakingRewards/StakingRewards";
import { Stake, Zombie } from "../generated/schema";

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}
export function handleRecovered(event: Recovered): void {}
export function handleRewardAdded(event: RewardAdded): void {}
export function handleRewardPaid(event: RewardPaid): void {}
export function handleRewardsDurationUpdated(
  event: RewardsDurationUpdated
): void {}

export function handleStaked(event: Staked): void {
  let stake = Stake.load(event.params.user.toHexString());

  if (!stake) {
    stake = new Stake(event.params.user.toHexString());
  }

  let zombie = Zombie.load(event.params.tokenId.toString());
  if (!zombie) return;

  let stakedZombies = stake.tokens;
  stakedZombies.push(zombie.id);

  stake.tokens = stakedZombies;

  stake.save();
}

export function handleWithdrawn(event: Withdrawn): void {
  let stake = Stake.load(event.params.user.toHexString());
  if (!stake) return;

  let zombie = Zombie.load(event.params.tokenId.toString());
  if (!zombie) return;

  let stakedZombies = stake.tokens;

  let index = stakedZombies.indexOf(zombie.id);
  stakedZombies.splice(index, 1);
  stake.tokens = stakedZombies;

  stake.save();
}
