import { PlayerManager } from '../managers/playerManager';
import { refObject } from '@tabletop-playground/api';

refObject.onMovementStopped.add(obj => {
  const player = PlayerManager.getPlayerFromTags(obj.getTags());
  const snapPoint = obj.getSnappedToPoint();
  player?.triggerCrewMoved(obj, snapPoint);
});
