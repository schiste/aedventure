// Authored ADD narrative. One knot per ink-backed story beat, named after the
// beat id with dots replaced by underscores.
//
// Ink owns prose, choice presentation and scene flow. It owns no world state.
// Each choice branch assigns `chosen` the authored choice id whose effects the
// Rust catalog already holds; the runtime applies those effects and rejects a
// choice whose id does not belong to the beat. See docs/add-narrative-runtime.md.
//
// Knots are entered by name from Rust, never diverted to from here.

// Rust answers this from the sifted log: did the player actually build that
// arc? Dialogue may ask; it may never compute.
EXTERNAL arc(pattern_id)

VAR chosen = ""
VAR ink_seed = 0

=== story_beat_first_glimpse ===
From the ridge, you finally see it: a broken complex wrapped in a thin blue halo. The Base is still standing for now. # speaker:narrator # mood:tense
{ arc("arc.broken_oath"): You told them you would not do this. Someone down there remembers. # speaker:narrator # mood:tense }
* [Study the lights]
    ~ chosen = "story.choice.glimpse.watch_lights"
    The light pulses in time with the hum. Someone built this place to keep something worse outside. # speaker:narrator
    -> DONE
* [Scan the ruins]
    ~ chosen = "story.choice.glimpse.scan_ruins"
    The outer shell is wrecked, but the center still breathes. The Base might be dying, not dead. # speaker:narrator
    -> DONE

// --- Storylets -------------------------------------------------------------
//
// Knots written for ROLES, not named characters. Rust casts them and enters
// them by name with the chosen entities as arguments, so one knot covers every
// pair that fits. Role constraints live in narrative-storylets.ts, never in
// ink conditionals, so tools can analyse what is castable.

=== sl_two_survivors_talk(x, y) ===
{x} and {y} are talking when you come in. They stop. # speaker:narrator # mood:quiet
-> DONE

=== sl_wronged_and_witness(x, y) ===
{x} does not look up. {y} watches you both, and says nothing. # speaker:narrator # mood:tense
-> DONE

// The guarantee that a hub never stalls.
=== sl_quiet_hour ===
For once, nobody needs anything. # speaker:narrator # mood:quiet
-> DONE
