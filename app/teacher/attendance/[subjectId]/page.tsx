// Face detection loop
useEffect(() => {
  if (!cameraActive || !modelsLoaded || !webcamRef.current || !canvasRef.current) return;

  const interval = setInterval(async () => {
    const video = webcamRef.current?.video;
    if (!video || video.readyState !== 4) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      // Detect faces with error handling
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      // Clear canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Only draw if we have valid detections
        if (detections && detections.length > 0) {
          const displaySize = { width: video.width, height: video.height };
          faceapi.matchDimensions(canvas, displaySize);
          
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          faceapi.draw.drawDetections(canvas, resizedDetections);
        }
      }

      // Match faces with students (only if we have valid detections)
      if (detections && detections.length > 0) {
        for (const detection of detections) {
          // Skip if detection is invalid
          if (!detection || !detection.descriptor) continue;

          const match = findBestMatch(
            detection.descriptor,
            students.map(s => ({
              userId: s.id,
              descriptor: s.faceDescriptor ? arrayToDescriptor(s.faceDescriptor) : null
            })).filter(s => s.descriptor !== null), // Remove students without face data
            0.5
          );

          if (match.userId && !markedAttendance.has(match.userId)) {
            // Auto-mark attendance
            await markAttendance(match.userId, match.confidence);
          }
        }
      }
    } catch (error) {
      console.error("Face detection error:", error);
      // Silently fail - don't crash the app
    }
  }, 2000); // Check every 2 seconds

  return () => clearInterval(interval);
}, [cameraActive, modelsLoaded, students, markedAttendance]);