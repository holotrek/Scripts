import { Upgrade } from '../upgrade';

export interface IUpgradeable {
  getUpgrades(): Array<Upgrade>;
  addUpgrade(upgrade: Upgrade): boolean;
  removeUpgrade(upgrade: Upgrade): boolean;
}
