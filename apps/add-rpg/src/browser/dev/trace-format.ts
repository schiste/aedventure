/** Stable machine-readable trace contract shared by browser recording and reports. */
export const ADD_TRACE_FORMAT = "add-trace-v1" as const
export const ADD_TRACE_SCHEMA_VERSION = 1 as const
export const ADD_TRACE_BUDGETS_ID = "add-performance-budgets-v1" as const

export type AddTraceFormat = typeof ADD_TRACE_FORMAT
