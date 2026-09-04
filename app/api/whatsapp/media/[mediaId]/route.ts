import { NextRequest, NextResponse } from "next/server";


const GRAPH_API_VERSION =
  process.env.WHATSAPP_GRAPH_API_VERSION || "v26.0";


const ACCESS_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN;



export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      mediaId: string;
    }>;
  },
) {

  const { mediaId } = await context.params;


  if (!ACCESS_TOKEN) {
    return new NextResponse(
      "Missing WhatsApp token",
      {
        status: 500,
      },
    );
  }


  try {

    // 1. Obtener URL temporal desde Meta

    const metaResponse =
      await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`,
        {
          headers: {
            Authorization:
              `Bearer ${ACCESS_TOKEN}`,
          },
        },
      );


    if (!metaResponse.ok) {

      console.error(
        await metaResponse.text(),
      );

      return new NextResponse(
        "Meta media error",
        {
          status: 500,
        },
      );
    }


    const mediaData =
      await metaResponse.json();



    // 2. Descargar imagen real

    const imageResponse =
      await fetch(
        mediaData.url,
        {
          headers: {
            Authorization:
              `Bearer ${ACCESS_TOKEN}`,
          },
        },
      );



    if (!imageResponse.ok) {

      return new NextResponse(
        "Download error",
        {
          status: 500,
        },
      );

    }



    const buffer =
      await imageResponse.arrayBuffer();



    return new NextResponse(
      buffer,
      {
        headers: {
          "Content-Type":
            mediaData.mime_type ||
            "image/jpeg",

          "Cache-Control":
            "public, max-age=3600",
        },
      },
    );


  } catch(error){

    console.error(
      "MEDIA PROXY ERROR",
      error,
    );


    return new NextResponse(
      "Internal error",
      {
        status:500,
      },
    );

  }

}