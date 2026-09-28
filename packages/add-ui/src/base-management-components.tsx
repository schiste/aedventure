// Solid metric renderer for the base-management view.
import { createComponent } from "solid-js"
import type { AddBaseManagementState } from "@aedventure/add-presentation"

import { indexList } from "./control-flow"
import { Stat, type Tone } from "./primitives"

type Base = AddBaseManagementState

export function baseManagementMetricRows(
  section: () => Base["sections"][number] | undefined,
): unknown {
  return indexList(
    () => section()?.metrics ?? [],
    (metric) => {
      const tone = (): Tone => {
        switch (metric().severity) {
          case "good":
            return "success"
          case "warning":
            return "warning"
          case "danger":
            return "danger"
          default:
            return "neutral"
        }
      }
      return createComponent(Stat, {
        className: "base-metric",
        label: () => metric().label,
        value: () => metric().value,
        delta: () => metric().detail,
        tone,
        severity: () => metric().severity,
      })
    },
  )
}
