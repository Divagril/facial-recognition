import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import styles from './Camera.module.css';

export default function CameraComponent() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [loadingModels, setLoadingModels] = useState(true);
  const [detections, setDetections] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    async function loadModels() {
      const MODEL_URL = "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      setLoadingModels(false);
      startVideo();
    }

    loadModels();
  }, []);

  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Error accediendo a la cámara:", err);
      });
  };

  const handleVideoOnPlay = () => {
    const interval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current || loadingModels) return;

      const canvas = canvasRef.current;
      const displaySize = {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      };

      faceapi.matchDimensions(canvas, displaySize);

      const detections = await faceapi
        .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      const resized = faceapi.resizeResults(detections, displaySize);
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpiar antes de dibujar

      faceapi.draw.drawDetections(canvas, resized);
      faceapi.draw.drawFaceLandmarks(canvas, resized);
    }, 300); // <== Más suave que 100ms

    return () => clearInterval(interval); // Limpia el intervalo si el componente se desmonta
  };

  const analyzeFace = async () => {
    if (!videoRef.current || !canvasRef.current || loadingModels) return;

    setIsAnalyzing(true);

    const detections = await faceapi
      .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withAgeAndGender()
      .withFaceExpressions();

    setDetections(detections);

    const canvas = canvasRef.current;
    const displaySize = {
      width: videoRef.current.videoWidth,
      height: videoRef.current.videoHeight,
    };

    faceapi.matchDimensions(canvas, displaySize);
    const resized = faceapi.resizeResults(detections, displaySize);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpiar para nuevo análisis

    faceapi.draw.drawDetections(canvas, resized);
    faceapi.draw.drawFaceLandmarks(canvas, resized);
    faceapi.draw.drawFaceExpressions(canvas, resized);

    // Dibujar edad (solo durante el análisis)
    resized.forEach((detection) => {
      const { age, detection: box } = detection;
      const { x, y } = box.box;
      const label = `Edad: ${age.toFixed(0)}`;
      new faceapi.draw.DrawTextField([label], { x, y: y - 10 }).draw(canvas);
    });

    setIsAnalyzing(false);
  };

  return (
    <div>
      <h2 className={styles.title}>Reconocimiento Facial</h2>
        <p className={styles.description}>Análisis de reconocimiento facial con cámara en tiempo real</p>

        <section className={styles.section}>
            {loadingModels ? (
                <p>Cargando modelos...</p>
            ) : (
                <>
                <div className={styles.containerCamera}>
                    <div className={styles.subtitleContainer}>
                        <h3>Cámara</h3>
                    </div>
                    <video
                    ref={videoRef}
                    onPlay={handleVideoOnPlay}
                    autoPlay
                    muted
                    className={styles.video}
                    />
                    <canvas
                    ref={canvasRef}
                    width="640"
                    height="480"
                    style={{ display: 'none' }}
                    />
                    <button
                        onClick={analyzeFace}
                        disabled={isAnalyzing}
                        className={styles.buttonAnalizar}
                    >
                        {isAnalyzing ? "Analizando..." : "Analizar rostro"}
                    </button>
                </div>          
                </>
            )}
            <div className={styles.containerCamera}>
                <div className={styles.subtitleContainer}>
                    <h3>Datos del reconocimiento</h3>
                </div>
                {detections.length > 0 && (
                <div style={{ marginTop: "1em", textAlign: "left" }}>
                    {detections.map((det, i) => (
                        <div key={i}>
                        <p>Edad estimada: {det.age.toFixed(0)}</p>
                        <p>Emociones:</p>
                        <div>
                            {Object.entries(det.expressions)
                            .sort((a, b) => b[1] - a[1])
                            .map(([emotion, score]) => (
                                <div key={emotion} className={styles.item}>
                                    <div style={{ backgroundColor: 'rgb(37, 99, 235)', width: `${(score * 100).toFixed(1)}%`}} className={styles.i}>
                                        <p>{emotion}: {(score * 100).toFixed(1)}%</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <hr />
                        </div>
                    ))}
                </div>
            )}
            </div>
        </section>
    </div>
  );
}
