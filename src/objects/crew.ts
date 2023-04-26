import { GameObject, refObject } from '@tabletop-playground/api';
import { PlayerManager } from '../managers/playerManager';

const identifyCrewPosition = (obj: GameObject, disableMessages = false) => {
  const player = PlayerManager.getPlayerFromTags(obj.getTags());
  player?.triggerCrewMoved(obj, disableMessages);
};

refObject.onMovementStopped.add(identifyCrewPosition);
identifyCrewPosition(refObject, true);
