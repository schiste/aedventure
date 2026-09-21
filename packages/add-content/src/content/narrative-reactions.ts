// Authored content: reaction rules. codegen -> Rust `REACTIONS`.
//
// When this happens, and the actor has heard about it, that character does
// this, after this delay. The act they emit is a normal event, so it spreads,
// sifts and can trigger further reactions.
//
// Characters never act from free-running simulation. Every NPC act traces back
// through one of these rules to something that happened, which is what keeps
// the world deterministic and explainable.

export interface ReactionDef {
  readonly id: string
  readonly label: string
  /** The act that triggers it. */
  readonly whenAct: string
  /** Who reacts. They must know the triggering event first. */
  readonly actor: string
  /** Game days between hearing and acting. */
  readonly afterDays: number
  /** The act they perform. */
  readonly emitAct: string
  /** Whom they perform it on. */
  readonly emitTarget: string
  /** Game days before this rule may fire again at all. */
  readonly cooldownDays: number
}

export const REACTIONS: readonly ReactionDef[] = [
  {
    id: "reaction.vell_denounces_a_broken_promise",
    label: "Vell denounces a broken promise",
    whenAct: "act.break_a_promise",
    actor: "entity.vell",
    afterDays: 1,
    emitAct: "act.denounce",
    emitTarget: "entity.sleepless.sounding_five",
    cooldownDays: 30,
  },
]

export function reactionById(id: string): ReactionDef | undefined {
  return REACTIONS.find((reaction) => reaction.id === id)
}
