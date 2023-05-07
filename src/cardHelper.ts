import { Card, CardDetails, Rotator, Vector, world, Zone } from '@tabletop-playground/api';
import { ShipBehavior } from './behaviors/ship';
import { SnapPointManager, SnapPoints } from './managers/snapPointManager';

export class CardHelper {
  static getAllCardDetailsInZone(zone: Zone, tagFilter?: string, faceUpOnly = false) {
    const allCardDetails: Array<CardDetails> = [];

    for (const o of zone.getOverlappingObjects()) {
      if (o instanceof Card) {
        if (!faceUpOnly || o.isFaceUp()) {
          allCardDetails.push(...o.getAllCardDetails().filter(c => !tagFilter || c.tags.includes(tagFilter)));
        }
      }
    }
    return allCardDetails;
  }

  static shipsPlayedSnapPoints = [SnapPoints.NpcShip1, SnapPoints.NpcShip2, SnapPoints.NpcShip3, SnapPoints.NpcShip4];

  static getCardAtPoint(position: Vector) {
    const gameObjects = world.sphereOverlap(position, 1);
    if (gameObjects.length) {
      return gameObjects[0] as Card;
    }
    return undefined;
  }

  static getShipsPlayed() {
    const shipsPlayed: Array<Card> = [];
    for (const i in SnapPointManager.snapPoints) {
      if (CardHelper.shipsPlayedSnapPoints.includes(+i)) {
        const shipCard = CardHelper.getCardAtPoint(SnapPointManager.getPointVector(+i));
        if (shipCard) {
          shipsPlayed.push(shipCard);
        }
      }
    }
    return shipsPlayed;
  }

  static discardPlayedShips() {
    for (const s of CardHelper.getShipsPlayed()) {
      CardHelper.discardShip(s);
    }
  }

  static discardShip(card: Card) {
    const discardPoint = SnapPointManager.getPointVector(SnapPoints.ShipDiscard);
    const discardedCards = CardHelper.getCardAtPoint(discardPoint);
    card.toggleLock();
    if (discardedCards) {
      discardedCards.addCards(card, false, undefined, true);
    } else {
      card.setPosition(discardPoint.add([0, 0, 2]), 0.5);
      card.setRotation(new Rotator(180, 0, 0));
    }
  }

  static drawShips() {
    const discardPoint = SnapPointManager.getPointVector(SnapPoints.ShipDiscard);
    const drawPoint = SnapPointManager.getPointVector(SnapPoints.ShipDeck);
    const discardedCards = CardHelper.getCardAtPoint(discardPoint);
    const drawDeck = CardHelper.getCardAtPoint(drawPoint);

    const numCardsNeeded = Math.max(4, Math.min(1, world.getAllPlayers().length - 1));
    if (discardedCards && (!drawDeck || drawDeck.getStackSize() < numCardsNeeded)) {
      if (drawDeck) {
        discardedCards.addCards(drawDeck, false, undefined, true);
      }
      discardedCards.setPosition(drawPoint.add([0, 0, 5]), 1);
      discardedCards.setRotation(new Rotator(0, 180, 0));
      discardedCards.shuffle();
    }

    for (const i in SnapPointManager.snapPoints) {
      if (CardHelper.shipsPlayedSnapPoints.includes(+i)) {
        const card = drawDeck?.takeCards(1);
        card?.setPosition(SnapPointManager.getPointVector(+i), 0.5);
        card?.setRotation(new Rotator(180, 90, 0));
        setTimeout(() => card?.freeze(), 1000);
      }
    }
  }

  static discardAndRedrawShips() {
    CardHelper.discardPlayedShips();
    CardHelper.drawShips();
  }
}
