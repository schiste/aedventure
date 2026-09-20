// Authored ADD narrative. One knot per ink-backed story beat, named after the
// beat id with dots replaced by underscores.
//
// Ink owns prose, choice presentation and scene flow. It owns no world state.
// Each choice branch assigns `chosen` the authored choice id whose effects the
// Rust catalog already holds; the runtime applies those effects and rejects a
// choice whose id does not belong to the beat. See docs/add-narrative-runtime.md.
//
// Knots are entered by name from Rust, never diverted to from here.

VAR chosen = ""
VAR ink_seed = 0

=== story_beat_first_glimpse ===
From the ridge, you finally see it: a broken complex wrapped in a thin blue halo. The Base is still standing for now. # speaker:narrator # mood:tense
* [Study the lights]
    ~ chosen = "story.choice.glimpse.watch_lights"
    The light pulses in time with the hum. Someone built this place to keep something worse outside. # speaker:narrator
    -> DONE
* [Scan the ruins]
    ~ chosen = "story.choice.glimpse.scan_ruins"
    The outer shell is wrecked, but the center still breathes. The Base might be dying, not dead. # speaker:narrator
    -> DONE
