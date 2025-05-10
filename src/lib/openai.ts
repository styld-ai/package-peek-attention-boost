
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

// Create the OpenAI client with the API key
// Hardcoded API key from api.ts
const OPENAI_API_KEY = "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";

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

// Define the schema for the packaging analysis output
export const PackagingAnalysisSchema = z.object({
  attentionScore: z.number().min(1).max(10).describe("Overall attention score for the packaging design (1-10)"),
  colorImpact: z.number().min(1).max(10).describe("Impact of color choices on attention (1-10)"),
  readability: z.number().min(1).max(10).describe("Readability of text on packaging (1-10)"),
  brandVisibility: z.number().min(1).max(10).describe("How visible and recognizable the brand is (1-10)"),
  suggestions: z.array(z.string()).describe("Specific suggestions to improve packaging design"),
  analysis: z.string().describe("Detailed analysis of the packaging design")
});

export type PackagingAnalysis = z.infer<typeof PackagingAnalysisSchema>;

// This function converts an image URL (data URL) to base64 format
export const imageUrlToBase64 = (imageUrl: string): string => {
  // Remove the data:image/jpeg;base64, part
  return imageUrl.split(',')[1];
};

// Create a packaging analysis request using the new responses.parse API
export const analyzePackageDesign = async (imageBase64: string): Promise<PackagingAnalysis> => {
  try {
    const response = await openai.responses.parse({
      model: "gpt-4o",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You are a packaging design expert with expertise in consumer attention. Analyze packaging designs and provide specific, actionable feedback with numeric scores."
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Analyze this product packaging design. Focus on color, contrast, visual hierarchy, branding elements, and overall composition."
            },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${imageBase64}`
            }
          ]
        }
      ],
      text: {
        format: zodTextFormat(PackagingAnalysisSchema, "packageAnalysis")
      }
    });

    return response.output_parsed;
  } catch (error) {
    console.error("Error in OpenAI response parsing:", error);
    
    // Return fallback data in the same structure
    return {
      attentionScore: 5,
      colorImpact: 5,
      readability: 5,
      brandVisibility: 5,
      suggestions: ["Could not analyze packaging. Please try again."],
      analysis: "Error parsing response from AI service."
    };
  }
};

// Legacy parse function for compatibility - we'll update code to use the new function
export const parseOpenAIResponse = (response: any): PackagingAnalysis => {
  try {
    // If the response already has the expected structure, return it
    if (response && typeof response === 'object' && 'attentionScore' in response) {
      return response as PackagingAnalysis;
    }
    
    // Get the response text - fallback to output_text for the new format
    const outputText = response.output_text || response.choices?.[0]?.message?.content || "";
    
    // Try to parse it as JSON
    try {
      // Look for JSON in the response
      const jsonMatch = outputText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonContent = JSON.parse(jsonMatch[0]);
        return {
          attentionScore: jsonContent.attentionScore || 5,
          colorImpact: jsonContent.colorImpact || 5,
          readability: jsonContent.readability || 5,
          brandVisibility: jsonContent.brandVisibility || 5,
          suggestions: jsonContent.suggestions || [],
          analysis: jsonContent.analysis || outputText
        };
      }
    } catch (jsonError) {
      console.error("Failed to parse JSON from response", jsonError);
    }
    
    // Fallback to regex if JSON parsing fails
    const scoreRegex = /(\d+(\.\d+)?)\s*\/\s*10|attention score:?\s*(\d+(\.\d+)?)|score:?\s*(\d+(\.\d+)?)/i;
    const scoreMatch = outputText.match(scoreRegex);
    let attentionScore = 5; // Default score
    
    if (scoreMatch) {
      // Check which capturing group has the score
      const extractedScore = scoreMatch[1] || scoreMatch[3] || scoreMatch[5];
      attentionScore = parseFloat(extractedScore);
      
      // Ensure the score is within bounds
      attentionScore = Math.max(1, Math.min(10, attentionScore));
    }
    
    // Extract suggestions
    const suggestionRegex = /(?:suggestions?:|improvements?:|to improve:|could improve:|enhance:|recommendations?:).*?(?:\n\s*(?:[-•*]\s*|\d+\.\s*).*)+/gis;
    const suggestionMatch = outputText.match(suggestionRegex);
    
    let suggestions: string[] = [];
    
    if (suggestionMatch) {
      // Extract individual bullet points or numbered items
      const itemRegex = /(?:[-•*]\s*|\d+\.\s*)(.*?)(?=\n\s*(?:[-•*]|\d+\.)|$)/gs;
      
      suggestionMatch.forEach(block => {
        let itemMatch;
        while ((itemMatch = itemRegex.exec(block)) !== null) {
          const suggestion = itemMatch[1].trim();
          if (suggestion && !suggestions.includes(suggestion)) {
            suggestions.push(suggestion);
          }
        }
      });
    }
    
    // If we couldn't extract suggestions, split the text to get some
    if (suggestions.length === 0) {
      const lines = outputText.split('\n').filter(line => 
        line.trim().length > 20 && 
        !line.toLowerCase().includes('score') &&
        !line.toLowerCase().includes('analysis')
      );
      suggestions = lines.slice(0, 5);
    }
    
    // Limit to 5 suggestions
    suggestions = suggestions.slice(0, 5);
    
    return {
      attentionScore,
      colorImpact: 5, // Default values for new fields
      readability: 5,
      brandVisibility: 5,
      suggestions,
      analysis: outputText
    };
  } catch (error) {
    console.error("Error parsing OpenAI response", error);
    return {
      attentionScore: 5,
      colorImpact: 5,
      readability: 5,
      brandVisibility: 5,
      suggestions: ["Could not parse AI suggestions. Please try again."],
      analysis: "Error parsing response."
    };
  }
};
