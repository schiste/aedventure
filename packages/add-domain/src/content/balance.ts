import type { BalanceSnapshot } from "../runtime/protocol"

// Bootstrapped from the catalog snapshot, then owned here as the source of truth.
// `content:build` codegens the Rust catalog from this module.
export const BALANCE: BalanceSnapshot = {
  "bubble": {
    "holdSeconds": 10,
    "degradeSecondsPerRing": 10,
    "fieldKBase": 0.36
  },
  "crystal": {
    "baseBasslineCap": 90,
    "baseChorusCap": 60,
    "baseHarmonicsCap": 40,
    "basslineCapPerStorageLevel": 60,
    "chorusCapPerStorageLevel": 45,
    "harmonicsCapPerStorageLevel": 30,
    "outputPerWorkerBase": 0.14,
    "outputPerWorkerLevelBonus": 0.08,
    "chorusPerWorkerBase": 0.12,
    "chorusPerWorkerLevelBonus": 0.06,
    "harmonicsPerWorkerBase": 0.085,
    "harmonicsPerWorkerLevelBonus": 0.045,
    "removingMossOutputMultiplier": 1.1,
    "removingMossPassiveBasslinePerSecond": 0.04,
    "fieldKBonusPerPolishLevel": 0.01,
    "firePitCrewSlots": 2
  },
  "power": {
    "lifeSupportFreeStaff": 2,
    "lifeSupportUpkeepPerStaffPerSecond": 0.028,
    "harmonicsContinuousBonusPerUnit": 0.2,
    "harmonicsContinuousBonusCap": 0.45,
    "harmonicsTierOneThreshold": 0.075,
    "harmonicsTierTwoThreshold": 0.22,
    "harmonicsTierThreeThreshold": 0.5,
    "harmonicsTierBonus": 0.1,
    "basslineGenerationBonusWeight": 0.5,
    "chorusGenerationBonusWeight": 0.7,
    "harmonicsGenerationBonusWeight": 0.35,
    "resonanceChamberFieldBonus": 0.22,
    "mixConsoleHarmonicsBonus": 0.15,
    "mixConsoleBrownoutTolerance": 0.15,
    "tierTwoBrownoutTolerance": 0.12,
    "tierThreeBrownoutTolerance": 0.18,
    "tierThreeUpkeepDiscount": 0.15,
    "brownoutBasslinePenaltyWeight": 0.25,
    "brownoutChorusPenaltyWeight": 0.2,
    "brownoutHarmonicsPenaltyWeight": 0.35,
    "brownoutFieldPenaltyWeight": 0.4,
    "resonanceProcessingFieldBonusPerLevel": 0.03,
    "mixProcessingHarmonicsBonusPerLevel": 0.03,
    "mixProcessingBrownoutTolerancePerLevel": 0.03,
    "researchChorusFreeStaffPerLevel": 1,
    "researchHarmonicsThresholdReductionPerLevel": 0.08
  },
  "progression": {
    "levelMultiplierA": 0.2,
    "xp0": 50,
    "xpGrowth": 1.28,
    "xpPerLocationClear": 8,
    "xpPerExpedition": 25,
    "xpPerStoryBeat": 12
  },
  "combat": {
    "baseAttack": 3,
    "attackPerLevel": 0.6,
    "baseHp": 24,
    "hpPerLevel": 4,
    "roundSeconds": 1.5,
    "damageVariance": 0.15,
    "woundUnitsPerHpLost": 0.12,
    "defeatExtraWoundUnits": 3
  },
  "survival": {
    "heroTimeSeconds0To1": 24,
    "normalHumanTimeSeconds0To1": 4,
    "recoveryTimeSeconds1To0": 240,
    "sustainBonusPerLevel": 0.05,
    "tierOneThresholdRatio": 0.5,
    "tierTwoThresholdRatio": 0.8,
    "tierThreeThresholdRatio": 0.95,
    "tierOneWorkEfficiencyMultiplier": 0.9,
    "tierTwoWorkEfficiencyMultiplier": 0.72,
    "tierThreeWorkEfficiencyMultiplier": 0.5,
    "tierOneMovementSpeedMultiplier": 0.92,
    "tierTwoMovementSpeedMultiplier": 0.75,
    "tierThreeMovementSpeedMultiplier": 0.55,
    "tierOneEncounterRateMultiplier": 1.1,
    "tierTwoEncounterRateMultiplier": 1.25,
    "tierThreeEncounterRateMultiplier": 1.5,
    "recoveryBrownoutPenaltyWeight": 1.1,
    "recoveryBrownoutStopThreshold": 0.9
  },
  "build": {
    "workshopToolingSpeedBonusPerLevel": 0.12
  },
  "scavenge": {
    "baseStockMax": 10000,
    "stockRatePerSecond": 100,
    "ambientRatePerSecond": 1
  },
  "firePit": {
    "baseVibesPerSecond": 0.06,
    "staffVibesPerSecond": 0.075
  },
  "water": {
    "waterCap": 5,
    "baseStockMax": 30,
    "collectionRatePerSecond": 2,
    "tileRegenPerSecond": 0.003,
    "workshopWaterCapPerLevel": 5,
    "workshopRegenBonusPerLevel": 0.0015
  },
  "vibes": {
    "negativeK": 144,
    "badVibesBeta": 236,
    "badVibesPow": 2,
    "doublingTimeSeconds": 180,
    "decayResetSeconds": 60
  },
  "recruitment": {
    "recruitTravelSeconds": 6,
    "instantRecruitDelaySeconds": 1,
    "goodVibesOptBase": 1,
    "goodVibesOptStep": 0.3,
    "t1Minutes": 0.4,
    "t30TotalGoodVibes": 1200,
    "t500TotalGoodVibes": 60000,
    "t1000TotalGoodVibes": 207510
  },
  "notesLimit": 8
}
