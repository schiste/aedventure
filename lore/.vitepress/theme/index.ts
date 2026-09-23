import DefaultTheme from 'vitepress/theme'
import './custom.css'
import EntityCard from './EntityCard.vue'
import TimelineView from './TimelineView.vue'
import RelationsGraph from './RelationsGraph.vue'
import LoreMap from './LoreMap.vue'
import ClaimsPanel from './ClaimsPanel.vue'
export default { extends: DefaultTheme, enhanceApp({app}) { app.component('EntityCard',EntityCard); app.component('TimelineView',TimelineView); app.component('RelationsGraph',RelationsGraph); app.component('LoreMap',LoreMap); app.component('ClaimsPanel',ClaimsPanel) } }
