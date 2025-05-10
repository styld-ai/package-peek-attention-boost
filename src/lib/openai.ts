
import OpenAI from "openai";

// This function converts an image URL (data URL) to base64 format
export const imageUrlToBase64 = (imageUrl: string): string => {
  // Remove the data:image/jpeg;base64, part
  return imageUrl.split(',')[1];
};

// Create a prompt for package analysis with the new OpenAI client format
export const createPackageAnalysisPrompt = (imageBase64: string) => {
  return {
    model: "gpt-4o",
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: "You are a packaging design expert with expertise in consumer attention. Analyze packaging designs and provide specific, actionable feedback."
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Analyze this product packaging design. Provide your response in the following JSON format:\n" +
                  "{\n" +
                  "  \"attentionScore\": [number between 1-10],\n" +
                  "  \"suggestions\": [array of 3-5 specific suggestions as strings],\n" +
                  "  \"analysis\": [detailed analysis text]\n" +
                  "}\n\n" +
                  "Focus on color, contrast, visual hierarchy, branding elements, and overall composition."
          },
          {
            type: "input_image",
            image_url: `data:image/jpeg;base64,${imageBase64}`
          }
        ]
      }
    ]
  };
};

// Parse the OpenAI response
export const parseOpenAIResponse = (response: any): { attentionScore: number, suggestions: string[], analysis: string } => {
  try {
    // Get the response text
    const outputText = response.output_text;
    
    // Try to parse it as JSON
    try {
      // Look for JSON in the response
      const jsonMatch = outputText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonContent = JSON.parse(jsonMatch[0]);
        return {
          attentionScore: jsonContent.attentionScore || 5,
          suggestions: jsonContent.suggestions || [],
          analysis: jsonContent.analysis || outputText
        };
      }
    } catch (jsonError) {
      console.error("Failed to parse JSON from response", jsonError);
    }
    
    // If we couldn't parse JSON, use the older regex approach as a fallback
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
      suggestions,
      analysis: outputText
    };
  } catch (error) {
    console.error("Error parsing OpenAI response", error);
    return {
      attentionScore: 5,
      suggestions: ["Could not parse AI suggestions. Please try again."],
      analysis: "Error parsing response."
    };
  }
};
