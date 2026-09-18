import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Fallback shelf-life estimates based on standard food safety guidance
function getFallbackShelfLife(productName: string, category?: string) {
  const lowerName = productName.toLowerCase();
  const lowerCat = (category || "").toLowerCase();

  let days = 7;
  let estimated = "3 - 7 días en refrigeración";
  let storage = ["Mantener refrigerado entre 1°C y 4°C", "Cerrar herméticamente tras abrir"];
  let spoilage = ["Cambio notable de olor agrio", "Presencia de moho visible", "Cambio de textura o color"];

  if (lowerName.includes("leche") || lowerCat.includes("lácteo") || lowerName.includes("yogur")) {
    days = 7;
    estimated = "5 - 7 días una vez abierto en heladera";
    storage = ["Guardar en el cuerpo principal de la heladera, no en la puerta", "Mantener entre 2°C y 4°C"];
    spoilage = ["Olor agrio", "Cuajado o grumos", "Sabor ácido"];
  } else if (lowerName.includes("queso")) {
    days = 14;
    estimated = "10 - 15 días en heladera";
    storage = ["Envolver en papel film o guardar en táper hermético", "Refrigerar a 4°C"];
    spoilage = ["Manchas de moho anormales", "Olor amoniacal fuerte"];
  } else if (lowerName.includes("carne") || lowerName.includes("pollo") || lowerCat.includes("carnicería")) {
    days = 3;
    estimated = "2 - 3 días fresco en heladera (o hasta 6 meses congelado)";
    storage = ["Guardar en el estante inferior más frío", "Si no se consume en 48h, congelar a -18°C"];
    spoilage = ["Color grisáceo o verdoso", "Textura pegajosa o viscosa", "Olor fétido o rancio"];
  } else if (lowerName.includes("huevo")) {
    days = 21;
    estimated = "21 - 28 días en heladera";
    storage = ["Conservar en su cartón original en heladera", "No lavar antes de guardar"];
    spoilage = ["Flota completamente en un vaso de agua", "Clara acuosa con mal olor"];
  } else if (lowerCat.includes("medicamento") || lowerName.includes("paracetamol") || lowerName.includes("ibuprofeno")) {
    days = 180;
    estimated = "6 meses a 1 año (según lote y precinto)";
    storage = ["Lugar fresco y seco, lejos de la luz solar directa", "No guardar en el baño por la humedad"];
    spoilage = ["Cambio de coloración", "Sedimento inusual en jarabes", "Fecha de lote vencida"];
  } else if (lowerCat.includes("almacén") || lowerCat.includes("despensa") || lowerName.includes("arroz") || lowerName.includes("fideos") || lowerName.includes("lata")) {
    days = 90;
    estimated = "3 a 6 meses en despensa";
    storage = ["Almacenar en lugar fresco, seco y oscuro", "Revisar que el envase o lata no esté abollado"];
    spoilage = ["Presencia de gorgojos o insectos", "Lata hinchada o con óxido", "Olor rancio"];
  }

  return {
    summary: `Recomendación estimada de conservación para "${productName}". Para alimentos frescos, consuma preferentemente dentro de este período.`,
    estimatedShelfLife: estimated,
    suggestedDays: days,
    storageRecommendations: storage,
    spoilageSigns: spoilage,
    groundingSources: [
      {
        title: "Guía de Inocuidad y Conservación de Alimentos",
        url: "https://www.fda.gov/food",
      },
    ],
    searchQueries: [`caducidad conservacion ${productName}`],
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Google Search Grounding for Shelf Life and Expiration Guidance
  app.post("/api/gemini/search-shelf-life", async (req, res) => {
    const { productName, category } = req.body || {};

    if (!productName || typeof productName !== "string") {
      res.status(400).json({ error: "productName is required" });
      return;
    }

    try {
      const ai = getGeminiClient();
      if (!ai) {
        // Return fallback data gracefully if API key is not yet set
        const fallback = getFallbackShelfLife(productName, category);
        res.json({
          ...fallback,
          isFallback: true,
          note: "Calculado con guías de conservación estándar (clave de Gemini no configurada).",
        });
        return;
      }

      const prompt = `Actúa como un especialista en seguridad alimentaria y conservación de productos.
Investiga en Google Search sobre la caducidad, vida útil recomendada y conservación para:
Producto: "${productName}"
Categoría: "${category || "alimento/general"}"

Por favor responde con información oficial y actualizada respondiendo:
1. TIEMPO ESTIMADO: ¿Cuánto dura normalmente una vez comprado o abierto? (en días, semanas o meses).
2. DÍAS SUGERIDOS: Un número entero estimado de días recomendados de consumo a partir de hoy (ej: 5, 7, 14, 30, 90, 180).
3. RECOMENDACIONES DE ALMACENAMIENTO: 2 a 3 pautas prácticas (temperatura, heladera, despensa, etc.).
4. SIGNOS DE DETERIORO: 2 a 3 señales visuales, olfativas o táctiles de que ya venció o no debe consumirse.
5. RESUMEN: Explicación breve y amigable en español.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const responseText = response.text || "";
      const metadata = response.candidates?.[0]?.groundingMetadata;
      const searchQueries = metadata?.webSearchQueries || [];
      const rawChunks = metadata?.groundingChunks || [];

      // Extract sources
      const sources = rawChunks
        .map((chunk: any) => {
          if (chunk.web) {
            return {
              title: chunk.web.title || "Fuente web",
              url: chunk.web.uri || "",
            };
          }
          return null;
        })
        .filter((s: any): s is { title: string; url: string } => s !== null && !!s.url);

      // Extract suggested days if mentioned in response
      let suggestedDays = 7;
      const daysMatch = responseText.match(/D[ÍI]AS SUGERIDOS:?\s*(\d+)/i) || 
                         responseText.match(/(\d+)\s*d[íi]as/i);
      if (daysMatch) {
        const parsed = parseInt(daysMatch[1], 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 730) {
          suggestedDays = parsed;
        }
      }

      res.json({
        productName,
        category,
        summary: responseText,
        estimatedShelfLife: `${suggestedDays} días aprox. según búsqueda`,
        suggestedDays,
        storageRecommendations: [
          "Mantener en condiciones óptimas recomendadas por el fabricante",
          "Revisar hermeticidad y fecha de lote antes de consumir",
        ],
        spoilageSigns: [
          "Olor agrio, rancio o desagradable",
          "Cambio inusual de color o formación de moho",
        ],
        groundingSources: sources.length > 0 ? sources : [
          {
            title: "Búsqueda en Google Search",
            url: `https://www.google.com/search?q=${encodeURIComponent("caducidad vida util " + productName)}`,
          },
        ],
        searchQueries,
        isFallback: false,
      });
    } catch (err: any) {
      console.warn("Gemini Search Grounding error, providing safety fallback:", err?.message || err);
      // Fallback gracefully without breaking the user experience
      const fallback = getFallbackShelfLife(productName, category);
      res.json({
        ...fallback,
        isFallback: true,
        errorDetail: err?.message || "Servicio de búsqueda temporalmente no disponible",
      });
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
