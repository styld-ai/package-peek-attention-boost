import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader } from "lucide-react";

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
}

const Index = () => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();
  
  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    
    // Check if adding these files would exceed the limit of 3
    if (uploadedImages.length + files.length > 3) {
      toast({
        title: "Upload limit exceeded",
        description: "You can upload a maximum of 3 images",
        variant: "destructive"
      });
      return;
    }
    
    const newImages: UploadedImage[] = [];
    
    Array.from(files).forEach(file => {
      // Only accept PNG and JPG
      if (!file.type.match('image/jpeg|image/png')) {
        toast({
          title: "Invalid file type",
          description: "Only JPG and PNG files are allowed",
          variant: "destructive"
        });
        return;
      }
      
      const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      newImages.push({
        id,
        file,
        preview: URL.createObjectURL(file)
      });
    });
    
    setUploadedImages(prev => [...prev, ...newImages]);
  };
  
  const removeImage = (id: string) => {
    setUploadedImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      return filtered;
    });
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleImageUpload(e.dataTransfer.files);
  };
  
  const handleSubmit = async () => {
    if (uploadedImages.length === 0) {
      toast({
        title: "No images selected",
        description: "Please upload at least one image",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Navigate to results page with the uploaded images data
      navigate('/results', { state: { uploadedImages } });
    } catch (error) {
      console.error("Error submitting images:", error);
      toast({
        title: "Submission error",
        description: "There was a problem submitting your images. Please try again.",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };

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
              <CardTitle>Package Analysis</CardTitle>
              <CardDescription>
                Upload 1-3 images of CPG packages to analyze attention and get design suggestions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">
                    Drag and drop your package images here, or
                  </p>
                  <div>
                    <label htmlFor="file-upload" className="cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500">
                      <span>Select files</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept="image/png,image/jpeg"
                        multiple
                        onChange={(e) => handleImageUpload(e.target.files)}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG up to 10MB (max 3 images)
                  </p>
                </div>
              </div>
              
              {uploadedImages.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900">Uploaded Images</h3>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {uploadedImages.map((image) => (
                      <div key={image.id} className="relative">
                        <img
                          src={image.preview}
                          alt="Preview"
                          className="h-40 w-full object-cover rounded-md"
                        />
                        <button
                          onClick={() => removeImage(image.id)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSubmit}
                disabled={uploadedImages.length === 0 || isSubmitting}
                className="ml-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Analyze Packages"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
