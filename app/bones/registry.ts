import type {
  ResponsiveBones,
  SkeletonResult
} from 'boneyard-js'
import { registerBones } from 'boneyard-js'
import { configureBoneyard } from 'boneyard-js/vue'

const boneModules = import.meta.glob('./*.bones.json', {
  eager: true,
  import: 'default'
}) as Record<string, SkeletonResult | ResponsiveBones>

const bones = Object.fromEntries(
  Object.entries(boneModules).flatMap(([path, value]) => {
    const fileName = path.split('/').pop()

    if (!fileName) {
      return []
    }

    return [[fileName.replace(/\.bones\.json$/, ''), value]]
  })
) as Record<string, SkeletonResult | ResponsiveBones>

configureBoneyard({
  color: '#e7eaf0',
  darkColor: '#1f2937',
  animate: 'shimmer',
  transition: 180
})

registerBones(bones)
