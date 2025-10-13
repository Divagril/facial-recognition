// --- DEPENDENCIAS ---
require('dotenv').config(); // Cargar variables de entorno desde .env
const express = require('express');
const cors = require('cors');
const sql = require('mssql');

// --- CONFIGURACIÓN DE EXPRESS ---
const app = express();
const PORT = process.env.PORT || 4000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN DE CONEXIÓN A SQL SERVER (Azure VM o Render) ---
// NOTA DE SEGURIDAD: Es altamente recomendable usar solo las variables de entorno
// y NUNCA dejar credenciales sensibles hardcodeadas como fallback ('sa', la IP, etc.)
const sqlConfig = {
  server: process.env.DB_HOST || '4.253.32.14',
  port: 1433,
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'fnZzsc4PQEUcR@4',
  database: process.env.DB_NAME || 'AnalisisFacialDB',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

// --- BASE DE DATOS EN MEMORIA (Fallback en caso de error SQL) ---
const historiales = [];

// --- FUNCIÓN DE CONEXIÓN A SQL SERVER ---
async function connectToSql() {
  try {
    const pool = await sql.connect(sqlConfig);
    console.log('✅ Conexión establecida con SQL Server en Azure VM.');
    return pool;
  } catch (err) {
    console.error('🚨 Error al conectar con SQL Server:', err.message);
    return null;
  }
}

// --- RUTA DE BIENVENIDA ---
app.get('/', (req, res) => {
  res.send('🚀 Backend de Reconocimiento Facial funcionando correctamente.');
});

// --- RUTA: Obtener historiales (desde memoria temporal) ---
app.get('/api/historiales', (req, res) => {
  res.json(historiales);
});

// --- RUTA: Guardar nuevo historial ---
app.post('/api/historiales', async (req, res) => {
  const nuevoHistorial = req.body;
  const { age, gender, mainEmotion, allEmotions, identidad, skinTone } = nuevoHistorial;
  // Convertir el objeto de emociones a JSON string para guardarlo en la columna NVarChar
  const allEmotionsJson = JSON.stringify(allEmotions);

  let isSqlSuccess = false;

  try {
    // Intentar conectar (la conexión se cierra automáticamente al finalizar la solicitud)
    const pool = await connectToSql();

    if (pool) {
      // Inserción en la tabla [Historiales] según estructura exacta
      await pool.request()
        .input('Age', sql.Int, age)
        .input('Gender', sql.VarChar, gender)
        .input('MainEmotion', sql.VarChar, mainEmotion)
        .input('Identidad', sql.VarChar, identidad)
        .input('SkinTone', sql.NVarChar, skinTone)
        .input('AllEmotionsJSON', sql.NVarChar, allEmotionsJson)
        .query(`
          INSERT INTO Historiales (Age, Gender, MainEmotion, Identidad, SkinTone, AllEmotionsJSON)
          VALUES (@Age, @Gender, @MainEmotion, @Identidad, @SkinTone, @AllEmotionsJSON);
        `);

      console.log('✅ [SQL SUCCESS] Historial guardado en SQL Server Azure.');
      isSqlSuccess = true;
    }
  } catch (error) {
    console.error('⚠️ [SQL FAIL] Error en la inserción SQL:', error.message);
    isSqlSuccess = false;
  }

  // Si la inserción fue exitosa, responder y salir.
  if (isSqlSuccess) {
    // También guardar en memoria como respaldo temporal (opcional, pero se mantiene tu lógica)
    nuevoHistorial.id = Date.now();
    nuevoHistorial.fecha = new Date().toISOString();
    historiales.push(nuevoHistorial);

    return res.status(201).json({
      message: 'Historial guardado con éxito en Azure SQL Server',
      storage: 'SQL_SERVER'
    });
  }

  // --- FALLBACK EN MEMORIA (Si la conexión o la inserción fallaron) ---
  console.log('🔄 [FALLBACK] Guardando historial solo en memoria.');
  nuevoHistorial.id = Date.now();
  nuevoHistorial.fecha = new Date().toISOString();
  historiales.push(nuevoHistorial);

  res.status(201).json({
    message: 'Historial guardado solo en memoria (Fallback)',
    storage: 'MEMORY',
    historial: nuevoHistorial
  });
});

// --- INICIAR SERVIDOR ---
async function startServer() {
  // 1. Intentar conectar a la base de datos inmediatamente al iniciar.
  // Esto forzará que el mensaje de conexión/error aparezca en la terminal.
  await connectToSql(); 

  // 2. Iniciar el servidor Express
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}. 🚀`);
  });
}

// Ejecutar la función de inicio
startServer();