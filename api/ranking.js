import admin from 'firebase-admin';

let db;

const initializeFirebase = () => {
  // Verificar si ya está inicializado
  if (admin.apps.length > 0) {
    db = admin.database();
    return;
  }

  try {
    const configB64 = process.env.FIREBASE_CONFIG_B64;
    const databaseUrl = process.env.FIREBASE_DATABASE_URL;

    if (!configB64 || !databaseUrl) {
      throw new Error('Variables FIREBASE_CONFIG_B64 o FIREBASE_DATABASE_URL no configuradas');
    }

    const serviceAccount = JSON.parse(
      Buffer.from(configB64, 'base64').toString()
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: databaseUrl
    });

    db = admin.database();
  } catch (error) {
    console.error('Error inicializando Firebase:', error);
    throw error;
  }
};

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  try {
    initializeFirebase();

    const snapshot = await db.ref('Equipos').once('value');
    const equiposData = snapshot.val();

    if (!equiposData) {
      return res.status(200).json([]);
    }

    const ranking = [];

    Object.entries(equiposData).forEach(([equipoKey, equipoData]) => {
      if (equipoData.activo === true) {
        ranking.push({
          id: equipoKey,
          nombre: equipoData.nombre || equipoKey,
          score: equipoData.score || 0,
          activo: equipoData.activo
        });
      }
    });

    ranking.sort((a, b) => b.score - a.score);

    res.status(200).json(ranking);
  } catch (error) {
    console.error('Error en API:', error);
    res.status(500).json({
      error: 'Error al obtener ranking',
      message: error.message
    });
  }
};
