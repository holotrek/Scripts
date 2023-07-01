import { Card, CardDetails, ObjectType, Rotator, Vector, world, Zone } from '@tabletop-playground/api';
import { SnapPointManager, SnapPoints } from './managers/snapPointManager';

export class CardHelper {
  static getAllCardsInZone(zone?: Zone, tagFilter?: string) {
    if (!zone) {
      return [];
    }

    return zone
      .getOverlappingObjects()
      .filter(o => o instanceof Card)
      .map(o => o as Card)
      .filter(c => !tagFilter || !!c.getAllCardDetails().find(cd => cd.tags.includes(tagFilter)));
  }

  static getAllCardDetailsInZone(zone?: Zone, tagFilter?: string, faceUpOnly = false) {
    if (!zone) {
      return [];
    }

    const allCardDetails: Array<CardDetails> = [];

    for (const card of CardHelper.getAllCardsInZone(zone)) {
      if (!faceUpOnly || card.isFaceUp()) {
        const stackDetails = card.getAllCardDetails().filter(c => !tagFilter || c.tags.includes(tagFilter));
        allCardDetails.push(...stackDetails);
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

  static shuffleDeckAtPoint(point: Vector) {
    const deck = CardHelper.getCardAtPoint(point);
    deck?.shuffle();
  }

  static discardCardsToPoint(point: Vector, cards: Card[], rotator = new Rotator(180, 0, 0)) {
    const discardedCards = CardHelper.getCardAtPoint(point);
    for (const c of cards) {
      if (c.getObjectType() === ObjectType.Ground) {
        c.toggleLock();
      }
      if (discardedCards) {
        discardedCards.addCards(c, false, undefined, true);
      } else {
        c.setPosition(point.add([0, 0, 2]), 0.5);
        c.setRotation(rotator);
      }
    }
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
    const discardPoint = SnapPointManager.getPointVector(SnapPoints.ShipDiscard);
    CardHelper.discardCardsToPoint(discardPoint, CardHelper.getShipsPlayed());
  }

  static discardShip(card: Card) {
    const discardPoint = SnapPointManager.getPointVector(SnapPoints.ShipDiscard);
    CardHelper.discardCardsToPoint(discardPoint, [card]);
  }

  static drawShips() {
    const discardPoint = SnapPointManager.getPointVector(SnapPoints.ShipDiscard);
    const drawPoint = SnapPointManager.getPointVector(SnapPoints.ShipDeck);
    const discardedCards = CardHelper.getCardAtPoint(discardPoint);
    const drawDeck = CardHelper.getCardAtPoint(drawPoint);

    const seatedPlayers = world.getAllPlayers().filter(x => x.getSlot() < 6).length;
    const numCardsNeeded = Math.min(4, Math.max(1, seatedPlayers - 1));
    if (discardedCards && (!drawDeck || drawDeck.getStackSize() < numCardsNeeded)) {
      if (drawDeck) {
        discardedCards.addCards(drawDeck, false, undefined, true);
      }
      discardedCards.setPosition(drawPoint.add([0, 0, 5]), 1);
      discardedCards.setRotation(new Rotator(0, 180, 0));
      discardedCards.shuffle();
    }

    let drawn = 0;
    for (const i in SnapPointManager.snapPoints) {
      if (drawn >= numCardsNeeded) {
        break;
      }

      if (CardHelper.shipsPlayedSnapPoints.includes(+i)) {
        const card = drawDeck?.takeCards(1);
        drawn++;
        card?.setPosition(SnapPointManager.getPointVector(+i), 0.5);
        card?.setRotation(new Rotator(180, 90, 0));
      }
    }
  }

  static discardAndRedrawShips() {
    CardHelper.discardPlayedShips();
    CardHelper.drawShips();
  }
}
