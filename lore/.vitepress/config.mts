import { defineConfig } from 'vitepress'
export default defineConfig({
  title: 'Aedventure Lore', description: 'Local canonical world encyclopedia',
  cleanUrls: true, lastUpdated: true, ignoreDeadLinks: true,
  themeConfig: {
    nav: [{text:'Lore',link:'/'},{text:'Timeline',link:'/timeline-interactive'},{text:'Relations',link:'/relations'},{text:'Map',link:'/map'},{text:'404 inventory',link:'/pages-to-create'}],
    sidebar: {'/': [{text:'Explore',items:[{text:'Home',link:'/'},{text:'Entities',link:'/entities'},{text:'Timeline',link:'/timeline-interactive'},{text:'Relations',link:'/relations'},{text:'Map',link:'/map'},{text:'Contradictions',link:'/contradictions'}]},{text:'Survival groups',items:[{text:'Index',link:'/survival-groups/'},{text:'Ardèche',link:'/survival-groups/ardeche-unplugged'},{text:'Mponeng',link:'/survival-groups/mponeng-mine'}]},{text:'Authoring',items:[{text:'Structured data',link:'/data/'},{text:'Pages to create',link:'/pages-to-create'},{text:'The truth',link:'/the-truth'}]}]},
    search:{provider:'local'}, outline:[2,3]
  }
})
