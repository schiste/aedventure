// Solid control flow, usable from `solid-js/html` templates.
//
// The app renders through `solid-js/html` rather than JSX, so it cannot write
// `<For>` or `<Show>` as tags. These wrappers call `createComponent` directly —
// exactly what JSX compiles to — so the control-flow components are available
// anyway, and the one cast each needs lives here instead of at every call site.
import { Index, Show, type Accessor } from "solid-js"
import { createComponent } from "solid-js/web"

export type ListRow<T> = (item: Accessor<T>, index: number) => unknown

/**
 * Render a list that keeps its DOM when the array behind it is replaced.
 *
 * The snapshot that feeds these lists is a new object roughly twenty-four times
 * a second, so a list built with `.map()` tore down and recreated every row at
 * that rate even when nothing had changed. Recreated DOM is visible: panels
 * blinked, and anything mid-hover or mid-transition flickered with them.
 *
 * `Index` keys by position, which is what these lists want — the array is
 * rebuilt wholesale but its shape is stable, so each row keeps its element and
 * only the values inside it update. `For` keys by identity and would recreate
 * everything, because every snapshot brings new objects.
 */
export function indexList<T>(each: () => readonly T[], row: ListRow<T>): unknown {
  // `solid-js/html` is untyped: its templates are `unknown`, not `Element`, so
  // `Index`'s element constraint cannot be met without a cast.
  const list = Index as unknown as (props: {
    each: readonly T[]
    children: ListRow<T>
  }) => Element
  return createComponent(list, {
    get each() {
      return each()
    },
    children: row,
  })
}

/**
 * Render a subtree only while its data is present, keeping it alive across
 * updates that leave the condition true. A ternary rebuilds the branch whenever
 * anything it reads changes; `Show` rebuilds only when the condition flips.
 */
export function showWhen<T>(
  when: () => T | undefined | null | false,
  body: (value: Accessor<NonNullable<T>>) => unknown,
): unknown {
  const guard = Show as unknown as (props: {
    when: T | undefined | null | false
    children: (value: Accessor<NonNullable<T>>) => unknown
  }) => Element
  return createComponent(guard, {
    get when() {
      return when()
    },
    children: body,
  })
}
