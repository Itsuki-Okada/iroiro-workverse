import { Briefcase, CalendarCheck, ClipboardList, Crown, Flag, Star, Sunrise, Target, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const ACHIEVEMENT_ICON: Record<string, LucideIcon> = {
  flag: Flag,
  zap: Zap,
  briefcase: Briefcase,
  target: Target,
  sunrise: Sunrise,
  clipboard: ClipboardList,
  calendar: CalendarCheck,
  star: Star,
  crown: Crown,
};
