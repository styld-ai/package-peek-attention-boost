
import { toast } from "@/hooks/use-toast";

// This function converts an image URL (data URL) to base64 format suitable for the OpenAI API
export const imageUrlToBase64 = (imageUrl: string): string => {
  // Remove the data:image/jpeg;base64, part
  return imageUrl.split(',')[1];
};

// Craft a prompt for package analysis
export const createPackageAnalysisPrompt = (imageBase64: string): any => {
  return {
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a packaging design expert with expertise in consumer attention. Analyze packaging designs and provide specific, actionable feedback on improving attention-grabbing elements. Focus on color, contrast, visual hierarchy, branding elements, and overall composition."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this product packaging design. Provide an attention score from 1-10, with 10 being excellent. Then, give me 3-5 specific suggestions to improve consumer attention on critical elements. Be specific and actionable."
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`
            }
          }
        ]
      }
    ],
    max_tokens: 800
  };
};

// Parse the OpenAI response to extract the attention score and suggestions
export const parseOpenAIResponse = (response: any): { attentionScore: number, suggestions: string[] } => {
  try {
    const content = response.choices[0].message.content;
    
    // Extract the attention score (looking for a number between 1-10)
    const scoreRegex = /(\d+(\.\d+)?)\s*\/\s*10|attention score:?\s*(\d+(\.\d+)?)|score:?\s*(\d+(\.\d+)?)/i;
    const scoreMatch = content.match(scoreRegex);
    let attentionScore = 5; // Default score if we can't find one
    
    if (scoreMatch) {
      // Check which capturing group has the score
      const extractedScore = scoreMatch[1] || scoreMatch[3] || scoreMatch[5];
      attentionScore = parseFloat(extractedScore);
      
      // Ensure the score is within bounds
      attentionScore = Math.max(1, Math.min(10, attentionScore));
    }
    
    // Extract suggestions
    // Look for bullet points, numbered lists, or paragraphs following suggestion keywords
    const suggestionRegex = /(?:suggestions?:|improvements?:|to improve:|could improve:|enhance:|recommendations?:).*?(?:\n\s*(?:[-•*]\s*|\d+\.\s*).*)+/gis;
    const suggestionMatch = content.match(suggestionRegex);
    
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
    
    // If we couldn't extract suggestions using regex, just split by lines and take a few
    if (suggestions.length === 0) {
      const lines = content.split('\n').filter(line => 
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
      suggestions
    };
  } catch (error) {
    console.error("Error parsing OpenAI response", error);
    return {
      attentionScore: 5,
      suggestions: ["Could not parse AI suggestions. Please try again."]
    };
  }
};

