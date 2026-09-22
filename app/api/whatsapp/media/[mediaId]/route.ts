import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversationMessages, conversations } from "@/lib/schema";
import { getCrmUser } from "@/lib/auth";
import {
  NextRequest,
  NextResponse,
} from "next/server";

const GRAPH_API_VERSION =
  process.env.WHATSAPP_GRAPH_API_VERSION ||
  "v26.0";

const ACCESS_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN;

type MetaMediaResponse = {
  url?: unknown;
  mime_type?: unknown;
};

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      mediaId: string;
    }>;
  },
) {
  const user = await getCrmUser();
  if (!user) return new NextResponse("No autorizado", { status: 401, headers: { "Cache-Control": "no-store" } });
  const { mediaId } = await context.params;
  if (!/^\d{1,40}$/.test(mediaId)) return new NextResponse("Invalid media id", { status: 400 });
  const [record] = await db.select({ id: conversationMessages.id }).from(conversationMessages)
    .innerJoin(conversations, eq(conversations.id, conversationMessages.conversationId))
    .where(and(eq(conversationMessages.mediaId, mediaId), eq(conversations.channel, "WHATSAPP"))).limit(1);
  if (!record) return new NextResponse("Archivo no encontrado", { status: 404 });

  if (!ACCESS_TOKEN) {
    return new NextResponse(
      "Missing WhatsApp token",
      {
        status: 500,
      },
    );
  }

  if (!mediaId) {
    return new NextResponse(
      "Missing media id",
      {
        status: 400,
      },
    );
  }

  try {
    /*
     * 1. Obtener una URL temporal nueva desde Meta.
     *
     * No dependemos del media_url guardado en BD,
     * porque las URLs de Meta son temporales.
     */
    const metaResponse = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`,
      {
        headers: {
          Authorization:
            `Bearer ${ACCESS_TOKEN}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!metaResponse.ok) {
      const errorBody =
        await metaResponse.text();

      console.error(
        "META MEDIA METADATA ERROR:",
        errorBody,
      );

      return new NextResponse(
        "Meta media metadata error",
        {
          status: 502,
        },
      );
    }

    const mediaData =
      (await metaResponse.json()) as MetaMediaResponse;

    const mediaUrl =
      typeof mediaData.url === "string"
        ? mediaData.url
        : "";

    const metaMimeType =
      typeof mediaData.mime_type === "string"
        ? mediaData.mime_type
        : null;

    if (!mediaUrl) {
      console.error(
        "Meta no devolvió URL para media:",
        mediaId,
      );

      return new NextResponse(
        "Media URL unavailable",
        {
          status: 502,
        },
      );
    }

    /*
     * 2. Descargar el archivo real.
     *
     * Si el navegador solicita Range, lo reenviamos.
     * Esto mejora reproducción de audio y video.
     */
    const range =
      request.headers.get("range");

    const downloadHeaders: Record<
      string,
      string
    > = {
      Authorization:
        `Bearer ${ACCESS_TOKEN}`,
    };

    if (range) {
      downloadHeaders.Range = range;
    }

    const mediaResponse = await fetch(
      mediaUrl,
      {
        headers: downloadHeaders,
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!mediaResponse.ok) {
      const errorBody =
        await mediaResponse.text();

      console.error(
        "META MEDIA DOWNLOAD ERROR:",
        errorBody,
      );

      return new NextResponse(
        "Media download error",
        {
          status: 502,
        },
      );
    }

    /*
     * 3. Preparar cabeceras correctas según
     * imagen, audio, video, PDF, etc.
     */
    const contentType =
      metaMimeType ||
      mediaResponse.headers.get(
        "content-type",
      ) ||
      "application/octet-stream";

    const responseHeaders =
      new Headers();

    responseHeaders.set(
      "Content-Type",
      contentType,
    );

    responseHeaders.set(
      "Cache-Control",
      "private, max-age=300",
    );

    responseHeaders.set(
      "X-Content-Type-Options",
      "nosniff",
    );

    responseHeaders.set(
      "Content-Disposition",
      "inline",
    );

    const contentLength =
      mediaResponse.headers.get(
        "content-length",
      );

    if (contentLength) {
      responseHeaders.set(
        "Content-Length",
        contentLength,
      );
    }

    const contentRange =
      mediaResponse.headers.get(
        "content-range",
      );

    if (contentRange) {
      responseHeaders.set(
        "Content-Range",
        contentRange,
      );
    }

    const acceptRanges =
      mediaResponse.headers.get(
        "accept-ranges",
      );

    if (acceptRanges) {
      responseHeaders.set(
        "Accept-Ranges",
        acceptRanges,
      );
    }



    /*
     * Importante:
     * si Meta respondió 206 Partial Content,
     * conservamos ese status para audio/video.
     */
    return new NextResponse(
      mediaResponse.body,
      {
        status: mediaResponse.status,
        headers: responseHeaders,
      },
    );
  } catch (error) {
    console.error(
      "WHATSAPP MEDIA PROXY ERROR:",
      error,
    );

    return new NextResponse(
      "Internal media error",
      {
        status: 500,
      },
    );
  }
}