const express = require('express');
const cors = require('cors');
<<<<<<< HEAD
const sql = require('mssql'); // ¡Importamos el driver mssql!
=======
const sql = require('mssql');
>>>>>>> 3ec562361948b15ddc43883bda671c4203312604

const app = express();
<<<<<<< HEAD
// Importante: Usar process.env.PORT para Render, si no existe, usa 4000 (para desarrollo local)
=======
<<<<<<< HEAD
//Puede del uso process.env.PORT para Render, si no existe, usa 4000 (para local)
>>>>>>> 3ec562361948b15ddc43883bda671c4203312604
const PORT = process.env.PORT || 4000; 

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN DE CONEXIÓN A SQL SERVER EN AZURE VM ---
<<<<<<< HEAD
// Es CRÍTICO usar variables de entorno de Render para estos valores
const sqlConfig = {
    server: process.env.DB_HOST || '4.153.168.78', // Su IP pública de Azure VM
    port: 1433, // Puerto estándar de SQL Server
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'fnZzsc4PQEUcR@4',
    database: 'AnalisisFacialDB', 
    options: {
        encrypt: true, // Para Azure VM es necesario
        trustServerCertificate: true 
    }
};

// --- "BASE DE DATOS" EN MEMORIA (FALLBACK) ---
const historiales = [];

// Función para conectar y validar que los datos de Azure son correctos
=======
//Es CRÍTICO usar variables de entorno de Render para estos valores
=======
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

>>>>>>> 8a064f22854dbfdc3daf2272c1ee63be95afe6e3
const sqlConfig = {
    server: process.env.DB_HOST || '4.153.168.78',
    port: 1433,
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'fnZzsc4PQEUcR@4',
<<<<<<< HEAD
    database: 'AnalisisFacialDB', 
    options: {
        encrypt: true,
        trustServerCertificate: true 
    }
};

// ---BASE DE DATOS EN MEMORIA (FALLBACK)---
const historiales = [];

//Función para conectar y validar que los datos de Azure son correctos
>>>>>>> 3ec562361948b15ddc43883bda671c4203312604
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

<<<<<<< HEAD
// Ruta de bienvenida para probar si el servidor funciona
=======
//Ruta de bienvenida para probar si el servidor funciona
>>>>>>> 3ec562361948b15ddc43883bda671c4203312604
app.get('/', (req, res) => {
    res.send('¡El backend de reconocimiento facial está funcionando! 🚀');
});

