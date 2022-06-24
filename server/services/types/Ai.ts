import {DBObjectId} from "./DBObjectId";

export interface KnownAttack {
    arrivalTick: number;
    starId: DBObjectId;
    carriersOnTheWay: DBObjectId[];
}

export interface InvasionInProgress {
    arrivalTick: number;
    star: DBObjectId;
}

export interface AiState {
    knownAttacks: KnownAttack[];
    invasionsInProgress: InvasionInProgress[];
    startedClaims: DBObjectId[];
}