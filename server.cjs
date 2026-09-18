var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var aiClient = null;
function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return null;
  }
  if (!aiClient) {
    aiClient = new import_genai.GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
function getFallbackShelfLife(productName, category) {
  const lowerName = productName.toLowerCase();
  const lowerCat = (category || "").toLowerCase();
  let days = 7;
  let estimated = "3 - 7 d\xEDas en refrigeraci\xF3n";
  let storage = ["Mantener refrigerado entre 1\xB0C y 4\xB0C", "Cerrar herm\xE9ticamente tras abrir"];
  let spoilage = ["Cambio notable de olor agrio", "Presencia de moho visible", "Cambio de textura o color"];
  if (lowerName.includes("leche") || lowerCat.includes("l\xE1cteo") || lowerName.includes("yogur")) {
    days = 7;
    estimated = "5 - 7 d\xEDas una vez abierto en heladera";
    storage = ["Guardar en el cuerpo principal de la heladera, no en la puerta", "Mantener entre 2\xB0C y 4\xB0C"];
    spoilage = ["Olor agrio", "Cuajado o grumos", "Sabor \xE1cido"];
  } else if (lowerName.includes("queso")) {
    days = 14;
    estimated = "10 - 15 d\xEDas en heladera";
    storage = ["Envolver en papel film o guardar en t\xE1per herm\xE9tico", "Refrigerar a 4\xB0C"];
    spoilage = ["Manchas de moho anormales", "Olor amoniacal fuerte"];
  } else if (lowerName.includes("carne") || lowerName.includes("pollo") || lowerCat.includes("carnicer\xEDa")) {
    days = 3;
    estimated = "2 - 3 d\xEDas fresco en heladera (o hasta 6 meses congelado)";
    storage = ["Guardar en el estante inferior m\xE1s fr\xEDo", "Si no se consume en 48h, congelar a -18\xB0C"];
    spoilage = ["Color gris\xE1ceo o verdoso", "Textura pegajosa o viscosa", "Olor f\xE9tido o rancio"];
  } else if (lowerName.includes("huevo")) {
    days = 21;
    estimated = "21 - 28 d\xEDas en heladera";
    storage = ["Conservar en su cart\xF3n original en heladera", "No lavar antes de guardar"];
    spoilage = ["Flota completamente en un vaso de agua", "Clara acuosa con mal olor"];
  } else if (lowerCat.includes("medicamento") || lowerName.includes("paracetamol") || lowerName.includes("ibuprofeno")) {
    days = 180;
    estimated = "6 meses a 1 a\xF1o (seg\xFAn lote y precinto)";
    storage = ["Lugar fresco y seco, lejos de la luz solar directa", "No guardar en el ba\xF1o por la humedad"];
    spoilage = ["Cambio de coloraci\xF3n", "Sedimento inusual en jarabes", "Fecha de lote vencida"];
  } else if (lowerCat.includes("almac\xE9n") || lowerCat.includes("despensa") || lowerName.includes("arroz") || lowerName.includes("fideos") || lowerName.includes("lata")) {
    days = 90;
    estimated = "3 a 6 meses en despensa";
    storage = ["Almacenar en lugar fresco, seco y oscuro", "Revisar que el envase o lata no est\xE9 abollado"];
    spoilage = ["Presencia de gorgojos o insectos", "Lata hinchada o con \xF3xido", "Olor rancio"];
  }
  return {
    summary: `Recomendaci\xF3n estimada de conservaci\xF3n para "${productName}". Para alimentos frescos, consuma preferentemente dentro de este per\xEDodo.`,
    estimatedShelfLife: estimated,
    suggestedDays: days,
    storageRecommendations: storage,
    spoilageSigns: spoilage,
    groundingSources: [
      {
        title: "Gu\xEDa de Inocuidad y Conservaci\xF3n de Alimentos",
        url: "https://www.fda.gov/food"
      }
    ],
    searchQueries: [`caducidad conservacion ${productName}`]
  };
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.post("/api/gemini/search-shelf-life", async (req, res) => {
    const { productName, category } = req.body || {};
    if (!productName || typeof productName !== "string") {
      res.status(400).json({ error: "productName is required" });
      return;
    }
    try {
      const ai = getGeminiClient();
      if (!ai) {
        const fallback = getFallbackShelfLife(productName, category);
        res.json({
          ...fallback,
          isFallback: true,
          note: "Calculado con gu\xEDas de conservaci\xF3n est\xE1ndar (clave de Gemini no configurada)."
        });
        return;
      }
      const prompt = `Act\xFAa como un especialista en seguridad alimentaria y conservaci\xF3n de productos.
Investiga en Google Search sobre la caducidad, vida \xFAtil recomendada y conservaci\xF3n para:
Producto: "${productName}"
Categor\xEDa: "${category || "alimento/general"}"

Por favor responde con informaci\xF3n oficial y actualizada respondiendo:
1. TIEMPO ESTIMADO: \xBFCu\xE1nto dura normalmente una vez comprado o abierto? (en d\xEDas, semanas o meses).
2. D\xCDAS SUGERIDOS: Un n\xFAmero entero estimado de d\xEDas recomendados de consumo a partir de hoy (ej: 5, 7, 14, 30, 90, 180).
3. RECOMENDACIONES DE ALMACENAMIENTO: 2 a 3 pautas pr\xE1cticas (temperatura, heladera, despensa, etc.).
4. SIGNOS DE DETERIORO: 2 a 3 se\xF1ales visuales, olfativas o t\xE1ctiles de que ya venci\xF3 o no debe consumirse.
5. RESUMEN: Explicaci\xF3n breve y amigable en espa\xF1ol.`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      const responseText = response.text || "";
      const metadata = response.candidates?.[0]?.groundingMetadata;
      const searchQueries = metadata?.webSearchQueries || [];
      const rawChunks = metadata?.groundingChunks || [];
      const sources = rawChunks.map((chunk) => {
        if (chunk.web) {
          return {
            title: chunk.web.title || "Fuente web",
            url: chunk.web.uri || ""
          };
        }
        return null;
      }).filter((s) => s !== null && !!s.url);
      let suggestedDays = 7;
      const daysMatch = responseText.match(/D[ÍI]AS SUGERIDOS:?\s*(\d+)/i) || responseText.match(/(\d+)\s*d[íi]as/i);
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
        estimatedShelfLife: `${suggestedDays} d\xEDas aprox. seg\xFAn b\xFAsqueda`,
        suggestedDays,
        storageRecommendations: [
          "Mantener en condiciones \xF3ptimas recomendadas por el fabricante",
          "Revisar hermeticidad y fecha de lote antes de consumir"
        ],
        spoilageSigns: [
          "Olor agrio, rancio o desagradable",
          "Cambio inusual de color o formaci\xF3n de moho"
        ],
        groundingSources: sources.length > 0 ? sources : [
          {
            title: "B\xFAsqueda en Google Search",
            url: `https://www.google.com/search?q=${encodeURIComponent("caducidad vida util " + productName)}`
          }
        ],
        searchQueries,
        isFallback: false
      });
    } catch (err) {
      console.warn("Gemini Search Grounding error, providing safety fallback:", err?.message || err);
      const fallback = getFallbackShelfLife(productName, category);
      res.json({
        ...fallback,
        isFallback: true,
        errorDetail: err?.message || "Servicio de b\xFAsqueda temporalmente no disponible"
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
