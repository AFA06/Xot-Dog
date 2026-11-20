import type { CategoryId, ProductTone } from '@/domain/types'
import { CupSoda, Flame, Package, Sandwich, Soup, type LucideIcon } from 'lucide-react'

export const TONE_BAR: Record<ProductTone, string> = {
  red: 'bg-[oklch(0.58_0.2_30)]',
  mustard: 'bg-[oklch(0.8_0.15_85)]',
  brown: 'bg-[oklch(0.5_0.08_50)]',
  green: 'bg-[oklch(0.62_0.14_145)]',
  blue: 'bg-[oklch(0.6_0.13_240)]',
  purple: 'bg-[oklch(0.55_0.15_300)]',
}

export const CATEGORY_ICON: Record<CategoryId, LucideIcon> = {
  hotdogs: Flame,
  burgers: Sandwich,
  sides: Soup,
  drinks: CupSoda,
  combos: Package,
}
