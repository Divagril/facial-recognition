// INICIO DEL ARCHIVO COMPLETO Y FINAL: src/components/Camera/index.jsx

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import styles from './Camera.module.css';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import InfoCard from './InfoCard';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const emotionTranslations = { neutral: 'Neutral', happy: 'Feliz', sad: 'Triste', angry: 'Enojado', fearful: 'Asustado', disgusted: 'Disgustado', surprised: 'Sorprendido' };

const getAverageRgb = async (imageSrc) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height).data;
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      const count = data.length / 4;
      resolve({ r: r / count, g: g / count, b: b / count });
    };
    img.onerror = (error) => reject(error);
  });
};

// ----------------------------------------------------------------------
//AJUSTAAQUIII: Definición de la URL del Backend de Render
const RENDER_API_BASE_URL = 'https://facial-recognition-app-frontend.onrender.com/'; 
// ----------------------------------------------------------------------

export default function CameraComponent() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameId = useRef();
  const analysisTimerId = useRef();
  const countdownIntervalId = useRef();

  const emotionHistory = useRef([]);
  const ageHistory = useRef([]);
  const genderHistory = useRef([]);
  const recognitionHistory = useRef([]);
  const skinToneHistory = useRef([]);
  const faceMatcher = useRef(null);

  const [loadingModels, setLoadingModels] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Despertando a los robots de la IA... 👾");
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [countdown, setCountdown] = useState(20);
  const [finalAnalysisReport, setFinalAnalysisReport] = useState(null);
  const [referenceSkinTones, setReferenceSkinTones] = useState(null);

  const createFaceMatcher = async () => {
    try {
      const knownFaces = [
        { label: 'Flor', image: 'flor.png' },
        { label: 'Hombre de Prueba', image: 'hombre.png' },
        { label: 'Marina', image: 'marina.png' },
        { label: 'Mujer de Prueba', image: 'mujer.png' }
      ];

      setLoadingMessage("Aprendiendo rostros de referencia...");

      const labeledFaceDescriptors = await Promise.all(
        knownFaces.map(async (face) => {
          try {
            const img = await faceapi.fetchImage(`/known_faces/${face.image}`);
            const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
            if (!detections) {
              console.warn(`No se pudo detectar un rostro en la imagen de referencia: ${face.image}`);
              return null;
            }
            return new faceapi.LabeledFaceDescriptors(face.label, [detections.descriptor]);
          } catch (e) {
            console.error(`Error al cargar o procesar la imagen de referencia ${face.image}:`, e);
            return null;
          }
        })
      );

      const validDescriptors = labeledFaceDescriptors.filter(descriptor => descriptor !== null);
      if (validDescriptors.length === 0) {
        console.error("No se pudo cargar ningún descriptor de rostro de referencia válido.");
        return;
      }

      faceMatcher.current = new faceapi.FaceMatcher(validDescriptors, 0.6);
      console.log("✅ FaceMatcher creado con las siguientes identidades:", validDescriptors.map(d => d.label));

    } catch (error) {
      console.error("🚨 Error crítico al crear el FaceMatcher:", error);
    }
  };

  const startVideo = () => {
    console.log("📹 Intentando acceder a la cámara...");
    navigator.mediaDevices
      .getUserMedia({ video: {} })
      .then((stream) => {
        if (videoRef.current) {
          console.log("✅ Cámara accedida con éxito. Asignando stream al elemento de video.");
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => console.error("🚨 ERROR AL ACCEDER A LA CÁMARA:", err));
  };

  const runFaceDetection = useCallback(async () => {
    if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
      animationFrameId.current = requestAnimationFrame(runFaceDetection);
      return;
    }

    const video = videoRef.current;
    if (video.videoWidth === 0) {
      animationFrameId.current = requestAnimationFrame(runFaceDetection);
      return;
    }

    const canvas = canvasRef.current;
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    const detections = await faceapi.detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withAgeAndGender()
      .withFaceExpressions()
      .withFaceDescriptors();

    if (detections.length > 0) {
      console.log(`😀 Rostros detectados en este frame: ${detections.length}`);
    }

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detections.length > 0) {
      const mainDetection = detections[0];
      emotionHistory.current.push(mainDetection.expressions);
      ageHistory.current.push(mainDetection.age);
      genderHistory.current.push(mainDetection.gender);

      if (faceMatcher.current) {
        const bestMatch = faceMatcher.current.findBestMatch(mainDetection.descriptor);
        recognitionHistory.current.push(bestMatch.label);
      }

      if (referenceSkinTones) {
        const { x, y, width, height } = mainDetection.detection.box;
        const tempCanvas = document.createElement('canvas'); tempCanvas.width = width; tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(video, x, y, width, height, 0, 0, width, height);
        const data = tempCtx.getImageData(0, 0, width, height).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i+1]; b += data[i+2]; }
        const count = data.length / 4;
        const userColor = { r: r/count, g: g/count, b: b/count };
        let closestTone = 'Desconocido', minDistance = Infinity;
        referenceSkinTones.forEach(tone => {
          const distance = Math.sqrt(Math.pow(userColor.r - tone.color.r, 2) + Math.pow(userColor.g - tone.color.g, 2) + Math.pow(userColor.b - tone.color.b, 2));
          if (distance < minDistance) { minDistance = distance; closestTone = tone.name; }
        });
        skinToneHistory.current.push(closestTone);
      }
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    }
    animationFrameId.current = requestAnimationFrame(runFaceDetection);
  }, [referenceSkinTones]);
  
  const processFinalAnalysis = useCallback(async () => {
    console.log("Procesando análisis final...");
    if (emotionHistory.current.length === 0) {
      console.log("No se detectaron rostros durante la sesión. Mostrando mensaje vacío.");
      setFinalAnalysisReport({ empty: true });
      return;
    }

    const emotionSums = {};
    emotionHistory.current.forEach(emotions => { for (const [emotion, value] of Object.entries(emotions)) { if (!emotionSums[emotion]) emotionSums[emotion] = 0; emotionSums[emotion] += value; } });
    const averagedEmotions = {};
    for (const emotion in emotionSums) { averagedEmotions[emotion] = emotionSums[emotion] / emotionHistory.current.length; }
    const translatedAveragedEmotions = {};
    for (const englishEmotion in averagedEmotions) { const spanishEmotion = emotionTranslations[englishEmotion] || englishEmotion; translatedAveragedEmotions[spanishEmotion] = averagedEmotions[englishEmotion]; }
    const mainEmotion = Object.keys(translatedAveragedEmotions).reduce((a, b) => translatedAveragedEmotions[a] > translatedAveragedEmotions[b] ? a : b);

    const averageAge = ageHistory.current.reduce((a, b) => a + b, 0) / ageHistory.current.length;
    const genderCount = genderHistory.current.reduce((acc, gender) => { acc[gender] = (acc[gender] || 0) + 1; return acc; }, {});
    const detectedGenderByAI = Object.keys(genderCount).reduce((a, b) => genderCount[a] > genderCount[b] ? a : b);

    const recognitionCount = recognitionHistory.current.reduce((acc, name) => { acc[name] = (acc[name] || 0) + 1; return acc; }, {});
    const detectedIdentity = Object.keys(recognitionCount).length > 0 ? Object.keys(recognitionCount).reduce((a, b) => recognitionCount[a] > recognitionCount[b] ? a : b) : 'unknown';
    
    const skinToneCount = skinToneHistory.current.reduce((acc, tone) => { acc[tone] = (acc[tone] || 0) + 1; return acc; }, {});
    const detectedSkinTone = Object.keys(skinToneCount).length > 0 ? Object.keys(skinToneCount).reduce((a, b) => skinToneCount[a] > skinToneCount[b] ? a : b) : 'No detectado';

    let finalGender;
    if (['Flor', 'Marina', 'Mujer de Prueba'].includes(detectedIdentity)) {
      finalGender = 'Femenino';
    } else {
      finalGender = detectedGenderByAI === 'male' ? 'Masculino' : 'Femenino';
    }

    const reportData = {
      age: Math.round(averageAge),
      gender: finalGender,
      mainEmotion: mainEmotion,
      allEmotions: translatedAveragedEmotions,
      identity: detectedIdentity,
      skinTone: detectedSkinTone,
    };

    console.log("📊 Reporte final generado:", reportData);

    // ----------------------------------------------------------------------
    // 🚨 AJUSTE CRÍTICO: Uso de la URL de Render para enviar la petición al backend
    const API_ENDPOINT = `${RENDER_API_BASE_URL}/api/historiales`;

    try {
      const response = await fetch(API_ENDPOINT, { //Llama a la URL de Render
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      });
      if (!response.ok) { throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`); }
      const responseData = await response.json();
      console.log('Respuesta del servidor:', responseData.message);
    } catch (error) {
      console.error('Error al enviar el historial al backend (Verifique la URL y el servidor):', error);
    }
    // ----------------------------------------------------------------------
    
    setFinalAnalysisReport(reportData);
  }, []);

  const handleReset = () => {
    setFinalAnalysisReport(null);
    emotionHistory.current = [];
    ageHistory.current = [];
    genderHistory.current = [];
    recognitionHistory.current = [];
    skinToneHistory.current = [];
    setCountdown(20);
    setIsCameraActive(true);
  };

  useEffect(() => {
    const loadInitialModels = async () => {
      const MODEL_URL = "/models";
      try {
        console.log("Iniciando carga de modelos de IA desde:", MODEL_URL);
        setLoadingMessage("Cargando modelos de IA...");
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        console.log("✅ Todos los modelos de IA cargados con éxito.");
        
        await createFaceMatcher();
        
        console.log("Iniciando calibración de tonos de piel...");
        setLoadingMessage("Calibrando tonos de piel de referencia...");
        const tones = await Promise.all([
          getAverageRgb('/known_faces/marina.png').then(color => ({ name: 'Tes Blanca', color })),
          getAverageRgb('/known_faces/negro.png').then(color => ({ name: 'Tes Negra', color })),
          getAverageRgb('/known_faces/trigeña.png').then(color => ({ name: 'Trigueña', color })),
        ]);
        setReferenceSkinTones(tones);
        console.log("✅ Tonos de piel calibrados.");
        
        setLoadingModels(false);
      } catch (error) {
        console.error("🚨 ERROR CRÍTICO AL INICIALIZAR LA IA:", error);
        setLoadingMessage("Error al cargar los modelos de IA. Revisa la consola.");
      }
    };
    loadInitialModels();
  }, []);

  useEffect(() => {
    if (isCameraActive && !loadingModels) {
      startVideo();
      const video = videoRef.current;
      if (video) {
        const handlePlay = () => {
          console.log("▶️ El video ha comenzado a reproducirse. Iniciando bucle de detección.");
          runFaceDetection();
          countdownIntervalId.current = setInterval(() => { setCountdown(prev => (prev <= 1 ? 0 : prev - 1)); }, 1000);
          analysisTimerId.current = setTimeout(() => {
            console.log("⌛ Tiempo de análisis finalizado. Deteniendo cámara y procesando resultados.");
            clearInterval(countdownIntervalId.current);
            cancelAnimationFrame(animationFrameId.current);
            if (videoRef.current && videoRef.current.srcObject) {
              videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
            processFinalAnalysis();
            setIsCameraActive(false);
          }, 20000);
        };
        video.addEventListener('play', handlePlay);
        return () => {
          video.removeEventListener('play', handlePlay);
          clearInterval(countdownIntervalId.current);
          clearTimeout(analysisTimerId.current);
          cancelAnimationFrame(animationFrameId.current);
        };
      }
    }
  }, [isCameraActive, loadingModels, runFaceDetection, processFinalAnalysis]);

  const chartOptions = { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, max: 1, title: { display: true, text: 'Nivel Promedio' } }, y: { title: { display: true, text: 'Emoción' } } }, };
  const chartData = finalAnalysisReport && finalAnalysisReport.allEmotions ? { labels: Object.keys(finalAnalysisReport.allEmotions), datasets: [{ label: 'Nivel de Emoción', data: Object.values(finalAnalysisReport.allEmotions), backgroundColor: 'rgba(59, 130, 246, 0.8)' }], } : { labels: [], datasets: [] };

  return (
    <div className={styles.wrapper}>
      <video autoPlay loop muted className={styles.backgroundVideo}>
        <source src="/fondo.mp4" type="video/mp4" />
      </video>
      {isCameraActive && !loadingModels && ( <> <h2 className={styles.title}>Recolectando datos...</h2> <p className={styles.description}>Sonríe (o no)... ¡La IA te está observando! 🧐</p> </> )}
      {isCameraActive ? (
        <>
          {loadingModels ? (
            <p className={styles.loading}>{loadingMessage}</p>
          ) : (
            <>
              <p className={styles.robotComment}> ¡Calibrando sensores! Analizando tu vibra... {countdown}s restantes 👾 </p>
              <div className={styles.cameraContainer}>
                <video ref={videoRef} autoPlay muted playsInline className={styles.video} />
                <canvas ref={canvasRef} className={styles.canvas} />
              </div>
            </>
          )}
        </>
      ) : (
        <div className={styles.resultsView}>
          <h2 className={styles.title}>¡Veredicto Final del Emociómetro! 📜</h2>
          {finalAnalysisReport && !finalAnalysisReport.empty ? (
            <>
              <div className={styles.infoGrid}>
                <InfoCard 
                  icon="🆔" 
                  label="Identidad" 
                  value={finalAnalysisReport.identity !== 'unknown' ? `Identificado: ${finalAnalysisReport.identity}` : 'No Identificada'} 
                  highlight={finalAnalysisReport.identity !== 'unknown'} 
                />
                <InfoCard icon={finalAnalysisReport.gender === 'Masculino' ? '👨' : '👩'} label="Sexo" value={finalAnalysisReport.gender} />
                <InfoCard icon="🎂" label="Edad Estimada" value={`${finalAnalysisReport.age} años`} />
                <InfoCard icon="🎨" label="Tono de Piel" value={finalAnalysisReport.skinTone} />
                <InfoCard icon="😊" label="Emoción Principal" value={finalAnalysisReport.mainEmotion} />
              </div>
              <div className={styles.chartContainer}>
                <h3>Análisis Completo de Emociones</h3>
                <Bar data={chartData} options={chartOptions} />
              </div>
            </>
          ) : (
            <div className={styles.placeholderCard}>
              <p>¡Vaya! Parece que te escondiste muy bien. No vimos ninguna cara para analizar. 🙈</p>
            </div>
          )}
          <button onClick={handleReset} className={styles.resetButton}>
            Volver a Analizar 
          </button>
        </div>
      )}
    </div>
  );
}

// FIN DEL ARCHIVO COMPLETO