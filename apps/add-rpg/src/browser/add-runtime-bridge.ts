import type {
  AddGameEvent,
  CatalogSnapshot,
  SimulationSnapshot,
  TraceEntry,
  WorkerRequest,
} from "@aedventure/add-runtime-client"
import { SimulationClient } from "@aedventure/add-runtime-client"

export interface AddRuntimeBridgeCallbacks {
  readonly onReady: (snapshot: SimulationSnapshot, catalog: CatalogSnapshot) => void
  readonly onSnapshot: (snapshot: SimulationSnapshot) => void
  readonly onSave: (payload: string) => void
  readonly onError: (message: string) => void
  readonly onEvents?: (events: AddGameEvent[]) => void
  readonly onTrace?: (entry: TraceEntry) => void
}

/**
 * Owns the browser/runtime boundary without owning gameplay rules.
 *
 * `SimulationClient` already serializes worker requests. This seam adds the
 * app-level contract that the UI needs: one intentional command at a time,
 * snapshot/save waiters, and a single typed dispatch point for interaction
 * commands. Keeping it here prevents Solid components from learning worker
 * protocol details or inventing a second authority.
 */
export class AddRuntimeBridge {
  private readonly client: SimulationClient

  private snapshotVersion = 0
  private snapshotWaiters: Array<{ afterVersion: number; resolve: () => void }> = []
  private requestInFlight = false
  private saveVersion = 0
  private saveWaiters: Array<{ afterVersion: number; resolve: (payload: string | null) => void }> = []
  private saveRequestInFlight = false
  private lastSavePayload: string | null = null
  private lastError = false

  constructor(callbacks: AddRuntimeBridgeCallbacks) {
    this.client = new SimulationClient({
      createWorker: () =>
        new Worker(new URL("../workers/add-runtime.worker.ts", import.meta.url), {
          type: "module",
        }),
      onTrace: callbacks.onTrace,
      onReady: (snapshot, catalog) => {
        this.snapshotVersion += 1
        this.lastError = false
        callbacks.onReady(snapshot, catalog)
        this.resolveSnapshotWaiters()
      },
      onSnapshot: (snapshot) => {
        this.snapshotVersion += 1
        this.lastError = false
        callbacks.onSnapshot(snapshot)
        this.resolveSnapshotWaiters()
      },
      onSave: (payload) => {
        this.saveVersion += 1
        this.lastSavePayload = payload
        this.saveRequestInFlight = false
        callbacks.onSave(payload)
        this.resolveSaveWaiters(payload)
      },
      onError: (message) => {
        this.lastError = true
        this.saveRequestInFlight = false
        callbacks.onError(message)
        this.resolveSnapshotWaiters()
        this.resolveSaveWaiters(null)
      },
      onEvents: callbacks.onEvents,
    })
  }

  get currentSnapshotVersion(): number {
    return this.snapshotVersion
  }

  get latestSavePayload(): string | null {
    return this.lastSavePayload
  }

  get commandInFlight(): boolean {
    return this.requestInFlight
  }

