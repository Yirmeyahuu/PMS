export const PORTAL_ROUTES = {
  home:    (token: string) => `/portal/${token}`,
  success: (token: string) => `/portal/${token}/success`,
} as const;