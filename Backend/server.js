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
const sqlConfig = {
    server: process.env.DB_HOST || 'facial-server.database.windows.net',
    port: 1433,
    user: process.env.DB_USER || 'adminsql',
    password: process.env.DB_PASSWORD || 'fnZzsc4PQEUcR@4',
    database: 'AnalisisFacialDB',
    options: {
        encrypt: false,
        trustServerCertificate: false
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
  const allEmotionsJson = JSON.stringify(allEmotions);

  try {
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

      // También guardar en memoria como respaldo temporal
      nuevoHistorial.id = Date.now();
      nuevoHistorial.fecha = new Date().toISOString();
      historiales.push(nuevoHistorial);

      return res.status(201).json({
        message: 'Historial guardado con éxito en Azure SQL Server',
        storage: 'SQL_SERVER'
      });
    }
  } catch (error) {
    console.error('⚠️ [SQL FAIL] Error en la inserción SQL:', error.message);
  }

  // --- FALLBACK EN MEMORIA ---
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
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}. 🚀`);
});
