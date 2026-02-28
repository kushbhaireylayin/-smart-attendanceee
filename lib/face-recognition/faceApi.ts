import * as faceapi from 'face-api.js';

// Load all required models
export const loadModels = async () => {
  const MODEL_URL = '/models';
  
  try {
    console.log('Loading face detection models...');
    
    await faceapi.loadTinyFaceDetectorModel(MODEL_URL);
    await faceapi.loadFaceLandmarkModel(MODEL_URL);
    await faceapi.loadFaceRecognitionModel(MODEL_URL);
    
    console.log('✅ Face recognition models loaded successfully');
    return true;
  } catch (error) {
    console.error('❌ Error loading models:', error);
    return false;
  }
};

// Detect a single face from video element
export const detectFace = async (video: HTMLVideoElement) => {
  try {
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    return detection;
  } catch (error) {
    console.error('❌ Error detecting face:', error);
    return null;
  }
};

// Get face descriptor from image/video element
export const getFaceDescriptor = async (input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) => {
  try {
    const detection = await faceapi
      .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    return detection?.descriptor || null;
  } catch (error) {
    console.error('❌ Error getting face descriptor:', error);
    return null;
  }
};

// Compare two face descriptors (returns distance - lower is better match)
export const compareFaces = (descriptor1: Float32Array, descriptor2: Float32Array): number => {
  return faceapi.euclideanDistance(descriptor1, descriptor2);
};

// Find best match among multiple descriptors
export const findBestMatch = (
  targetDescriptor: Float32Array,
  faceDataArray: { userId: string; descriptor: Float32Array }[],
  threshold: number = 0.6
): { userId: string | null; distance: number; confidence: number } => {
  let bestMatch: string | null = null;
  let lowestDistance = threshold;

  for (const faceData of faceDataArray) {
    const distance = compareFaces(targetDescriptor, faceData.descriptor);
    
    if (distance < lowestDistance) {
      lowestDistance = distance;
      bestMatch = faceData.userId;
    }
  }

  // Convert distance to confidence score (0-1)
  const confidence = bestMatch ? 1 - lowestDistance / threshold : 0;

  return {
    userId: bestMatch,
    distance: lowestDistance,
    confidence: Math.min(confidence, 1)
  };
};

// Convert Float32Array to regular array for JSON storage
export const descriptorToArray = (descriptor: Float32Array): number[] => {
  return Array.from(descriptor);
};

// Convert array back to Float32Array for comparison
export const arrayToDescriptor = (array: number[]): Float32Array => {
  return new Float32Array(array);
};

// Draw face detection box on canvas (optional - for debugging)
export const drawFaceBox = async (
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement
) => {
  try {
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    if (detection) {
      const displaySize = { width: video.width, height: video.height };
      faceapi.matchDimensions(canvas, displaySize);
      
      const resizedDetection = faceapi.resizeResults(detection, displaySize);
      faceapi.draw.drawDetections(canvas, [resizedDetection]);
      faceapi.draw.drawFaceLandmarks(canvas, [resizedDetection]);
    }
  } catch (error) {
    // Silently fail for drawing - not critical
  }
};