
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader, ArrowUp, CircleCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { analyzeImages } from '@/lib/api';

interface AnalysisResult {
  imageId: string;
  originalSrc: string;
  heatmapSrc: string;
  attentionScore: number;
  suggestions: string[];
}

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("original");
  
  // Get the uploaded images from the location state
  const uploadedImages = location.state?.uploadedImages || [];
  
  useEffect(() => {
    if (!uploadedImages.length) {
      navigate('/');
      toast({
        title: "No images to analyze",
        description: "Please upload images first",
        variant: "destructive"
      });
      return;
    }
    
    const performAnalysis = async () => {
      try {
        setLoading(true);
        const analysisResults = await analyzeImages(uploadedImages);
        setResults(analysisResults);
        setLoading(false);
      } catch (error) {
        console.error("Error during analysis:", error);
        toast({
          title: "Analysis failed",
          description: "There was an error processing your images. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
      }
    };
    
    performAnalysis();
  }, [uploadedImages, navigate]);
  
  const handleNewAnalysis = () => {
    navigate('/');
  };
  
  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mb-4">
        <Loader className="h-12 w-12 text-primary animate-spin" />
      </div>
      <h3 className="text-xl font-medium">Analyzing your packaging...</h3>
      <p className="text-gray-500 mt-2">This may take a minute. We're running our attention model to identify key areas.</p>
    </div>
  );
  
  const renderResults = () => (
    <div className="space-y-8">
      <Tabs defaultValue="original" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="original">Original Images</TabsTrigger>
          <TabsTrigger value="heatmap">Attention Heatmaps</TabsTrigger>
        </TabsList>
        
        <TabsContent value="original" className="space-y-6">
          {results.map((result) => (
            <Card key={result.imageId} className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CircleCheck className="mr-2 h-5 w-5 text-green-500" />
                  Packaging Analysis
                </CardTitle>
                <CardDescription>
                  Attention Score: <span className="font-bold text-lg">{result.attentionScore}/10</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <img 
                    src={result.originalSrc} 
                    alt="Original packaging" 
                    className="w-full rounded-md object-contain max-h-80"
                  />
                </div>
                <div className="mt-4">
                  <h4 className="font-medium text-lg mb-2">Design Suggestions</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {result.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-gray-700">{suggestion}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="heatmap" className="space-y-6">
          {results.map((result) => (
            <Card key={`heatmap-${result.imageId}`} className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CircleCheck className="mr-2 h-5 w-5 text-green-500" />
                  Attention Heatmap
                </CardTitle>
                <CardDescription>
                  Areas in red receive more attention, blue areas receive less
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <img 
                    src={result.heatmapSrc} 
                    alt="Attention heatmap" 
                    className="w-full rounded-md object-contain max-h-80"
                  />
                </div>
                <div className="mt-4 bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-700">
                    This heatmap shows which areas of your packaging attract the most visual attention. 
                    Bright areas indicate high attention, while darker areas receive less focus.
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-center">
        <Button onClick={handleNewAnalysis} className="flex items-center">
          <ArrowUp className="mr-2 h-4 w-4" />
          Analyze New Images
        </Button>
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Stash Packaging-Attention MVP</h1>
        </div>
      </header>
      
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Card>
            <CardHeader>
              <CardTitle>Analysis Results</CardTitle>
              <CardDescription>
                Review how your packaging performs on visual attention metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? renderLoadingState() : renderResults()}
            </CardContent>
            <CardFooter>
              {!loading && (
                <Button variant="outline" onClick={handleNewAnalysis} className="ml-auto">
                  Analyze Different Images
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Results;
