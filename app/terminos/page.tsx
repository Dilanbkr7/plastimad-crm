import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones | Plastimad",
  description:
    "Términos y condiciones de uso de los servicios digitales de Plastimad.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function TerminosPage() {
  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "48px 24px",
        fontFamily: "Arial, sans-serif",
        lineHeight: 1.7,
      }}
    >
      <h1>Términos y Condiciones</h1>

      <p>
        <strong>Última actualización:</strong> agosto de 2026
      </p>

      <p>
        Estos términos regulan el uso de los servicios digitales ofrecidos por
        PLASTICMADERA ECUADOR S.A.S., comercialmente conocida como Plastimad.
      </p>

      <h2>1. Identificación</h2>

      <p>
        <strong>Empresa:</strong> PLASTICMADERA ECUADOR S.A.S.
        <br />
        <strong>País:</strong> Ecuador
        <br />
        <strong>Sitio:</strong>{" "}
        <a href="https://plastimadshop.com">
          https://plastimadshop.com
        </a>
        <br />
        <strong>Correo:</strong>{" "}
        <a href="mailto:ventasplastimad@gmail.com">
          ventasplastimad@gmail.com
        </a>
      </p>

      <h2>2. Objeto</h2>

      <p>
        El sitio permite consultar información comercial, productos, realizar
        solicitudes o pedidos y comunicarse con Plastimad mediante los canales
        habilitados.
      </p>

      <h2>3. Información de productos y servicios</h2>

      <p>
        Plastimad procura mantener actualizada la información publicada. Las
        características, disponibilidad, condiciones comerciales y valores de
        los productos podrán actualizarse cuando resulte necesario.
      </p>

      <h2>4. Pedidos</h2>

      <p>
        Los datos proporcionados por el usuario durante un pedido deben ser
        correctos y suficientes para permitir su procesamiento y seguimiento.
      </p>

      <p>
        La recepción electrónica de una solicitud no implica necesariamente la
        aceptación definitiva del pedido hasta que Plastimad confirme las
        condiciones correspondientes.
      </p>

      <h2>5. Comunicaciones mediante WhatsApp</h2>

      <p>
        El usuario puede comunicarse con Plastimad mediante WhatsApp para
        realizar consultas, recibir atención y gestionar información
        relacionada con pedidos.
      </p>

      <p>
        Algunas respuestas pueden ser automatizadas. Cuando sea necesario, la
        conversación podrá transferirse a un asesor humano.
      </p>

      <h2>6. Uso adecuado</h2>

      <p>
        Los usuarios se comprometen a utilizar el sitio y los canales de
        comunicación de forma lícita y a no realizar acciones que afecten su
        funcionamiento, seguridad o disponibilidad.
      </p>

      <h2>7. Disponibilidad</h2>

      <p>
        Plastimad procura mantener sus servicios digitales disponibles, pero no
        garantiza una operación ininterrumpida frente a mantenimientos,
        incidentes técnicos o situaciones fuera de su control.
      </p>

      <h2>8. Privacidad</h2>

      <p>
        El tratamiento de información personal se describe en nuestra Política
        de Privacidad:
      </p>

      <p>
        <a href="https://plastimadshop.com/privacidad">
          https://plastimadshop.com/privacidad
        </a>
      </p>

      <h2>9. Cambios</h2>

      <p>
        Plastimad puede actualizar estos términos cuando resulte necesario. La
        versión vigente estará disponible permanentemente en esta página.
      </p>

      <h2>10. Contacto</h2>

      <p>
        Para consultas relacionadas con estos términos:
        <br />
        <a href="mailto:ventasplastimad@gmail.com">
          ventasplastimad@gmail.com
        </a>
      </p>
    </main>
  );
}