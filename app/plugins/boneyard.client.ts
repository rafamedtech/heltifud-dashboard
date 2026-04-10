import { configureBoneyard } from 'boneyard-js/vue'
import '~/bones/registry.js'

configureBoneyard({
  color: '#e4e4e7',
  darkColor: '#27272a',
  animate: 'shimmer',
  transition: 180
})

export default defineNuxtPlugin(() => {})
