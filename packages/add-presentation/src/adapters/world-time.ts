import type { SimulationSnapshot } from "@aedventure/add-protocol"

export type AddSeasonId = "spring" | "summer" | "autumn" | "winter"
export type AddDaylightPhase = "night" | "dawn" | "day" | "dusk"

export interface AddWorldTimeSummary {
  readonly day: number
  readonly dayOfYear: number
  readonly referenceDate: string
  readonly referenceYear: number
  readonly localTime: string
  readonly localMinute: number
  readonly season: AddSeasonId
  readonly seasonLabel: string
  readonly daylightPhase: AddDaylightPhase
  readonly daylightRatio: number
  readonly nightRatio: number
  readonly sunrise: string
  readonly sunset: string
  readonly sunriseMinute: number
  readonly sunsetMinute: number
  readonly source: "estimated_solar_model"
  readonly location: {
    readonly label: string
    readonly latitude: number
    readonly longitude: number
  }
}

const REFERENCE_YEAR = 2025
const REFERENCE_START_MONTH_INDEX = 2
const REFERENCE_START_DAY = 20
const WORLD_START_LOCAL_MINUTE = 6 * 60 + 30
export const ADD_GAME_MINUTES_PER_RUNTIME_SECOND = 1
export const ADD_TRAVEL_GAME_MINUTES_PER_TILE = 60
export const ADD_TRAVEL_RUNTIME_SECONDS_PER_TILE =
  ADD_TRAVEL_GAME_MINUTES_PER_TILE / ADD_GAME_MINUTES_PER_RUNTIME_SECOND
const MINUTES_PER_DAY = 24 * 60
const TWILIGHT_MINUTES = 45
const SOLAR_ZENITH_DEGREES = 90.833
const STUDIO_LOCATION = {
  label: "Studio Echo, Touraine estimate",
  latitude: 47.39,
  longitude: 0.69,
} as const

export function selectAddWorldTime(snapshot: SimulationSnapshot): AddWorldTimeSummary {
  return selectAddWorldTimeForClockSeconds(snapshot.clockSeconds)
}

export function selectAddWorldTimeForClockSeconds(clockSeconds: number): AddWorldTimeSummary {
  const elapsedMinutes = Math.max(0, clockSeconds) * ADD_GAME_MINUTES_PER_RUNTIME_SECOND
  const absoluteMinutes = WORLD_START_LOCAL_MINUTE + elapsedMinutes
  const dayIndex = Math.floor(absoluteMinutes / MINUTES_PER_DAY)
  const localMinute = positiveModulo(Math.floor(absoluteMinutes), MINUTES_PER_DAY)
  const referenceDate = addUtcDays(
    Date.UTC(REFERENCE_YEAR, REFERENCE_START_MONTH_INDEX, REFERENCE_START_DAY),
    dayIndex % daysInYear(REFERENCE_YEAR),
  )
  const dayOfYear = utcDayOfYear(referenceDate)
  const sunriseMinute = estimateSolarEventMinute(referenceDate, "sunrise")
  const sunsetMinute = estimateSolarEventMinute(referenceDate, "sunset")
  const daylightRatio = daylightForMinute(localMinute, sunriseMinute, sunsetMinute)

  return {
    day: dayIndex + 1,
    dayOfYear,
    referenceDate: isoDate(referenceDate),
    referenceYear: REFERENCE_YEAR,
    localTime: formatMinuteOfDay(localMinute),
    localMinute,
    season: seasonForDate(referenceDate),
    seasonLabel: seasonLabel(seasonForDate(referenceDate)),
    daylightPhase: daylightPhaseForMinute(localMinute, sunriseMinute, sunsetMinute),
    daylightRatio,
    nightRatio: round(1 - daylightRatio),
    sunrise: formatMinuteOfDay(sunriseMinute),
    sunset: formatMinuteOfDay(sunsetMinute),
    sunriseMinute,
    sunsetMinute,
    source: "estimated_solar_model",
    location: STUDIO_LOCATION,
  }
}

