import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad | Plastimad",
  description:
    "Política de privacidad y tratamiento de datos personales de Plastimad.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacidadPage() {
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
      <h1>Política de Privacidad</h1>

      <p>
        <strong>Última actualización:</strong> agosto de 2026
      </p>

      <p>
        PLASTICMADERA ECUADOR S.A.S., comercialmente conocida como Plastimad,
        respeta la privacidad de sus clientes, usuarios y visitantes. Esta
        política explica de forma general cómo se recopilan, utilizan,
        almacenan y protegen los datos personales tratados a través de nuestros
        servicios digitales.
      </p>

      <h2>1. Responsable del tratamiento</h2>

      <p>
        <strong>Empresa:</strong> PLASTICMADERA ECUADOR S.A.S.
        <br />
        <strong>País:</strong> Ecuador
        <br />
        <strong>Sitio de la aplicación:</strong>{" "}
        <a href="https://plastimadshop.com">
          https://plastimadshop.com
        </a>
        <br />
        <strong>Correo de contacto:</strong>{" "}
        <a href="mailto:ventasplastimad@gmail.com">
          ventasplastimad@gmail.com
        </a>
      </p>

      <h2>2. Datos que podemos tratar</h2>

      <p>Dependiendo de la interacción del usuario, podemos tratar datos como:</p>

      <ul>
        <li>Nombre y datos de identificación proporcionados voluntariamente.</li>
        <li>Número de teléfono.</li>
        <li>Correo electrónico.</li>
        <li>Datos necesarios para gestionar pedidos y entregas.</li>
        <li>Productos, cantidades y datos relacionados con una compra.</li>
        <li>Mensajes y consultas enviados mediante WhatsApp.</li>
        <li>
          Información técnica necesaria para el funcionamiento y seguridad del
          sitio y del CRM.
        </li>
      </ul>

      <h2>3. Finalidades</h2>

      <p>Los datos pueden ser utilizados para:</p>

      <ul>
        <li>Atender consultas comerciales.</li>
        <li>Procesar y dar seguimiento a pedidos.</li>
        <li>Brindar atención al cliente.</li>
        <li>Gestionar comunicaciones mediante WhatsApp.</li>
        <li>Registrar conversaciones necesarias para la atención comercial.</li>
        <li>Mejorar y mantener nuestros servicios digitales.</li>
        <li>Cumplir obligaciones legales aplicables.</li>
      </ul>

      <h2>4. WhatsApp Business y servicios tecnológicos</h2>

      <p>
        Plastimad puede utilizar la Plataforma de WhatsApp Business de Meta para
        recibir y enviar comunicaciones relacionadas con atención al cliente,
        consultas y pedidos.
      </p>

      <p>
        Para operar nuestros servicios también podemos utilizar proveedores
        tecnológicos que prestan servicios de infraestructura, alojamiento,
        base de datos y comunicaciones, incluyendo Meta, Netlify y Supabase,
        según corresponda.
      </p>

      <h2>5. Conservación de los datos</h2>

      <p>
        Conservamos la información durante el tiempo necesario para cumplir las
        finalidades para las que fue recopilada y las obligaciones legales o
        comerciales aplicables.
      </p>

      <h2>6. Derechos de los titulares</h2>

      <p>
        El titular puede solicitar, cuando corresponda, acceso, actualización,
        corrección, oposición o eliminación de sus datos personales.
      </p>

      <p>
        Las solicitudes pueden enviarse a:
        <br />
        <a href="mailto:ventasplastimad@gmail.com">
          ventasplastimad@gmail.com
        </a>
      </p>

      <p>
        También puede consultar nuestras instrucciones específicas de
        eliminación de datos en:
        <br />
        <a href="https://plastimadshop.com/eliminacion-de-datos">
          https://plastimadshop.com/eliminacion-de-datos
        </a>
      </p>

      <h2>7. Seguridad</h2>

      <p>
        Aplicamos medidas técnicas y organizativas razonables para proteger la
        información frente a accesos no autorizados, alteración, pérdida o uso
        indebido.
      </p>

      <h2>8. Cambios a esta política</h2>

      <p>
        Esta política puede actualizarse cuando cambien nuestros servicios,
        procesos o requisitos legales. La versión vigente se publicará en esta
        misma página.
      </p>
    </main>
  );
}