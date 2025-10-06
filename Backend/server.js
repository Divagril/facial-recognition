const express = require('express');
const cors = require('cors');
const sql = require('mssql');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const sqlConfig = {
    server: process.env.DB_HOST || '4.153.168.78',
    port: 1433,
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'fnZzsc4PQEUcR@4',
    database: 'AnalisisFacialDB',
    options: {
        encrypt: true,
        trustServerCertificate: true
    },
    // Es recomendable agregar un timeout para evitar que las peticiones se queden colgadas
    connectionTimeout: 30000 
};

// --- "BASE DE DATOS" EN MEMORIA (FALLBACK) ---
const historiales = [];

// --- RUTA PARA RECIBIR Y GUARDAR UN NUEVO HISTORIAL DE ANÁLISIS ---
app.post('/api/historiales', async (req, res) => {
    const nuevoHistorial = req.body;
    const { age, gender, mainEmotion, allEmotions, identity, skinTone } = nuevoHistorial;
    const allEmotionsJson = JSON.stringify(allEmotions);

    try {
        // Usamos el pool de conexiones global. No necesitamos llamar a connect() aquí.
        // La conexión ya está establecida.
        await sql.connect(sqlConfig); // Conectamos antes de la consulta
        await sql.request()
            .input('age', sql.Int, age)
            .input('gender', sql.NVarChar, gender)
            .input('mainEmotion', sql.NVarChar, mainEmotion)
            .input('identityValue', sql.NVarChar, identity)
            .input('skinTone', sql.NVarChar, skinTone)
            .input('allEmotions', sql.NVarChar, allEmotionsJson)
            .query(`
                INSERT INTO Historiales (age, gender, main_emotion, identidad, skin_tone, all_emotions)
                VALUES (@age, @gender, @mainEmotion, @identityValue, @skinTone, @allEmotions);
            `);

        console.log('✅ [SQL SUCCESS] Historial guardado con éxito en Azure SQL Server.');

        return res.status(201).json({
            message: 'Historial guardado con éxito en Azure SQL Server',
            storage: 'SQL_SERVER'
        });

    } catch (error) {
        console.error('⚠️ [SQL FAIL] Error al conectar o insertar en SQL Server. Usando memoria...', error.message);
        
        // FALLBACK: Guardar únicamente en el array en memoria
        console.log('🔄 [FALLBACK] Guardando historial en el array en memoria.');
        nuevoHistorial.id = Date.now();
        nuevoHistorial.fecha = new Date().toISOString();
        historiales.push(nuevoHistorial);

        res.status(500).json({ // Es mejor usar un status 500 para indicar un fallo del servidor
            message: 'Error al guardar en la base de datos. Historial guardado solo en memoria (Fallback)',
            storage: 'MEMORY',
            error: error.message,
            historial: nuevoHistorial
        });
    }
});

// --- RUTA PARA OBTENER DATOS DESDE SQL SERVER ---
app.get('/api/historiales', async (req, res) => {
    try {
        await sql.connect(sqlConfig);
        const result = await sql.query`SELECT * FROM Historiales ORDER BY fecha DESC`;
        
        console.log('✅ [SQL SUCCESS] Historiales obtenidos desde Azure SQL Server.');
        res.json(result.recordset);

    } catch (error) {
        console.error('⚠️ [SQL FAIL] No se pudieron obtener los historiales de SQL. Devolviendo desde memoria...', error.message);
        // Fallback a memoria si la BD falla
        res.json(historiales);
    }
});


// --- INICIAR EL SERVIDOR ---
// Conectamos a la BD y SÓLO si tenemos éxito, iniciamos el servidor Express.
sql.connect(sqlConfig).then(() => {
    app.listen(PORT, () => {
        console.log(`✅ Conexión con SQL Server establecida en el arranque.`);
        console.log(`🚀 Servidor escuchando en puerto ${PORT}.`);
    });
}).catch(err => {
    console.error('🚨 [FATAL] No se pudo conectar a la base de datos al iniciar el servidor.', err);
});