/**
 * Recursos visuales utilizados por la landing de Plastimad.
 *
 * Para cambiar una imagen en el futuro, reemplaza el archivo
 * correspondiente dentro de public/plastimad/landing y conserva
 * exactamente el mismo nombre.
 */
export const LANDING_ASSETS = {
  hero: {
    src: "/plastimad/landing/hero.png",
    position: "center 42%",
  },

  productMain: {
    src: "/plastimad/landing/eco-maceta-principal.png",
    position: "center center",
  },

  productSecondary: {
    src: "/plastimad/landing/eco-maceta-secundaria.png",
    position: "center 35%",
  },
} as const;