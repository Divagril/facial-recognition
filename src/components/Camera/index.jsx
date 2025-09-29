import React, { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";
import styles from './Camera.module.css';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

// Registrar los componentes necesarios de Chart.js
Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function CameraComponent() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameId = useRef();

  const [loadingModels, setLoadingModels] = useState(true);
  const [detections, setDetections] = useState([]);
  const [emotionCounts, setEmotionCounts] = useState({}); // Emociones actuales para el gráfico principal
  const [capturedMoments, setCapturedMoments] = useState([]); // Almacena { url, emotions, detections }

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState(null); // { url, emotions, detections } para el modal

  // Carga de modelos de face-api.js
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      setLoadingModels(false);
      startVideo();
    };
    loadModels();
  }, []);

  // Iniciar la cámara
  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: {} })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Error al acceder a la cámara:", err);
      });
  };

  // Bucle de detección en tiempo real
  const runFaceDetection = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.paused || videoRef.current.ended) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    // Detección más rápida con opciones optimizadas
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withAgeAndGender()
      .withFaceExpressions();

    setDetections(detections);

    // Actualizar el gráfico de emociones en vivo (si hay detecciones)
    if (detections.length > 0) {
        const primaryDetection = detections[0]; // Tomamos el primer rostro detectado para el gráfico en vivo
        setEmotionCounts(primaryDetection.expressions);
    } else {
        setEmotionCounts({}); // Limpiar si no hay rostros
    }

    // Limpiar y dibujar en el canvas
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

    resizedDetections.forEach((detection) => {
        const { age, gender, genderProbability } = detection;
        const genderText = `${gender} (${(genderProbability * 100).toFixed(1)}%)`;
        const ageText = `Edad: ${age.toFixed(0)}`;
        new faceapi.draw.DrawTextField([ageText, genderText], detection.detection.box.topLeft).draw(canvas);
    });

    animationFrameId.current = requestAnimationFrame(runFaceDetection);
  }, []);
  
  // Iniciar el bucle de detección cuando el video se esté reproduciendo
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
        video.addEventListener('play', () => {
            // Limpiar cualquier bucle anterior
            cancelAnimationFrame(animationFrameId.current);
            // Iniciar nuevo bucle
            runFaceDetection();
        });
    }
    // Limpieza al desmontar el componente
    return () => {
      cancelAnimationFrame(animationFrameId.current);
      if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [runFaceDetection]);
  
  // Limpiar los URLs de las imágenes capturadas al desmontar
  useEffect(() => {
    return () => {
      capturedMoments.forEach(moment => URL.revokeObjectURL(moment.url));
    };
  }, [capturedMoments]);

  // Función para capturar una imagen del video
  const captureSnapshot = () => {
    if (!videoRef.current || detections.length === 0) return; // No capturar si no hay rostros detectados

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);

    canvas.toBlob(blob => {
        if (blob) {
            const url = URL.createObjectURL(blob);
            // Guardar la URL de la imagen, las emociones y las detecciones de ese momento
            const currentEmotions = detections.length > 0 ? detections[0].expressions : {};
            setCapturedMoments(prev => [{ url, emotions: currentEmotions, detections: [...detections] }, ...prev].slice(0, 10)); // Mantener solo las últimas 10
        }
    });
  };

  // Abre el modal con la imagen y gráfica seleccionadas
  const openModal = (moment) => {
    setSelectedMoment(moment);
    setModalOpen(true);
  };

  // Cierra el modal
  const closeModal = () => {
    setModalOpen(false);
    setSelectedMoment(null);
  };

  // Opciones base para los gráficos (se pueden sobrescribir)
  const baseChartOptions = {
    indexAxis: 'y', // Hace el gráfico horizontal para mejor legibilidad
    responsive: true,
    maintainAspectRatio: false, // Permitir que el gráfico ajuste su tamaño dentro del modal
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.x !== null) {
              label += (context.parsed.x * 100).toFixed(1) + '%';
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: { beginAtZero: true, max: 1, title: { display: true, text: 'Nivel de Confianza' } }, // Las emociones van de 0 a 1
      y: { title: { display: true, text: 'Emoción' } }
    },
  };

  // Datos para el gráfico en vivo
  const liveChartData = {
    labels: Object.keys(emotionCounts),
    datasets: [{
      label: 'Nivel de Emoción',
      data: Object.values(emotionCounts).map(v => Number(v.toFixed(2))),
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1,
    }],
  };

  // Datos para el gráfico del modal (cuando se selecciona una imagen)
  const modalChartData = selectedMoment ? {
    labels: Object.keys(selectedMoment.emotions),
    datasets: [{
      label: 'Nivel de Emoción',
      data: Object.values(selectedMoment.emotions).map(v => Number(v.toFixed(2))),
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1,
    }],
  } : { labels: [], datasets: [] };


  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Reconocimiento Facial en Tiempo Real 🤖</h2>
      <p className={styles.description}>Análisis de edad, género y expresiones faciales a través de tu cámara.</p>

      <section className={styles.section}>
        <div className={styles.container}>
            <div className={styles.subtitleContainer}>
                <h3>Cámara en Vivo</h3>
            </div>
            {loadingModels && <p className={styles.loading}>Cargando modelos de IA...</p>}
            <div className={styles.cameraContainer}>
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={styles.video}
                />
                <canvas ref={canvasRef} className={styles.canvas} />
            </div>
            <button
                onClick={captureSnapshot}
                className={styles.button}
                disabled={loadingModels || detections.length === 0}
            >
                Capturar Imagen y Análisis 📸
            </button>
        </div>

        <div className={styles.container}>
            <div className={styles.subtitleContainer}>
                <h3>Datos del Reconocimiento</h3>
            </div>
            {detections.length > 0 ? (
                <>
                    {/* Gráfico de emociones en vivo */}
                    <div className={styles.chartContainer}>
                        <Bar data={liveChartData} options={baseChartOptions} />
                    </div>
                    {/* Detalles de detección en vivo */}
                    <div className={styles.details}>
                        {detections.map((det, i) => {
                            const emotions = Object.entries(det.expressions)
                                .sort((a, b) => b[1] - a[1]);
                            return (
                                <div key={i} className={styles.detectionCard}>
                                    <h4>Persona {i + 1}</h4>
                                    <p><b>Edad estimada:</b> {det.age.toFixed(0)} años</p>
                                    <p><b>Género:</b> {det.gender} ({(det.genderProbability * 100).toFixed(1)}%)</p>
                                    <p><b>Emoción principal:</b> {emotions[0][0]}</p>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                <p className={styles.placeholder}>Esperando detección de rostros...</p>
            )}
             {/* Imágenes capturadas */}
             {capturedMoments.length > 0 && (
                <div className={styles.capturesContainer}>
                    <h4>Momentos Capturados:</h4>
                    <div className={styles.imageList}>
                    {capturedMoments.map((moment, idx) => (
                        <img
                            key={idx}
                            src={moment.url}
                            alt={`captura-${idx}`}
                            className={styles.captureThumb}
                            onClick={() => openModal(moment)}
                        />
                    ))}
                    </div>
                </div>
            )}
        </div>
      </section>

      {/* Modal para mostrar imagen y gráfica */}
      {modalOpen && selectedMoment && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeModalButton} onClick={closeModal}>✖</button>
            <h3>Detalles del Momento Capturado</h3>
            <div className={styles.modalImageContainer}>
                <img src={selectedMoment.url} alt="Momento Capturado" className={styles.modalImage} />
            </div>
            {Object.keys(selectedMoment.emotions).length > 0 && (
                <div className={styles.modalChartContainer}>
                    <h4>Análisis de Emociones</h4>
                    <Bar data={modalChartData} options={baseChartOptions} />
                </div>
            )}
             {selectedMoment.detections.length > 0 && (
                <div className={styles.modalDetails}>
                    <h4>Análisis Detallado:</h4>
                    {selectedMoment.detections.map((det, i) => {
                        const emotions = Object.entries(det.expressions)
                            .sort((a, b) => b[1] - a[1]);
                        return (
                            <div key={i} className={styles.detectionCard}>
                                <h5>Rostro {i + 1}</h5>
                                <p><b>Edad estimada:</b> {det.age.toFixed(0)} años</p>
                                <p><b>Género:</b> {det.gender} ({(det.genderProbability * 100).toFixed(1)}%)</p>
                                <p><b>Emoción principal:</b> {emotions[0][0]}</p>
                            </div>
                        );
                    })}
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}