  /** Dispatch a worker request through the one authoritative client. */
  dispatch(request: WorkerRequest): boolean {
    switch (request.type) {
      case "init":
        this.client.init()
        return true
      case "tick":
        this.client.tick(request.seconds)
        return true
      case "offlineCatchup":
        this.client.runOfflineCatchup(request.elapsedSeconds)
        return true
      case "reset":
        this.client.reset()
        return true
      case "importSave":
        this.client.importSave(request.payload)
        return true
      case "exportSave":
        this.client.exportSave()
        return true
      case "assignHero":
        this.client.assignHero(request.assigned)
        return true
      case "setHeroRole":
        this.client.setHeroRole(request.roleId)
        return true
      case "setRoleCrew":
        this.client.setRoleCrew(request.roleId, request.crew)
        return true
      case "setStationEnabled":
        this.client.setStationEnabled(request.stationId, request.enabled)
        return true
      case "startWorldAction":
        this.client.startWorldAction(request.actionId)
        return true
      case "startConstruction":
        this.client.startConstruction(request.optionId)
        return true
      case "startProcessing":
        this.client.startProcessing(request.recipeId)
        return true
      case "startResonanceRecipe":
        this.client.startResonanceRecipe(request.recipeId)
        return true
      case "setStationSpecialization":
        this.client.setStationSpecialization(request.stationId, request.path)
        return true
      case "startExpedition":
        this.client.startExpedition(request.targetId, request.assignedCrew)
        return true
      case "clearExpeditionReports":
        this.client.clearExpeditionReports()
        return true
      case "recruitFromSurvivorCave":
        this.client.recruitFromSurvivorCave()
        return true
      case "moveHeroTo":
        this.client.moveHeroTo(request.q, request.r)
        return true
      case "openDoor":
        this.client.openDoor(request.key)
        return true
      case "acquirePerk":
        this.client.acquirePerk(request.perkId)
        return true
      case "clearLocation":
        this.client.clearLocation(request.key, request.lootItem, request.lootQty)
        return true
      case "engage":
        this.client.engage(request.creatureId, request.key, request.lootItem, request.lootQty)
        return true
      case "dropItem":
        this.client.dropItem(request.key, request.itemId, request.qty)
        return true
      case "pickUpLocation":
        this.client.pickUpLocation(request.key)
        return true
      case "useItem":
        this.client.useItem(request.itemId)
        return true
      case "spendBassline":
        this.client.spendBassline(request.amount)
        return true
      case "chooseStoryOption":
        this.client.chooseStoryOption(request.beatId, request.optionId)
        return true
      case "completePreArrivalRoute":
        this.client.completePreArrivalRoute()
        return true
      case "startCinematic":
        this.client.startCinematic(request.cinematicId)
        return true
      case "advanceCinematic":
        this.client.advanceCinematic()
        return true
      case "skipCinematic":
        this.client.skipCinematic()
        return true
      case "setBalanceOverride":
        this.client.setBalanceOverride(request.path, request.value)
        return true
      case "resetBalanceOverrides":
        this.client.resetBalanceOverrides()
        return true
      default:
        return false
    }
  }

  async sendAndWaitForSnapshot(send: () => void): Promise<void> {
    while (this.requestInFlight) {
      await this.waitForSnapshotAfter(this.snapshotVersion)
    }
    this.requestInFlight = true
    const waiter = this.waitForSnapshotAfter(this.snapshotVersion)
    try {
      send()
      await waiter
    } finally {
      this.requestInFlight = false
    }
  }

  async requestSave(): Promise<string | null> {
    if (this.saveRequestInFlight) return this.lastSavePayload
    this.saveRequestInFlight = true
    const afterVersion = this.saveVersion
    const waiter = this.waitForSaveAfter(afterVersion)
    this.client.exportSave()
    const payload = await waiter
    if (this.saveVersion <= afterVersion) this.saveRequestInFlight = false
    return payload
  }

  async waitForSnapshotAfter(afterVersion: number): Promise<void> {
    if (this.snapshotVersion > afterVersion || this.lastError) return
    await new Promise<void>((resolve) => {
      this.snapshotWaiters.push({ afterVersion, resolve })
      window.setTimeout(resolve, 4000)
    })
  }

  dispose(): void {
    this.client.dispose()
    this.snapshotWaiters.forEach(({ resolve }) => resolve())
    this.saveWaiters.forEach(({ resolve }) => resolve(this.lastSavePayload))
    this.snapshotWaiters = []
    this.saveWaiters = []
  }

  private resolveSnapshotWaiters(): void {
    const pending: typeof this.snapshotWaiters = []
    this.snapshotWaiters.forEach((waiter) => {
      if (this.snapshotVersion > waiter.afterVersion || this.lastError) {
        waiter.resolve()
      } else {
        pending.push(waiter)
      }
    })
    this.snapshotWaiters = pending
  }

  private async waitForSaveAfter(afterVersion: number): Promise<string | null> {
    if (this.saveVersion > afterVersion || this.lastError) return this.lastSavePayload
    return new Promise<string | null>((resolve) => {
      this.saveWaiters.push({ afterVersion, resolve })
      window.setTimeout(() => resolve(this.lastSavePayload), 4000)
    })
  }

  private resolveSaveWaiters(payload: string | null): void {
    const pending: typeof this.saveWaiters = []
    this.saveWaiters.forEach((waiter) => {
      if (this.saveVersion > waiter.afterVersion || this.lastError) {
        waiter.resolve(payload)
      } else {
        pending.push(waiter)
      }
    })
    this.saveWaiters = pending
  }
}
