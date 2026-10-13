import type {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
} from '../primitives/typography.js'

export type TextStyle = {
  family: keyof typeof fontFamily
  size: keyof typeof fontSize
  weight: keyof typeof fontWeight
  lineHeight: keyof typeof lineHeight
  letterSpacing: keyof typeof letterSpacing
}

/**
 * Named text styles. Components and Tailwind utilities (`text-heading-1`, …)
 * reference these instead of combining size/weight/leading by hand.
 */
export const textStyles = {
  display: {
    family: 'display',
    size: '6xl',
    weight: 'bold',
    lineHeight: 'none',
    letterSpacing: 'tighter',
  },
  'heading-1': {
    family: 'display',
    size: '4xl',
    weight: 'bold',
    lineHeight: 'tight',
    letterSpacing: 'tight',
  },
  'heading-2': {
    family: 'display',
    size: '3xl',
    weight: 'semibold',
    lineHeight: 'tight',
    letterSpacing: 'tight',
  },
  'heading-3': {
    family: 'display',
    size: '2xl',
    weight: 'semibold',
    lineHeight: 'snug',
    letterSpacing: 'tight',
  },
  'heading-4': {
    family: 'display',
    size: 'xl',
    weight: 'semibold',
    lineHeight: 'snug',
    letterSpacing: 'normal',
  },
  'body-lg': {
    family: 'sans',
    size: 'lg',
    weight: 'regular',
    lineHeight: 'relaxed',
    letterSpacing: 'normal',
  },
  body: {
    family: 'sans',
    size: 'base',
    weight: 'regular',
    lineHeight: 'normal',
    letterSpacing: 'normal',
  },
  'body-sm': {
    family: 'sans',
    size: 'sm',
    weight: 'regular',
    lineHeight: 'normal',
    letterSpacing: 'normal',
  },
  label: {
    family: 'sans',
    size: 'sm',
    weight: 'medium',
    lineHeight: 'snug',
    letterSpacing: 'normal',
  },
  caption: {
    family: 'sans',
    size: 'xs',
    weight: 'regular',
    lineHeight: 'normal',
    letterSpacing: 'normal',
  },
  overline: {
    family: 'sans',
    size: 'xs',
    weight: 'semibold',
    lineHeight: 'normal',
    letterSpacing: 'wide',
  },
  code: {
    family: 'mono',
    size: 'sm',
    weight: 'regular',
    lineHeight: 'normal',
    letterSpacing: 'normal',
  },
} as const satisfies Record<string, TextStyle>

export type TextStyleName = keyof typeof textStyles
