/**
 * Primitive color scales. These carry no meaning on their own; components should
 * use the semantic aliases in `../semantic/colors.ts` instead.
 *
 * Values are OKLCH so scales stay perceptually even across hues.
 */
export const colors = {
  white: 'oklch(100% 0 0)',
  black: 'oklch(0% 0 0)',

  // Octarine: the eighth color of the rainbow — a greenish-yellow purple.
  brand: {
    50: 'oklch(97.5% 0.014 300)',
    100: 'oklch(94.5% 0.032 300)',
    200: 'oklch(89% 0.064 300)',
    300: 'oklch(81% 0.112 300)',
    400: 'oklch(71% 0.170 300)',
    500: 'oklch(62% 0.210 300)',
    600: 'oklch(54% 0.220 300)',
    700: 'oklch(47% 0.200 300)',
    800: 'oklch(40% 0.165 300)',
    900: 'oklch(34% 0.130 300)',
    950: 'oklch(25% 0.100 300)',
  },
  neutral: {
    50: 'oklch(98.5% 0.002 286)',
    100: 'oklch(96.7% 0.003 286)',
    200: 'oklch(92% 0.004 286)',
    300: 'oklch(87% 0.006 286)',
    400: 'oklch(70.5% 0.015 286)',
    500: 'oklch(55.2% 0.016 286)',
    600: 'oklch(44.2% 0.017 286)',
    700: 'oklch(37% 0.013 286)',
    800: 'oklch(27.4% 0.006 286)',
    900: 'oklch(21% 0.006 286)',
    950: 'oklch(14.1% 0.005 286)',
  },
  red: {
    50: 'oklch(97.1% 0.013 17)',
    100: 'oklch(93.6% 0.032 17)',
    200: 'oklch(88.5% 0.062 18)',
    300: 'oklch(80.8% 0.114 19)',
    400: 'oklch(70.4% 0.191 22)',
    500: 'oklch(63.7% 0.237 25)',
    600: 'oklch(57.7% 0.245 27)',
    700: 'oklch(50.5% 0.213 27)',
    800: 'oklch(44.4% 0.177 27)',
    900: 'oklch(39.6% 0.141 26)',
    950: 'oklch(25.8% 0.092 26)',
  },
  amber: {
    50: 'oklch(98.7% 0.022 95)',
    100: 'oklch(96.2% 0.059 96)',
    200: 'oklch(92.4% 0.12 96)',
    300: 'oklch(87.9% 0.169 92)',
    400: 'oklch(82.8% 0.189 84)',
    500: 'oklch(76.9% 0.188 70)',
    600: 'oklch(66.6% 0.179 58)',
    700: 'oklch(55.5% 0.163 49)',
    800: 'oklch(47.3% 0.137 46)',
    900: 'oklch(41.4% 0.112 46)',
    950: 'oklch(27.9% 0.077 46)',
  },
  green: {
    50: 'oklch(98.2% 0.018 156)',
    100: 'oklch(96.2% 0.044 157)',
    200: 'oklch(92.5% 0.084 156)',
    300: 'oklch(87.1% 0.15 154)',
    400: 'oklch(79.2% 0.209 152)',
    500: 'oklch(72.3% 0.219 150)',
    600: 'oklch(62.7% 0.194 149)',
    700: 'oklch(52.7% 0.154 150)',
    800: 'oklch(44.8% 0.119 151)',
    900: 'oklch(39.3% 0.095 153)',
    950: 'oklch(26.6% 0.065 153)',
  },
  blue: {
    50: 'oklch(97% 0.014 255)',
    100: 'oklch(93.2% 0.032 256)',
    200: 'oklch(88.2% 0.059 254)',
    300: 'oklch(80.9% 0.105 252)',
    400: 'oklch(70.7% 0.165 254)',
    500: 'oklch(62.3% 0.214 259)',
    600: 'oklch(54.6% 0.245 263)',
    700: 'oklch(48.8% 0.243 264)',
    800: 'oklch(42.4% 0.199 266)',
    900: 'oklch(37.9% 0.146 266)',
    950: 'oklch(28.2% 0.091 268)',
  },
} as const

export type ColorScale = keyof typeof colors.brand
export type ColorPalette = Exclude<keyof typeof colors, 'white' | 'black'>
