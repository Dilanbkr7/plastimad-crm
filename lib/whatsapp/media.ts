const GRAPH_API_VERSION =
  process.env.WHATSAPP_GRAPH_API_VERSION || "v26.0";

const ACCESS_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN;


export async function getWhatsAppMediaUrl(
  mediaId: string,
): Promise<string | null> {

  if (!ACCESS_TOKEN) {
    console.error(
      "Falta WHATSAPP_ACCESS_TOKEN",
    );

    return null;
  }

  try {

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      },
    );


    if (!response.ok) {

      const errorText = await response.text();

      console.error(
        "Error Meta Media:",
        errorText,
      );

      return null;
    }


    const data = await response.json();

    console.log(
      "RESPUESTA COMPLETA META MEDIA:",
      JSON.stringify(data, null, 2),
    );


    return data.url ?? null;


  } catch(error){

    console.error(
      "Error consultando media:",
      error,
    );

    return null;
  }
}