function estimateSolarEventMinute(date: Date, event: "sunrise" | "sunset"): number {
  const day = utcDayOfYear(date)
  const longitudeHour = STUDIO_LOCATION.longitude / 15
  const approximateTime =
    day + ((event === "sunrise" ? 6 : 18) - longitudeHour) / 24
  const meanAnomaly = 0.9856 * approximateTime - 3.289
  const trueLongitude = normalizeDegrees(
    meanAnomaly +
      1.916 * sinDeg(meanAnomaly) +
      0.02 * sinDeg(2 * meanAnomaly) +
      282.634,
  )
  let rightAscension = normalizeDegrees(atanDeg(0.91764 * tanDeg(trueLongitude)))
  const longitudeQuadrant = Math.floor(trueLongitude / 90) * 90
  const ascensionQuadrant = Math.floor(rightAscension / 90) * 90
  rightAscension = (rightAscension + longitudeQuadrant - ascensionQuadrant) / 15

  const sinDeclination = 0.39782 * sinDeg(trueLongitude)
  const cosDeclination = Math.cos(Math.asin(sinDeclination))
  const cosHourAngle =
    (cosDeg(SOLAR_ZENITH_DEGREES) -
      sinDeclination * sinDeg(STUDIO_LOCATION.latitude)) /
    (cosDeclination * cosDeg(STUDIO_LOCATION.latitude))

  if (cosHourAngle > 1) return event === "sunrise" ? 8 * 60 : 16 * 60
  if (cosHourAngle < -1) return event === "sunrise" ? 4 * 60 : 22 * 60

  const hourAngle =
    event === "sunrise"
      ? (360 - acosDeg(cosHourAngle)) / 15
      : acosDeg(cosHourAngle) / 15
  const localMeanTime =
    hourAngle + rightAscension - 0.06571 * approximateTime - 6.622
  const utcHour = positiveModulo(localMeanTime - longitudeHour, 24)
  const localHour = positiveModulo(utcHour + parisUtcOffsetHours(date), 24)
  return positiveModulo(Math.round(localHour * 60), MINUTES_PER_DAY)
}

function daylightForMinute(minute: number, sunrise: number, sunset: number): number {
  const dawnStart = sunrise - TWILIGHT_MINUTES
  const duskEnd = sunset + TWILIGHT_MINUTES
  if (minute >= dawnStart && minute < sunrise) {
    return round((minute - dawnStart) / TWILIGHT_MINUTES)
  }
  if (minute >= sunrise && minute <= sunset) {
    return 1
  }
  if (minute > sunset && minute <= duskEnd) {
    return round((duskEnd - minute) / TWILIGHT_MINUTES)
  }
  return 0
}

function daylightPhaseForMinute(
  minute: number,
  sunrise: number,
  sunset: number,
): AddDaylightPhase {
  if (minute >= sunrise - TWILIGHT_MINUTES && minute < sunrise) return "dawn"
  if (minute >= sunrise && minute <= sunset) return "day"
  if (minute > sunset && minute <= sunset + TWILIGHT_MINUTES) return "dusk"
  return "night"
}

function seasonForDate(date: Date): AddSeasonId {
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  const key = month * 100 + day
  if (key >= 320 && key < 621) return "spring"
  if (key >= 621 && key < 923) return "summer"
  if (key >= 923 && key < 1221) return "autumn"
  return "winter"
}

function seasonLabel(season: AddSeasonId): string {
  switch (season) {
    case "spring":
      return "Spring"
    case "summer":
      return "Summer"
    case "autumn":
      return "Autumn"
    case "winter":
      return "Winter"
  }
}

function parisUtcOffsetHours(date: Date): number {
  const start = lastUtcSunday(REFERENCE_YEAR, 2)
  const end = lastUtcSunday(REFERENCE_YEAR, 9)
  return date >= start && date < end ? 2 : 1
}

function lastUtcSunday(year: number, monthIndex: number): Date {
  const date = new Date(Date.UTC(year, monthIndex + 1, 0))
  date.setUTCDate(date.getUTCDate() - date.getUTCDay())
  return date
}

function addUtcDays(timestamp: number, days: number): Date {
  return new Date(timestamp + days * MINUTES_PER_DAY * 60 * 1000)
}

function daysInYear(year: number): number {
  return new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1 ? 366 : 365
}

function utcDayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  return Math.floor((date.getTime() - start) / (MINUTES_PER_DAY * 60 * 1000))
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function formatMinuteOfDay(minute: number): string {
  const normalized = positiveModulo(Math.round(minute), MINUTES_PER_DAY)
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor
}

function normalizeDegrees(value: number): number {
  return positiveModulo(value, 360)
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

function sinDeg(value: number): number {
  return Math.sin((value * Math.PI) / 180)
}

function cosDeg(value: number): number {
  return Math.cos((value * Math.PI) / 180)
}

function tanDeg(value: number): number {
  return Math.tan((value * Math.PI) / 180)
}

function acosDeg(value: number): number {
  return (Math.acos(value) * 180) / Math.PI
}

function atanDeg(value: number): number {
  return (Math.atan(value) * 180) / Math.PI
}
