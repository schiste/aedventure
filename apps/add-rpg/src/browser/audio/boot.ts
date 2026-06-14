// Audio entry: importing these self-attaches the Music Director (intent stack,
// crossfade engine, settings volume, time-of-day) and the GameEvent→music
// bridge. Activated by a module-script in index.html, independent of main.ts.
import "./music-director"
import "./music-event-bridge"
