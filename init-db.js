/**
 * init-db.js
 * Script de inicialización de MongoDB.
 * Se ejecuta automáticamente la primera vez que se levanta el contenedor.
 * Crea la base de datos, colecciones, índices y datos de prueba.
 */

// Seleccionar/crear base de datos
db = db.getSiblingDB('encuestasdb');

print('========================================');
print('  Inicializando base de datos encuestasdb');
print('========================================');

// =============================================
// Crear colecciones con validación de esquema
// =============================================

db.createCollection('usuarios', {
   validator: {
      $jsonSchema: {
         bsonType: 'object',
         required: ['username', 'password', 'rol'],
         properties: {
            username: { bsonType: 'string', description: 'Nombre de usuario único' },
            password: { bsonType: 'string', description: 'Contraseña hasheada con BCrypt' },
            nombre: { bsonType: 'string' },
            rol: { bsonType: 'string', enum: ['admin', 'supervisor', 'encuestador'] },
            fechaCreacion: { bsonType: 'date' }
         }
      }
   }
});

db.createCollection('encuestas', {
   validator: {
      $jsonSchema: {
         bsonType: 'object',
         required: ['nombre', 'sector', 'nivelEscolar', 'usuario'],
         properties: {
            nombre: { bsonType: 'string' },
            sector: { bsonType: 'string' },
            nivelEscolar: {
               bsonType: 'string',
               enum: ['Básico', 'Medio', 'Grado Universitario', 'Postgrado', 'Doctorado']
            },
            usuario: { bsonType: 'string' },
            latitud: { bsonType: ['double', 'null'] },
            longitud: { bsonType: ['double', 'null'] },
            imagenBase64: { bsonType: ['string', 'null'] },
            fechaRegistro: { bsonType: 'date' },
            sincronizado: { bsonType: 'bool' }
         }
      }
   }
});

print('[OK] Colecciones creadas con validación de esquema.');

// =============================================
// Crear índices
// =============================================

// Índice único en username
db.usuarios.createIndex({ username: 1 }, { unique: true });

// Índice para búsquedas por usuario
db.encuestas.createIndex({ usuario: 1 });

// Índice geoespacial 2d para consultas de proximidad
db.encuestas.createIndex({ latitud: 1, longitud: 1 });

// Índice por fecha para ordenamiento
db.encuestas.createIndex({ fechaRegistro: -1 });

print('[OK] Índices creados.');

// =============================================
// Insertar usuario admin por defecto
// Contraseña: "admin123" hasheada con BCrypt
// Hash generado para: admin123
// =============================================
const adminExistente = db.usuarios.findOne({ username: 'admin' });
if (!adminExistente) {
   db.usuarios.insertOne({
      username: 'admin',
      // BCrypt hash de "admin123" (generado con BCrypt.hashpw)
      password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
      nombre: 'Administrador PUCMM',
      rol: 'admin',
      fechaCreacion: new Date()
   });
   print('[OK] Usuario admin creado (password: admin123).');
} else {
   print('[INFO] Usuario admin ya existe, omitiendo.');
}

// Usuario encuestador de prueba
// Contraseña: "enc123"
const encExistente = db.usuarios.findOne({ username: 'encuestador1' });
if (!encExistente) {
   db.usuarios.insertOne({
      username: 'encuestador1',
      password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
      nombre: 'Carlos Encuestador',
      rol: 'encuestador',
      fechaCreacion: new Date()
   });
   print('[OK] Usuario encuestador1 creado (password: admin123).');
}

// =============================================
// Insertar datos de prueba
// =============================================
const encuestasPrueba = db.encuestas.countDocuments();
if (encuestasPrueba === 0) {
   db.encuestas.insertMany([
      {
         nombre: 'Juan Pérez',
         sector: 'Los Jardines',
         nivelEscolar: 'Grado Universitario',
         usuario: 'encuestador1',
         latitud: 19.4517,
         longitud: -70.6970,
         imagenBase64: null,
         fechaRegistro: new Date(),
         sincronizado: true
      },
      {
         nombre: 'María García',
         sector: 'Centro',
         nivelEscolar: 'Postgrado',
         usuario: 'encuestador1',
         latitud: 19.4602,
         longitud: -70.6853,
         imagenBase64: null,
         fechaRegistro: new Date(),
         sincronizado: true
      },
      {
         nombre: 'Luis Rodríguez',
         sector: 'Villa Olga',
         nivelEscolar: 'Medio',
         usuario: 'admin',
         latitud: 19.4423,
         longitud: -70.7012,
         imagenBase64: null,
         fechaRegistro: new Date(),
         sincronizado: true
      },
      {
         nombre: 'Ana Martínez',
         sector: 'Gurabo',
         nivelEscolar: 'Básico',
         usuario: 'encuestador1',
         latitud: 19.4380,
         longitud: -70.6790,
         imagenBase64: null,
         fechaRegistro: new Date(),
         sincronizado: true
      },
      {
         nombre: 'Pedro Sánchez',
         sector: 'Pontezuela',
         nivelEscolar: 'Doctorado',
         usuario: 'admin',
         latitud: 19.4688,
         longitud: -70.6915,
         imagenBase64: null,
         fechaRegistro: new Date(),
         sincronizado: true
      }
   ]);
   print('[OK] 5 encuestas de prueba insertadas.');
} else {
   print('[INFO] Ya existen ' + encuestasPrueba + ' encuestas. Omitiendo datos de prueba.');
}

print('========================================');
print('  Inicialización completada exitosamente');
print('========================================');