<<<<<<< HEAD
// Ruta para obtener todos los historiales guardados (solo desde memoria)
app.get('/api/historiales', (req, res) => {
    // Nota: Esta ruta seguirá devolviendo solo los datos en memoria.
    // Si quiere datos de Azure, necesitará implementar la lógica de consulta SQL aquí.
=======
//Ruta para obtener todos los historiales guardados (solo desde memoria)
app.get('/api/historiales', (req, res) => {
>>>>>>> 3ec562361948b15ddc43883bda671c4203312604
    res.json(historiales);
});

// --- RUTA PARA RECIBIR Y GUARDAR UN NUEVO HISTORIAL DE ANÁLISIS ---
app.post('/api/historiales', async (req, res) => {
    const nuevoHistorial = req.body;
    
<<<<<<< HEAD
    // 1. Destructurar los datos para la inserción en SQL
    const { age, gender, mainEmotion, allEmotions, identity, skinTone } = nuevoHistorial;
    const allEmotionsJson = JSON.stringify(allEmotions);

    // 2. Intentar guardar en SQL Server (Azure VM)
=======
    //1.Destructurar los datos para la inserción en SQL
    const { age, gender, mainEmotion, allEmotions, identidad, skinTone } = nuevoHistorial;
    const allEmotionsJson = JSON.stringify(allEmotions);

    //2.Intentar guardar en SQL Server (VM)
>>>>>>> 3ec562361948b15ddc43883bda671c4203312604
    try {
        const pool = await connectToSql();
        
        if (pool) {
<<<<<<< HEAD
            // Lógica de inserción en SQL Server
            await pool.request()
                .input('age', sql.Int, age)
                .input('gender', sql.NVarChar, gender)
                .input('mainEmotion', sql.NVarChar, mainEmotion)
                // Usamos la variable JS 'identity' y la columna SQL 'identidad'
                .input('identityValue', sql.NVarChar, identity) 
=======
            //Lógica de inserción en SQL Server
            await pool.request()
                .input('age', sql.Int, age)
                .input('gender', sql.VarChar, gender)
                .input('mainEmotion', sql.VarChar, mainEmotion)
                .input('identidad', sql.VarChar, identidad) 
>>>>>>> 3ec562361948b15ddc43883bda671c4203312604
                .input('skinTone', sql.NVarChar, skinTone)
                .input('allEmotions', sql.NVarChar, allEmotionsJson)
                .query(`
                    INSERT INTO Historiales (age, gender, main_emotion, identidad, skin_tone, all_emotions)
<<<<<<< HEAD
                    VALUES (@age, @gender, @mainEmotion, @identityValue, @skinTone, @allEmotions);
=======
                    VALUES (@age, @gender, @mainEmotion, @identidad, @skinTone, @allEmotions);
>>>>>>> 3ec562361948b15ddc43883bda671c4203312604
                `);
            
            console.log('✅ [SQL SUCCESS] Historial guardado con éxito en Azure SQL Server.');
            
<<<<<<< HEAD
            // Si el guardado en SQL es exitoso, aún lo guardamos en memoria para consistencia temporal
=======
            //Si el guardado en SQL es exitoso, aún se guarda en memoria para consistencia temporal
>>>>>>> 3ec562361948b15ddc43883bda671c4203312604
            nuevoHistorial.id = Date.now();
            nuevoHistorial.fecha = new Date().toISOString();
            historiales.push(nuevoHistorial);

            return res.status(201).json({ 
                message: 'Historial guardado con éxito en Azure SQL Server',
                storage: 'SQL_SERVER'
            });
        }
    } catch (error) {
<<<<<<< HEAD
        // 3. Este bloque CATCH se ejecuta si el query SQL Falla (ej. sintaxis, tabla inexistente, etc.)
        console.error('⚠️ [SQL FAIL] Error al ejecutar la inserción en SQL Server. Usando memoria...', error.message);
        // Continuamos al Fallback
=======
        //3. Este bloque CATCH se ejecuta si el query SQL Falla (ej. sintaxis, tabla inexistente, etc.)
        console.error('⚠️ [SQL FAIL] Error al ejecutar la inserción en SQL Server. Usando memoria...', error.message);
        //Continuamos al Fallback
>>>>>>> 3ec562361948b15ddc43883bda671c4203312604
    }

    // 4. FALLBACK: Guardar únicamente en el array en memoria
    console.log('🔄 [FALLBACK] Guardando historial en el array en memoria.');
    nuevoHistorial.id = Date.now();
    nuevoHistorial.fecha = new Date().toISOString();
    historiales.push(nuevoHistorial);

<<<<<<< HEAD
    // Enviamos una respuesta de éxito con la información del fallback
=======
    //Enviamos una respuesta de éxito con la información del fallback
>>>>>>> 3ec562361948b15ddc43883bda671c4203312604
    res.status(201).json({ 
        message: 'Historial guardado solo en memoria (Fallback)', 
        storage: 'MEMORY',
        historial: nuevoHistorial 
    });
<<<<<<< HEAD
=======
=======
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
>>>>>>> 8a064f22854dbfdc3daf2272c1ee63be95afe6e3
>>>>>>> 3ec562361948b15ddc43883bda671c4203312604
});


// --- INICIAR EL SERVIDOR ---
<<<<<<< HEAD
app.listen(PORT, () => {
    console.log(`Servidor escuchando en puerto ${PORT}.`);
<<<<<<< HEAD
=======
=======
// Conectamos a la BD y SÓLO si tenemos éxito, iniciamos el servidor Express.
sql.connect(sqlConfig).then(() => {
    app.listen(PORT, () => {
        console.log(`✅ Conexión con SQL Server establecida en el arranque.`);
        console.log(`🚀 Servidor escuchando en puerto ${PORT}.`);
    });
}).catch(err => {
    console.error('🚨 [FATAL] No se pudo conectar a la base de datos al iniciar el servidor.', err);
>>>>>>> 8a064f22854dbfdc3daf2272c1ee63be95afe6e3
>>>>>>> 3ec562361948b15ddc43883bda671c4203312604
});