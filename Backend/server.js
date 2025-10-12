const express = require('express');
const cors = require('cors');
const sql = require('mssql');

const app = express();
//Puede del uso process.env.PORT para Render, si no existe, usa 4000 (para local)
const PORT = process.env.PORT || 4000; 

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN DE CONEXIÓN A SQL SERVER EN AZURE VM ---
//Es CRÍTICO usar variables de entorno de Render para estos valores
const sqlConfig = {
    server: process.env.DB_HOST || '4.153.168.78',
    port: 1433,
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'fnZzsc4PQEUcR@4',
    database: 'AnalisisFacialDB', 
    options: {
        encrypt: true,
        trustServerCertificate: true 
    }
};

// ---BASE DE DATOS EN MEMORIA (FALLBACK)---
const historiales = [];

//Función para conectar y validar que los datos de Azure son correctos
async function connectToSql() {
    try {
        const pool = await sql.connect(sqlConfig);
        console.log('✅ Conexión con SQL Server en Azure VM establecida.');
        return pool;
    } catch (err) {
        console.error('🚨 [SQL ERROR] Fallo la conexión con SQL Server o la configuración es incorrecta.', err.message);
        return null; // Retorna null si no se pudo conectar
    }
}

//Ruta de bienvenida para probar si el servidor funciona
app.get('/', (req, res) => {
    res.send('¡El backend de reconocimiento facial está funcionando! 🚀');
});

//Ruta para obtener todos los historiales guardados (solo desde memoria)
app.get('/api/historiales', (req, res) => {
    res.json(historiales);
});

// --- RUTA PARA RECIBIR Y GUARDAR UN NUEVO HISTORIAL DE ANÁLISIS ---
app.post('/api/historiales', async (req, res) => {
    const nuevoHistorial = req.body;
    
    //1.Destructurar los datos para la inserción en SQL
    const { age, gender, mainEmotion, allEmotions, identidad, skinTone } = nuevoHistorial;
    const allEmotionsJson = JSON.stringify(allEmotions);

    //2.Intentar guardar en SQL Server (VM)
    try {
        const pool = await connectToSql();
        
        if (pool) {
            //Lógica de inserción en SQL Server
            await pool.request()
                .input('age', sql.Int, age)
                .input('gender', sql.VarChar, gender)
                .input('mainEmotion', sql.VarChar, mainEmotion)
                .input('identidad', sql.VarChar, identidad) 
                .input('skinTone', sql.NVarChar, skinTone)
                .input('allEmotions', sql.NVarChar, allEmotionsJson)
                .query(`
                    INSERT INTO Historiales (age, gender, main_emotion, identidad, skin_tone, all_emotions)
                    VALUES (@age, @gender, @mainEmotion, @identidad, @skinTone, @allEmotions);
                `);
            
            console.log('✅ [SQL SUCCESS] Historial guardado con éxito en Azure SQL Server.');
            
            //Si el guardado en SQL es exitoso, aún se guarda en memoria para consistencia temporal
            nuevoHistorial.id = Date.now();
            nuevoHistorial.fecha = new Date().toISOString();
            historiales.push(nuevoHistorial);

            return res.status(201).json({ 
                message: 'Historial guardado con éxito en Azure SQL Server',
                storage: 'SQL_SERVER'
            });
        }
    } catch (error) {
        //3. Este bloque CATCH se ejecuta si el query SQL Falla (ej. sintaxis, tabla inexistente, etc.)
        console.error('⚠️ [SQL FAIL] Error al ejecutar la inserción en SQL Server. Usando memoria...', error.message);
        //Continuamos al Fallback
    }

    // 4. FALLBACK: Guardar únicamente en el array en memoria
    console.log('🔄 [FALLBACK] Guardando historial en el array en memoria.');
    nuevoHistorial.id = Date.now();
    nuevoHistorial.fecha = new Date().toISOString();
    historiales.push(nuevoHistorial);

    //Enviamos una respuesta de éxito con la información del fallback
    res.status(201).json({ 
        message: 'Historial guardado solo en memoria (Fallback)', 
        storage: 'MEMORY',
        historial: nuevoHistorial 
    });
});


// --- INICIAR EL SERVIDOR ---
app.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}.`);
});