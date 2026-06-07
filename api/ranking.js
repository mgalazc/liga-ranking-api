/**
 * API Serverless para obtener ranking desde Firebase Realtime Database
 * Estructura esperada: /Equipos/{nombreEquipo}/{activo, nombre, score}
 * Deploy en: Vercel, Netlify, o similar
 *
 * Variables de entorno requerida:
 * - FIREBASE_CONFIG_B64: Configuración de Firebase en Base64
 * - FIREBASE_DATABASE_URL: URL de la base de datos Realtime
 */

import admin from 'firebase-admin';

let db;

const initializeFirebase = () => {
  if (db) return;

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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Responder a preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Solo GET permitido
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  try {
    initializeFirebase();

    // Obtener todos los equipos desde /Equipos
    const snapshot = await db.ref('Equipos').once('value');
    const equiposData = snapshot.val();

    if (!equiposData) {
      return res.status(200).json([]);
    }

    // Procesar y filtrar equipos activos
    const ranking = [];

    Object.entries(equiposData).forEach(([equipoKey, equipoData]) => {
      // Solo incluir equipos activos
      if (equipoData.activo === true) {
        ranking.push({
          id: equipoKey,
          nombre: equipoData.nombre || equipoKey,
          score: equipoData.score || 0,
          activo: equipoData.activo
        });
      }
    });

    // Ordenar por score descendente
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
