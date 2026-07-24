import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/* shadcn's standard className combiner — merges conditional classes and
   resolves Tailwind conflicts (last-wins). Used only by the shadcn UI
   primitives under src/components/ui and the Dashboard13 traffic view. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
