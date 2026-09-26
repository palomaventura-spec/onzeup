export const brand = {
  name: "11UP",
  shortName: "11UP",
  product: "Club",

  domain: "onzeup.com.br",

  logo: "/brand/11up/logos/11up-logo-transparent-light.svg",
  logoLight: "/brand/11up/logos/11up-logo-transparent-light.svg",
  symbol: "/brand/11up/logos/11up-symbol-transparent-dark.svg",
  symbolLight: "/brand/11up/logos/11up-symbol-transparent-light.svg",

  appIcon: "/brand/11up/app/11up-icon-192.svg",

  primaryColor: "#9ddb16",

  tagline: "Tecnologia para gestão e performance esportiva.",
} as const;

export type BrandConfig = typeof brand;