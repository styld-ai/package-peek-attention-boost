import OpenAI from "openai";
import { zodTextFormat } from "openai/zod-response";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* 1.  OpenAI client                                                  */
/* ------------------------------------------------------------------ */

// ⚠️ Hard-coded for LOCAL DEMO ONLY.
//    Do NOT commit this key or ship it in production builds.
const OPENAI_API_KEY =
  "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";

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

/* ------------------------------------------------------------------ */
/* 2.  Zod schema for structured output                               */
/* ------------------------------------------------------------------ */

export const PackagingAnalysisSchema = z.object({
  attentionScore:  z.number().min(1).max(10)
                   .describe("Overall attention score (1-10)"),
  colorImpact:     z.number().min(1).max(10)
                   .describe("Impact of color choices (1-10)"),
  readability:     z.number().min(1).max(10)
                   .describe("Readability of on-pack text (1-10)"),
  brandVisibility: z.number().min(1).max(10)
                   .describe("Brand/logo visibility (1-10)"),
  suggestions:     z.array(z.string())
                   .describe("Actionable design suggestions"),
  analysis:        z.string()
                   .describe("Narrative analysis of the packaging")
});

export type PackagingAnalysis = z.infer<typeof PackagingAnalysisSchema>;

/* ------------------------------------------------------------------ */
/* 3.  Utility – File ➜ base-64 string                                */
/* ------------------------------------------------------------------ */

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1]; // strip prefix
      res(base64);
    };
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });

/* ------------------------------------------------------------------ */
/* 4.  Vision request with structured output                          */
/* ------------------------------------------------------------------ */

export const analyzePackageDesign = async (
  imageBase64: string
): Promise<PackagingAnalysis> => {
  try {
    const response = await openai.responses.parse({
      model: "gpt-4o",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are a packaging-design expert. Rate and critique packages " +
                "with numeric scores and specific suggestions."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Analyze this package (color, hierarchy, branding, composition)."
            },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${imageBase64}`
            }
          ]
        }
      ],
      text: {
        format: zodTextFormat(PackagingAnalysisSchema, "packageAnalysis"),
        strict: true
      }
    });

    return response.output_parsed;
  } catch (err) {
    console.error("OpenAI vision error:", err);
    /* graceful fallback so UI still renders */
    return {
      attentionScore: 5,
      colorImpact: 5,
      readability: 5,
      brandVisibility: 5,
      suggestions: ["AI analysis failed – returned simulated scores."],
      analysis: "Could not retrieve structured output from the model."
    };
  }
};
