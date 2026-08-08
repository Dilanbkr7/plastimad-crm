import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eliminación de Datos | Plastimad",
  description:
    "Instrucciones para solicitar la eliminación de datos personales tratados por Plastimad.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function EliminacionDatosPage() {
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
      <h1>Instrucciones para la Eliminación de Datos</h1>

      <p>
        <strong>Última actualización:</strong> agosto de 2026
      </p>

      <p>
        PLASTICMADERA ECUADOR S.A.S., comercialmente conocida como Plastimad,
        permite a los usuarios solicitar la eliminación de los datos personales
        tratados mediante nuestros servicios digitales.
      </p>

      <h2>Cómo solicitar la eliminación</h2>

      <p>
        Para solicitar la eliminación de tus datos, envía un correo electrónico
        a:
      </p>

      <p>
        <strong>
          <a href="mailto:ventasplastimad@gmail.com">
            ventasplastimad@gmail.com
          </a>
        </strong>
      </p>

      <p>Utiliza como asunto:</p>

      <p>
        <strong>Solicitud de eliminación de datos - Plastimad CRM</strong>
      </p>

      <h2>Información que debes incluir</h2>

      <ul>
        <li>Nombre utilizado al contactar con Plastimad.</li>
        <li>Número de teléfono asociado a la comunicación.</li>
        <li>Correo electrónico, cuando corresponda.</li>
        <li>
          Una descripción breve de los datos cuya eliminación deseas solicitar.
        </li>
      </ul>

      <h2>Verificación de la solicitud</h2>

      <p>
        Por motivos de seguridad, Plastimad podrá solicitar información
        adicional razonable para comprobar que la solicitud corresponde al
        titular de los datos.
      </p>

      <h2>Procesamiento de la solicitud</h2>

      <p>
        Una vez verificada la solicitud, se eliminarán o anonimizarán los datos
        personales que correspondan, salvo aquellos que deban conservarse por
        obligaciones legales, contractuales, contables o de seguridad.
      </p>

      <p>
        Una vez procesada la solicitud, se podrá enviar una confirmación al
        medio de contacto proporcionado por el solicitante.
      </p>

      <h2>Datos relacionados con WhatsApp</h2>

      <p>
        Si has interactuado con Plastimad mediante WhatsApp, puedes solicitar la
        eliminación de la información almacenada por Plastimad relacionada con
        dichas conversaciones, de acuerdo con las condiciones descritas en esta
        página.
      </p>

      <h2>Contacto</h2>

      <p>
        <strong>PLASTICMADERA ECUADOR S.A.S.</strong>
        <br />
        Ecuador
        <br />
        Correo:{" "}
        <a href="mailto:ventasplastimad@gmail.com">
          ventasplastimad@gmail.com
        </a>
        <br />
        Sitio:{" "}
        <a href="https://plastimadshop.com">
          https://plastimadshop.com
        </a>
      </p>

      <p>
        Consulta también nuestra{" "}
        <a href="https://plastimadshop.com/privacidad">
          Política de Privacidad
        </a>
        .
      </p>
    </main>
  );
}