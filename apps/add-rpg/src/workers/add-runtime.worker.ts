/// <reference lib="webworker" />

import type { CatalogSnapshot, SimulationSnapshot, WorkerEvent, WorkerRequest } from "@aedventure/add-domain"
import { diffSnapshot } from "@aedventure/add-domain"
import init, { WebRuntime } from "../generated/wasm/add-web-bindings/runtime"

let runtime: WebRuntime | null = null
let runtimeReady: Promise<void> | null = null
// The last snapshot we sent the main thread, so we can post only the changed
// top-level sections (a delta) on subsequent updates.
let lastSnapshot: SimulationSnapshot | null = null

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  void handleMessage(event.data)
})

async function handleMessage(message: WorkerRequest) {
  try {
    await ensureRuntime()

    switch (message.type) {
      case 'init':
        runtime = new WebRuntime()
        postReady()
        break
      case 'reset':
        runtime = new WebRuntime()
        postFullSnapshot()
        break
      case 'tick':
        runtime?.tick(message.seconds)
        postSnapshotUpdate()
        break
      case 'chooseStoryOption':
        runtime?.chooseStoryOption(message.beatId, message.optionId)
        postSnapshotUpdate()
        break
      case 'assignHero':
        runtime?.assignHero(message.assigned)
        postSnapshotUpdate()
        break
      case 'setHeroRole':
        runtime?.setHeroRole(message.roleId)
        postSnapshotUpdate()
        break
      case 'setRoleCrew':
        runtime?.setRoleCrew(message.roleId, message.crew)
        postSnapshotUpdate()
        break
      case 'setStationEnabled':
        runtime?.setStationEnabled(message.stationId, message.enabled)
        postSnapshotUpdate()
        break
      case 'offlineCatchup':
        runtime?.runOfflineCatchup(message.elapsedSeconds)
        postSnapshotUpdate()
        break
      case 'startWorldAction':
        runtime?.startWorldAction(message.actionId)
        postSnapshotUpdate()
        break
      case 'startConstruction':
        runtime?.startConstruction(message.optionId)
        postSnapshotUpdate()
        break
      case 'startProcessing':
        runtime?.startProcessing(message.recipeId)
        postSnapshotUpdate()
        break
      case 'startResonanceRecipe':
        runtime?.startResonanceRecipe(message.recipeId)
        postSnapshotUpdate()
        break
      case 'setStationSpecialization':
        runtime?.setStationSpecialization(message.stationId, message.path)
        postSnapshotUpdate()
        break
      case 'startExpedition':
        runtime?.startExpedition(message.targetId, message.assignedCrew)
        postSnapshotUpdate()
        break
      case 'clearExpeditionReports':
        runtime?.clearExpeditionReports()
        postSnapshotUpdate()
        break
      case 'recruitFromSurvivorCave':
        runtime?.recruitFromSurvivorCave()
        postSnapshotUpdate()
        break
      case 'moveHeroTo':
        runtime?.moveHeroTo(message.q, message.r)
        postSnapshotUpdate()
        break
      case 'openDoor':
        runtime?.openDoor(message.key)
        postSnapshotUpdate()
        break
      case 'acquirePerk':
        runtime?.acquirePerk(message.perkId)
        postSnapshotUpdate()
        break
      case 'clearLocation':
        runtime?.clearLocation(message.key, message.lootItem, message.lootQty)
        postSnapshotUpdate()
        break
      case 'engage':
        runtime?.engage(message.creatureId, message.key, message.lootItem, message.lootQty)
        postSnapshotUpdate()
        break
      case 'dropItem':
        runtime?.dropItem(message.key, message.itemId, message.qty)
        postSnapshotUpdate()
        break
      case 'pickUpLocation':
        runtime?.pickUpLocation(message.key)
        postSnapshotUpdate()
        break
      case 'useItem':
        runtime?.useItem(message.itemId)
        postSnapshotUpdate()
        break
      case 'spendBassline':
        runtime?.spendBassline(message.amount)
        postSnapshotUpdate()
        break
      case 'setBalanceOverride':
        runtime?.setBalanceOverride(message.path, message.value)
        postSnapshotUpdate()
        break
      case 'resetBalanceOverrides':
        runtime?.resetBalanceOverrides()
        postSnapshotUpdate()
        break
      case 'exportSave':
        postWorkerEvent({
          type: 'save',
          payload: runtime?.exportSave() ?? '',
        })
        break
      case 'importSave':
        runtime?.importSave(message.payload)
        postFullSnapshot()
        break
    }
  } catch (error) {
    postWorkerEvent({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    })
  }
}

async function ensureRuntime() {
  if (!runtimeReady) {
    runtimeReady = init().then(() => {
      runtime = new WebRuntime()
    })
  }
  await runtimeReady
}

// Send the full snapshot and reset the delta baseline. Used for ready/reset/
// import where the whole state is replaced.
function postReady() {
  const next = snapshot()
  lastSnapshot = next
  postWorkerEvent({ type: 'ready', snapshot: next, catalog: catalog() })
}

function postFullSnapshot() {
  const next = snapshot()
  lastSnapshot = next
  postWorkerEvent({ type: 'snapshot', snapshot: next })
}

// Send only the top-level sections that changed since the last send. Falls back
// to a full snapshot if we have no baseline yet.
function postSnapshotUpdate() {
  const next = snapshot()
  if (lastSnapshot === null) {
    lastSnapshot = next
    postWorkerEvent({ type: 'snapshot', snapshot: next })
    return
  }
  const changed = diffSnapshot(lastSnapshot, next)
  lastSnapshot = next
  postWorkerEvent({ type: 'snapshotDelta', changed })
}

function snapshot(): SimulationSnapshot {
  return runtime?.snapshot() as SimulationSnapshot
}

function catalog(): CatalogSnapshot {
  return runtime?.catalog() as CatalogSnapshot
}

function postWorkerEvent(message: WorkerEvent) {
  postMessage(message)
}

export {}
