/**
 * Recursos visuales utilizados por la landing de Plastimad.
 *
 * Para cambiar una imagen en el futuro, reemplaza el archivo
 * correspondiente dentro de public/plastimad/landing y conserva
 * exactamente el mismo nombre.
 */
export const LANDING_ASSETS = {
  hero: {
    src: "/plastimad/optimized-v1/hero.webp",
    position: "center 42%",
  },

  productMain: {
    src: "/plastimad/optimized-v1/eco-maceta-principal.webp",
    position: "center center",
  },

  productSecondary: {
    src: "/plastimad/optimized-v1/eco-maceta-secundaria.webp",
    position: "center 35%",
  },
} as const;