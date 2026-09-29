<script setup lang="ts">
const stages = [
  {
    title: "Solar storm",
    detail: "On October 12, 2034, a solar storm damages calibration systems on 23 satellites.",
  },
  {
    title: "Automated compensation",
    detail: "Repair protocols respond by boosting the satellites' output.",
  },
  {
    title: "Harmonic interference",
    detail: "The boosted signal interferes with undamaged satellites.",
  },
  {
    title: "Dampening field",
    detail: "Within 72 hours, the network amplifies itself into a full spectrum dampening field.",
  },
  {
    title: "The Filter activates",
    detail: "At 4:34 AM UTC on October 14, airborne sound propagation is nearly suppressed.",
  },
]
</script>

<template>
  <figure class="filter-flow">
    <ol class="filter-flow__steps" aria-label="Sequence of events that formed the Filter">
      <li
        v-for="(stage, index) in stages"
        :key="stage.title"
        class="filter-flow__step lore-card"
      >
        <span class="filter-flow__number" aria-hidden="true">
          {{ String(index + 1).padStart(2, "0") }}
        </span>
        <div>
          <strong>{{ stage.title }}</strong>
          <p>{{ stage.detail }}</p>
        </div>
      </li>
    </ol>
    <figcaption>
      An automated repair response turned localized satellite damage into a global sound dampening field.
    </figcaption>
  </figure>
</template>

<style scoped>
.filter-flow__steps {
  display: grid;
  gap: 1.5rem;
  margin: 1.5rem 0;
  padding: 0;
  list-style: none;
}

.filter-flow__step {
  position: relative;
  display: grid;
  grid-template-columns: 2.25rem minmax(0, 1fr);
  align-items: start;
  gap: 0.75rem;
  margin: 0;
  border-radius: 6px;
}

.filter-flow__step:not(:last-child)::after {
  position: absolute;
  bottom: -1.35rem;
  left: 1rem;
  color: var(--vp-c-brand-1);
  content: "\2193";
  font-size: 1.1rem;
  line-height: 1;
}

.filter-flow__number {
  display: grid;
  width: 2rem;
  aspect-ratio: 1;
  place-items: center;
  border: 1px solid var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.filter-flow__step p {
  margin: 0.45rem 0 0;
}

.filter-flow figcaption {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}
</style>
