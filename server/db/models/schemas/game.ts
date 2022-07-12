const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Types = Schema.Types;

import SettingsSchema from './gameCreateSettings'
import PlayerSchema from './player';
import StarSchema from './star';
import CarrierSchema from './carrier';
import ConversationSchema from './conversation';

const schema = new Schema({
    settings: SettingsSchema,
    galaxy: {
        players: [PlayerSchema],
		stars: [StarSchema],
		carriers: [CarrierSchema]
	},
	conversations: [ConversationSchema],
	state: {
		locked: { type: Types.Boolean, required: false, default: false },
		tick: { type: Types.Number, required: true, default: 0 },
		paused: { type: Types.Boolean, required: true, default: true },
		productionTick: { type: Types.Number, required: true, default: 0 },
		startDate: { type: Types.Date, required: false, default: null }, // Dates are in UTC
		endDate: { type: Types.Date, required: false, default: null },
		lastTickDate: { type: Types.Date, required: false, default: null },
		ticksToEnd: { type: Types.Number, required: false, default: null },
		stars: { type: Types.Number, required: true },
		starsForVictory: { type: Types.Number, required: true },
		players: { type: Types.Number, required: true, default: 0 },
		winner: { type: Types.ObjectId, required: false, default: null },
		cleaned: { type: Types.Boolean, required: false, default: false }, // Represents if the events and history have been deleted.
	},
	constants: {
		distances: {
			lightYear: { type: Types.Number, required: true, default: 50 },
			minDistanceBetweenStars: { type: Types.Number, required: true, default: 50 },
			maxDistanceBetweenStars: { type: Types.Number, required: true, default: 500 },
			warpSpeedMultiplier: { type: Types.Number, required: true, default: 3 },
			galaxyCenterLocation: {
				x: { type: Types.Number, required: false, default: 0 },
				y: { type: Types.Number, required: false, default: 0 }
			}
		},
		research: {
			progressMultiplier: { type: Types.Number, required: true, default: 50 },
			sciencePointMultiplier: { type: Types.Number, required: true, default: 1 },
			experimentationMultiplier: { type: Types.Number, required: true, default: 1 }
		},
		star: {
			resources: {
				minNaturalResources: { type: Types.Number, required: true, default: 10 },
				maxNaturalResources: { type: Types.Number, required: true, default: 50 }
			},
			infrastructureCostMultipliers: {
				warpGate: { type: Types.Number, required: true, default: 50 },
				economy: { type: Types.Number, required: true, default: 2.5 },
				industry: { type: Types.Number, required: true, default: 5 },
				science: { type: Types.Number, required: true, default: 20 },
				carrier: { type: Types.Number, required: true, default: 10 }
			},
			infrastructureExpenseMultipliers: {
				cheap: { type: Types.Number, required: true, default: 1 },
				standard: { type: Types.Number, required: true, default: 2 },
				expensive: { type: Types.Number, required: true, default: 4 },
				veryExpensive: { type: Types.Number, required: true, default: 8 },
				crazyExpensive: { type: Types.Number, required: true, default: 16 }
			},
			specialistsExpenseMultipliers: {
				standard: { type: Types.Number, required: true, default: 1 },
				expensive: { type: Types.Number, required: true, default: 2 },
				veryExpensive: { type: Types.Number, required: true, default: 4 },
				crazyExpensive: { type: Types.Number, required: true, default: 8 }
			},
			captureRewardMultiplier: { type: Types.Number, required: true, default: 10 },
			homeStarDefenderBonusMultiplier: { type: Types.Number, required: true, default: 1 }
		},
		diplomacy: {
			upkeepExpenseMultipliers: {
				none: { type: Types.Number, required: true, default: 0 },
				cheap: { type: Types.Number, required: true, default: 0.05 },
				standard: { type: Types.Number, required: true, default: 0.10 },
				expensive: { type: Types.Number, required: true, default: 0.15 },
        crazyExpensive: { type: Types.Number, required: true, default: 0.25 }
			}
		},
		player: {
			rankRewardMultiplier: { type: Types.Number, required: true, default: 1 },
			bankingCycleRewardMultiplier: { type: Types.Number, required: true, default: 75 }
		},
		specialists: {
			monthlyBanAmount: { type: Types.Number, required: true, default: 3 }
		}
	},
	quitters: [{ type: Types.ObjectId, required: false }],
	afkers: [{ type: Types.ObjectId, required: false }],
	spectators: [{ type: Types.ObjectId, required: false }]
});

export default schema;
