import { toast } from "@/hooks/use-toast";
import {
  PackagingAnalysis,
  analyzePackageDesign,
  fileToBase64
} from "./openai";

/* ---------- Local types ------------------------------------------ */

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
}

interface AnalysisResult {
  imageId: string;
  originalSrc: string;
  heatmapSrc: string;
  attentionScore: number;
  colorImpact: number;
  readability: number;
  brandVisibility: number;
  suggestions: string[];
  aiAnalysis?: string;
}

/* ---------- Public function -------------------------------------- */

export const analyzeImages = async (
  images: UploadedImage[]
): Promise<AnalysisResult[]> => {
  toast({
    title: "Analyzing images",
    description: "Running AI vision model…"
  });

  return Promise.all(
    images.map(async (image) => {
      try {
        /* 1️⃣  generate fake heatmap locally */
        const heatmapSrc = await generateSimulatedHeatmap(image.preview);

        /* 2️⃣  real AI analysis */
        const base64 = await fileToBase64(image.file);
        let analysis: PackagingAnalysis;

        try {
          analysis = await analyzePackageDesign(base64);
        } catch (err) {
          console.error("AI analysis failed:", err);
          toast({
            title: "AI analysis failed",
            description: "Showing simulated scores instead.",
            variant: "destructive"
          });
          const fallbackScore =
            Math.round((4 + Math.random() * 5.5) * 10) / 10;
          analysis = {
            attentionScore: fallbackScore,
            colorImpact: fallbackScore,
            readability: fallbackScore,
            brandVisibility: fallbackScore,
            suggestions: generateSuggestions(fallbackScore),
            analysis: "Simulated analysis due to API error."
          };
        }

        /* 3️⃣  return combined result for UI */
        return {
          imageId: image.id,
          originalSrc: image.preview,
          heatmapSrc,
          attentionScore: analysis.attentionScore,
          colorImpact: analysis.colorImpact,
          readability: analysis.readability,
          brandVisibility: analysis.brandVisibility,
          suggestions: analysis.suggestions,
          aiAnalysis: analysis.analysis
        };
      } catch (err) {
        console.error("Unexpected analysis error:", err);
        throw err;
      }
    })
  );
};

/* ---------- Helpers ---------------------------------------------- */

/* Canvas-based pseudo heatmap */
const generateSimulatedHeatmap = (url: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (!ctx) return reject(new Error("No 2D context"));

      /* draw image first */
      ctx.drawImage(img, 0, 0);

      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;

          /* simple heuristic: center + top gets hotter */
          const d =
            Math.sqrt(
              ((x - cx) / (canvas.width / 2)) ** 2 +
                ((y - cy) / (canvas.height / 2)) ** 2
            ) || 0;
          const topBoost = 1 - Math.min(y / (canvas.height / 3), 1);
          let heat = (1 - d) * 0.6 + topBoost * 0.3 + Math.random() * 0.2;
          heat = Math.max(0, Math.min(1, heat));

          if (heat > 0.6) {
            /* red-yellow */
            data[i] = 255;
            data[i + 1] = ((heat - 0.6) * 255) / 0.4;
            data[i + 2] = 0;
          } else {
            /* blue-cyan-green */
            data[i] = 0;
            data[i + 1] = (heat * 255) / 0.6;
            data[i + 2] = ((0.6 - heat) * 255) / 0.6;
          }
          data[i + 3] = 128 * heat; // alpha
        }
      }

      ctx.putImageData(new ImageData(data, canvas.width, canvas.height), 0, 0);

      ctx.globalAlpha = 0.7;
      ctx.drawImage(img, 0, 0);

      resolve(canvas.toDataURL("image/jpeg"));
    };

    img.onerror = () =>
      reject(new Error("Failed to load image for heatmap generation"));

    img.src = url;
  });

/* Suggestion generator */
const generateSuggestions = (score: number): string[] => {
  const ideas = [
    "Increase contrast between product name and background.",
    "Use a larger font for key claims.",
    "Position the logo in the top third for maximum noticeability.",
    "Reduce visual clutter to focus attention on core message.",
    "Consider higher-saturation colors for stronger shelf pop.",
    "Add negative space around hero elements.",
    "Try a distinctive die-cut or silhouette.",
    "Apply the rule of thirds to layout.",
    "Add texture contrast to make elements pop.",
    "Re-evaluate hierarchy based on consumer priorities."
  ];
  const shuffled = ideas.sort(() => 0.5 - Math.random());
  const n = Math.max(2, Math.min(5, Math.round(10 - score)));
  return shuffled.slice(0, n);
};
