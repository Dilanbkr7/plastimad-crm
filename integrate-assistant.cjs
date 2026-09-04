const fs = require("fs");

const pagePath = "app/page.tsx";

if (!fs.existsSync(pagePath)) {
  throw new Error(`No existe ${pagePath}`);
}

let source = fs.readFileSync(pagePath, "utf8");

const assistantImport =
  'import AssistantChat from "@/components/landing/AssistantChat";';

const orderFormImport =
  'import OrderForm from "@/components/landing/OrderForm";';

if (!source.includes(orderFormImport)) {
  throw new Error(
    "No se encontró el import de OrderForm en app/page.tsx.",
  );
}

if (!source.includes(assistantImport)) {
  source = source.replace(
    orderFormImport,
    `${assistantImport}\n${orderFormImport}`,
  );
}

if (!source.includes("<AssistantChat")) {
  const mainClosingTag = "    </main>";
  const insertionIndex =
    source.lastIndexOf(mainClosingTag);

  if (insertionIndex === -1) {
    throw new Error(
      "No se encontró el cierre final de </main> en app/page.tsx.",
    );
  }

  const assistantBlock = `      <AssistantChat
        businessName={settings.businessName}
        whatsappNumber={settings.whatsappNumber}
      />

`;

  source =
    source.slice(0, insertionIndex) +
    assistantBlock +
    source.slice(insertionIndex);
}

fs.writeFileSync(pagePath, source, "utf8");

const verification =
  fs.readFileSync(pagePath, "utf8");

const importOk =
  verification.includes(assistantImport);

const componentOk =
  verification.includes("<AssistantChat");

if (!importOk || !componentOk) {
  throw new Error(
    "La integración no pudo verificarse.",
  );
}

console.log("INTEGRACION DEL ASISTENTE COMPLETADA");
console.log("Import:", importOk ? "OK" : "ERROR");
console.log("Componente:", componentOk ? "OK" : "ERROR");