// Archivo: server.js

const express = require('express');
const cors = require('cors');

// Inicializa la aplicación Express
const app = express();
const PORT = 4000; // El puerto donde se ejecutará nuestro backend

// --- MIDDLEWARE ---
// Habilita CORS para permitir peticiones desde tu app de React
app.use(cors());
// Permite que Express entienda el formato JSON que enviaremos desde React
app.use(express.json());


// --- "BASE DE DATOS" EN MEMORIA ---
// Por ahora, guardaremos los historiales en un simple array.
// Cada vez que reinicies el servidor, esto se borrará.
const historiales = [];


// --- RUTAS (ENDPOINTS) DE NUESTRA API ---

// Ruta de bienvenida para probar si el servidor funciona
app.get('/', (req, res) => {
  res.send('¡El backend de reconocimiento facial está funcionando! 🚀');
});

// Ruta para obtener todos los historiales guardados
app.get('/api/historiales', (req, res) => {
  res.json(historiales);
});

// Ruta para recibir y guardar un nuevo historial de análisis
app.post('/api/historiales', (req, res) => {
  const nuevoHistorial = req.body;

  // Añadimos un ID único y una fecha para cada historial
  nuevoHistorial.id = Date.now();
  nuevoHistorial.fecha = new Date().toISOString();

  // Guardamos el nuevo historial en nuestra "base de datos"
  historiales.push(nuevoHistorial);

  console.log('Nuevo historial recibido y guardado:');
  console.log(nuevoHistorial);

  // Enviamos una respuesta de éxito (código 201: Creado)
  res.status(201).json({ message: 'Historial guardado con éxito', historial: nuevoHistorial });
});


// --- INICIAR EL SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});