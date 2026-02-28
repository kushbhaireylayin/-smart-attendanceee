"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import { loadModels, detectFace, drawFaceBox } from "@/lib/face-recognition/faceApi";

interface WebcamCaptureProps {
  onFaceDetected: (descriptor: Float32Array, imageSrc: string) => void;
  onError?: (error: string) => void;
}

export default function WebcamCapture({ onFaceDetected, onError }: WebcamCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Load models on component mount
  useEffect(() => {
    const loadFaceModels = async () => {
      const loaded = await loadModels();
      setIsModelLoaded(loaded);
      if (!loaded && onError) {
        onError("Failed to load face recognition models");
      }
    };
    loadFaceModels();
  }, [onError]);

  // Draw face box on canvas for visual feedback
  useEffect(() => {
    let animationId: number;
    
    const drawBox = async () => {
      if (!webcamRef.current || !canvasRef.current || !isModelLoaded) return;
      
      const video = webcamRef.current.video;
      if (!video || video.readyState !== 4) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Clear previous drawings
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw face box if not capturing
      if (!isDetecting && !capturedImage) {
        await drawFaceBox(canvas, video);
      }
      
      animationId = requestAnimationFrame(drawBox);
    };
    
    drawBox();
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isModelLoaded, isDetecting, capturedImage]);

  const capture = useCallback(async () => {
    if (!webcamRef.current || !isModelLoaded || isDetecting) return;

    setIsDetecting(true);
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error("Failed to capture image");
      }

      const video = webcamRef.current.video;
      if (!video) {
        throw new Error("Video stream not available");
      }

      // Detect face and get descriptor
      const detection = await detectFace(video);
      
      if (detection && detection.descriptor) {
        setCapturedImage(imageSrc);
        onFaceDetected(detection.descriptor, imageSrc);
      } else {
        if (onError) onError("No face detected. Please ensure your face is clearly visible.");
      }
    } catch (error) {
      console.error("Capture error:", error);
      if (onError) onError("Error during face capture");
    } finally {
      setIsDetecting(false);
    }
  }, [webcamRef, isModelLoaded, isDetecting, onFaceDetected, onError]);

  const resetCapture = useCallback(() => {
    setCapturedImage(null);
  }, []);

  if (!isModelLoaded) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading face recognition models...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="relative rounded-lg overflow-hidden bg-black">
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full"
            videoConstraints={{
              width: 640,
              height: 480,
              facingMode: "user",
            }}
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full"
            width={640}
            height={480}
          />
        </div>
        
        {capturedImage && (
          <div className="absolute top-2 right-2">
            <img 
              src={capturedImage} 
              alt="Captured" 
              className="w-24 h-24 rounded-lg border-2 border-green-500 object-cover"
            />
          </div>
        )}
      </div>
      
      <div className="flex space-x-3">
        <button
          onClick={capture}
          disabled={isDetecting}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {isDetecting ? "Processing..." : "Capture Face"}
        </button>
        
        {capturedImage && (
          <button
            onClick={resetCapture}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
          >
            Retake
          </button>
        )}
      </div>
      
      <p className="text-sm text-gray-500 text-center">
        Position your face clearly in the center and ensure good lighting
      </p>
    </div>
  );
}