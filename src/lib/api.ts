import { toast } from "@/hooks/use-toast";
import { PackagingAnalysis, analyzePackageDesign, imageUrlToBase64 } from "./openai";

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

// In a real app, this would call a backend API
// For this MVP, we're simulating the backend processing and integrating with OpenAI
export const analyzeImages = async (images: UploadedImage[]): Promise<AnalysisResult[]> => {
  // First, show a loading toast
  toast({
    title: "Analyzing images",
    description: "Processing images with AI. This may take a moment...",
  });
  
  return Promise.all(images.map(async (image) => {
    try {
      // Generate a simulated heatmap by applying a color overlay
      const heatmapSrc = await generateSimulatedHeatmap(image.preview);
      
      // Get AI analysis from OpenAI
      const imageBase64 = imageUrlToBase64(image.preview);
      
      let analysis: PackagingAnalysis;
      
      try {
        // Use our new structured output function
        analysis = await analyzePackageDesign(imageBase64);
      } catch (error) {
        console.error("Error analyzing package design:", error);
        toast({
          title: "AI Analysis Failed",
          description: "Falling back to simulated analysis. API error occurred.",
          variant: "destructive"
        });
        
        // Fall back to simulated data
        const attentionScore = Math.round((4 + Math.random() * 5.5) * 10) / 10;
        analysis = {
          attentionScore,
          colorImpact: Math.round((4 + Math.random() * 5.5) * 10) / 10,
          readability: Math.round((4 + Math.random() * 5.5) * 10) / 10,
          brandVisibility: Math.round((4 + Math.random() * 5.5) * 10) / 10,
          suggestions: generateSuggestions(attentionScore),
          analysis: "Simulated AI analysis due to API error."
        };
      }
      
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
    } catch (error) {
      console.error("Error during analysis:", error);
      throw error;
    }
  }));
};

// Generate a simulated heatmap using Canvas
const generateSimulatedHeatmap = async (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Create heat effect
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Simulate attention areas with some randomness
      // but focus more on the center and top third (logo/brand area)
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const index = (y * canvas.width + x) * 4;
          
          // Distance from center
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const distanceFromCenter = Math.sqrt(
            Math.pow((x - centerX) / (canvas.width / 2), 2) + 
            Math.pow((y - centerY) / (canvas.height / 2), 2)
          );
          
          // Top third gets more attention (brand/logo usually there)
          const topFocus = 1 - Math.min(y / (canvas.height / 3), 1);
          
          // Some random variation
          const randomFactor = Math.random() * 0.2;
          
          // Combine factors: center proximity + top focus + randomness
          let heatFactor = (1 - distanceFromCenter) * 0.6 + topFocus * 0.3 + randomFactor;
          
          // Ensure it's in 0-1 range
          heatFactor = Math.max(0, Math.min(1, heatFactor));
          
          // Apply heat colors (blue to red gradient)
          if (heatFactor > 0.6) {
            // Red to yellow (hot)
            data[index] = 255;
            data[index + 1] = Math.floor((heatFactor - 0.6) * 255 / 0.4);
            data[index + 2] = 0;
          } else {
            // Blue to cyan to green (cold to warm)
            data[index] = 0;
            data[index + 1] = Math.floor(heatFactor * 255 / 0.6);
            data[index + 2] = Math.floor((0.6 - heatFactor) * 255 / 0.6);
          }
          
          // Apply semi-transparency to blend with original image
          data[index + 3] = Math.floor(128 * heatFactor);
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // Draw original image again but with lower opacity to blend
      ctx.globalAlpha = 0.7;
      ctx.drawImage(img, 0, 0);
      
      resolve(canvas.toDataURL('image/jpeg'));
    };
    
    img.onerror = () => {
      reject(new Error("Error loading image for heatmap generation"));
    };
    
    img.src = imageUrl;
  });
};

// Generate suggestions based on the attention score
const generateSuggestions = (score: number): string[] => {
  const allSuggestions = [
    "Increase contrast between the product name and background to improve readability",
    "Consider using larger font for key product claims",
    "Position your logo in the top third of the package for maximum attention",
    "Use visual cues like arrows or icons to direct attention to key features",
    "Consider a brighter color palette to stand out on shelves",
    "Reduce visual clutter to focus attention on your core message",
    "Increase negative space around key messaging",
    "Add a visual border around important information",
    "Implement the rule of thirds in your package design layout",
    "Use texture contrast to make key elements pop",
    "Consider a distinctive silhouette for better shelf recognition",
    "Increase color saturation for more visual impact",
    "Add motion cues (lines, shapes) that lead to your key messaging",
    "Reconsider the hierarchy of information based on customer priorities",
    "Ensure your product usage is immediately clear from the front panel",
    "Test alternative background colors that provide more contrast"
  ];
  
  // Shuffle array
  const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
  
  // Number of suggestions based on score (lower score = more suggestions)
  const numSuggestions = Math.max(2, Math.min(5, Math.round(10 - score)));
  
  return shuffled.slice(0, numSuggestions);
};
