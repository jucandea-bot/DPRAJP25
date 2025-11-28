require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || process.env.port || 3000;

// Secretos y configuración
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '10m';
const DEVICE_KEY = process.env.DEVICE_KEY || 'device_key_sample';

// Middlewares globales
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));

/* ---------------------------
   Conexión a MongoDB
   --------------------------- */
const mong_uri = process.env.MONG_URI || "mongodb+srv://racn_0703:12345racn@dp2.w4tsstd.mongodb.net/?appName=DP2";

mongoose.connect(mong_uri, {
  dbName: 'BackProsture'
})
.then(() => {
  console.log('Conectado a la base de datos MongoDB');
})
.catch((err) => {
  console.error('Error al conectar a la base de datos MongoDB:', err.message);
});

/* ---------------------------
   MODELOS (deben definirse antes de las rutas)
   --------------------------- */

/* ---------- Cuentas (Accounts) ---------- */
const accountSchema = new mongoose.Schema({
  nombreCuenta: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  contraseña: { type: String, required: true },
  plan: { type: String, enum: ['free', 'premium', 'enterprise'], default: 'free' },
  fechaRegistro: { type: Date, default: Date.now }
}, {
  timestamps: true
});

accountSchema.index({ correo: 1 }, { unique: true });

accountSchema.pre('save', async function (next) {
  if (!this.isModified('contraseña')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.contraseña = await bcrypt.hash(this.contraseña, salt);
    next();
  } catch (err) {
    next(err);
  }
});

accountSchema.methods.compararContraseña = function (contraseñaPlano) {
  return bcrypt.compare(contraseñaPlano, this.contraseña);
};

const Cuentas = mongoose.models.Cuentas || mongoose.model('Cuentas', accountSchema);

/* ---------- Usuarios (Users) ---------- */
const userSchema = new mongoose.Schema({
  idAccount:   { type: mongoose.Schema.Types.ObjectId, ref: 'Cuentas', required: true },
  first_name:  { type: String, required: true, trim: true },
  last_name:   { type: String, required: true, trim: true },
  national_id: { type: Number, required: true },
  height_cm:   { type: Number, required: true, min: 30, max: 300 },
  weight_kg:   { type: Number, required: true, min: 1, max: 500 },
  country:     { type: String, required: true }
}, { timestamps: true });

userSchema.index({ idAccount: 1, national_id: 1 }, { unique: true });

const Users = mongoose.models.Usuarios || mongoose.model('Usuarios', userSchema);

/* ---------- Dispositivos (Devices) ---------- */
const deviceSchema = new mongoose.Schema({
  idUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuarios',
    required: true
  },
  deviceName: {
    type: String,
    required: true,
    trim: true
  },
  serialNumber: {
    type: String,
    required: true,
    trim: true
  },
  firmwareVersion: {
    type: String,
    default: "1.0.0"
  },
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  registeredAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

deviceSchema.index({ idUser: 1, serialNumber: 1 }, { unique: true });

const Devices = mongoose.models.Devices || mongoose.model('Devices', deviceSchema);

/* ---------- Posture Readings ---------- */
const postureReadingSchema = new mongoose.Schema({
  idDevice: { type: mongoose.Schema.Types.ObjectId, ref: 'Devices', required: true },
  tilt_deg: { type: Number, required: true },
  velocity_m_s: { type: Number, required: true },
  recorded_at: { type: Date, default: Date.now },
  uploaded: { type: Boolean, default: false },
  uploaded_at: { type: Date, default: null }
}, { timestamps: true });

postureReadingSchema.index({ idDevice: 1, recorded_at: -1 });

const PostureReadings = mongoose.models.PostureReadings || mongoose.model('PostureReadings', postureReadingSchema);

/* ---------- Analysis Results ---------- */
const analysisResultSchema = new mongoose.Schema({
  idDevice: { type: mongoose.Schema.Types.ObjectId, ref: 'Devices', required: true },
  idReading: { type: mongoose.Schema.Types.ObjectId, ref: 'PostureReadings', required: true },
  analysisType: { type: String, required: true, trim: true },
  result: {
    value: { type: Number, required: true },
    unit: { type: String, required: true, trim: true },
    status: { type: String, required: true, trim: true }
  },
  comments: { type: String, trim: true },
  analyzed_at: { type: Date, default: Date.now }
}, { timestamps: true });

analysisResultSchema.index({ idReading: 1, analysisType: 1 }, { unique: true });

const AnalysisResults = mongoose.models.AnalysisResults || mongoose.model('AnalysisResults', analysisResultSchema);

/* ---------------------------
   Middleware: verificarToken
   --------------------------- */
function verificarToken(req, res, next) {
  try {
    const header = req.headers['authorization'];
    const token = header ? header.split(' ')[1] : null;
    if (!token) {
      return res.status(403).json({ ok: false, message: 'Token no proporcionado' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ ok: false, message: 'Token inválido o expirado' });
      }
      req.usuario = decoded;
      next();
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Error verificando token', error: err.message });
  }
}

/* ---------------------------
   RUTAS PÚBLICAS / LOGIN
   --------------------------- */

// Verificación simple de API
app.get('/', (req, res) => {
  res.json({ ok: true, message: 'API funcionando' });
});

// LOGIN de usuario
app.post('/api/login', async (req, res) => {
  try {
    const { correo, contraseña } = req.body;
    if (!correo || !contraseña) {
      return res.status(400).json({ ok: false, message: 'Correo y contraseña son requeridos' });
    }

    const cuenta = await Cuentas.findOne({ correo });
    if (!cuenta) {
      return res.status(404).json({ ok: false, message: 'Cuenta no encontrada' });
    }

    const valida = await cuenta.compararContraseña(contraseña);
    if (!valida) {
      return res.status(401).json({ ok: false, message: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      { id: cuenta._id, correo: cuenta.correo, plan: cuenta.plan },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const usuario = await Users.findOne({ idAccount: cuenta._id }).select('_id');

    res.json({
      ok: true,
      message: 'Inicio de sesión exitoso',
      token,
      cuenta: {
        id: cuenta._id,
        nombreCuenta: cuenta.nombreCuenta,
        plan: cuenta.plan
      },
      userId: usuario?._id || null
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al iniciar sesión', error: err.message });
  }
});

// LOGIN para dispositivo (gateway)
app.post('/api/device/login', async (req, res) => {
  try {
    const { serialNumber, password } = req.body;

    if (!serialNumber || !password) {
      return res.status(400).json({ ok: false, message: 'Faltan datos' });
    }

    const device = await Devices.findOne({ serialNumber });
    if (!device) {
      return res.status(404).json({ ok: false, message: 'Dispositivo no encontrado' });
    }

    if (password !== DEVICE_KEY) {
      return res.status(401).json({ ok: false, message: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      { deviceId: device._id, serial: device.serialNumber },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ ok: true, token });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error en login del dispositivo', error: err.message });
  }
});

/* ---------------------------
   RUTAS PROTEGIDAS (ejemplo)
   --------------------------- */
app.get('/api/protegido', verificarToken, (req, res) => {
  res.json({ ok: true, message: 'Acceso concedido', data: req.usuario });
});

/* ---------------------------
   RUTAS CUENTAS
   --------------------------- */

// Crear cuenta
app.post('/api/cuentas', async (req, res) => {
  try {
    const { nombreCuenta, correo, contraseña, plan } = req.body;

    if (!nombreCuenta || !correo || !contraseña) {
      return res.status(400).json({ ok: false, message: 'Faltan campos requeridos' });
    }

    const nueva = new Cuentas({ nombreCuenta, correo, contraseña, plan });
    const guardada = await nueva.save();

    const { contraseña: _omit, ...cuentaSinClave } = guardada.toObject();
    res.status(201).json({ ok: true, data: cuentaSinClave });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ ok: false, message: 'El correo ya existe' });
    }
    res.status(500).json({ ok: false, message: 'Error al crear la cuenta', error: err.message });
  }
});

// Listar cuentas (paginadas)
app.get('/api/cuentas', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const cuentas = await Cuentas.find({}, '-contraseña')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Cuentas.countDocuments();

    res.json({
      ok: true,
      data: cuentas,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al listar cuentas', error: err.message });
  }
});

// Obtener cuenta por ID
app.get('/api/cuentas/:id', async (req, res) => {
  try {
    const cuenta = await Cuentas.findById(req.params.id, '-contraseña');
    if (!cuenta) return res.status(404).json({ ok: false, message: 'Cuenta no encontrada' });
    res.json({ ok: true, data: cuenta });
  } catch (err) {
    res.status(400).json({ ok: false, message: 'ID inválido', error: err.message });
  }
});

// Actualizar cuenta
app.put('/api/cuentas/:id', async (req, res) => {
  try {
    const { nombreCuenta, correo, plan } = req.body;
    const actualizada = await Cuentas.findByIdAndUpdate(
      req.params.id,
      { nombreCuenta, correo, plan },
      { new: true, runValidators: true, select: '-contraseña' }
    );
    if (!actualizada) return res.status(404).json({ ok: false, message: 'Cuenta no encontrada' });
    res.json({ ok: true, data: actualizada });
  } catch (err) {
    res.status(400).json({ ok: false, message: 'Error al actualizar cuenta', error: err.message });
  }
});

// Actualizar contraseña
app.patch('/api/cuentas/:id/contraseña', async (req, res) => {
  try {
    const { contraseña } = req.body;
    if (!contraseña || contraseña.length < 6) {
      return res.status(400).json({ ok: false, message: 'La contraseña es obligatoria (mínimo 6 caracteres)' });
    }

    const cuenta = await Cuentas.findById(req.params.id);
    if (!cuenta) return res.status(404).json({ ok: false, message: 'Cuenta no encontrada' });

    cuenta.contraseña = contraseña;
    await cuenta.save();

    res.json({ ok: true, message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(400).json({ ok: false, message: 'Error al actualizar contraseña', error: err.message });
  }
});

// Eliminar cuenta
app.delete('/api/cuentas/:id', async (req, res) => {
  try {
    const eliminada = await Cuentas.findByIdAndDelete(req.params.id);
    if (!eliminada) return res.status(404).json({ ok: false, message: 'Cuenta no encontrada' });
    res.json({ ok: true, message: 'Cuenta eliminada correctamente' });
  } catch (err) {
    res.status(400).json({ ok: false, message: 'Error al eliminar cuenta', error: err.message });
  }
});

/* ---------------------------
   RUTAS USUARIOS
   --------------------------- */

// Crear usuario
app.post('/api/usuarios', async (req, res) => {
  try {
    const { idAccount, first_name, last_name, national_id, height_cm, weight_kg, country } = req.body;

    if (!idAccount || !first_name || !last_name || !national_id || !height_cm || !weight_kg || !country) {
      return res.status(400).json({ ok: false, message: 'Faltan campos requeridos' });
    }

    const cuenta = await Cuentas.findById(idAccount);
    if (!cuenta) {
      return res.status(400).json({ ok: false, message: 'idAccount inválido (no existe la cuenta)' });
    }

    const nuevo = new Users({ idAccount, first_name, last_name, national_id, height_cm, weight_kg, country });
    const guardado = await nuevo.save();

    res.status(201).json({ ok: true, data: guardado });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        ok: false,
        message: 'Usuario ya existe en esta cuenta (national_id duplicado)',
        error: err.message
      });
    }
    res.status(500).json({ ok: false, message: 'Error al crear usuario', error: err.message });
  }
});

// Listar usuarios (paginado)
app.get('/api/usuarios/listar', async (req, res) => {
  try {
    const { page = 1, limit = 20, accountId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter = {};
    if (accountId) filter.idAccount = accountId;

    const resultados = await Users.find(filter)
      .populate('idAccount', 'nombreCuenta correo plan')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Users.countDocuments(filter);
    res.json({ ok: true, data: resultados, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al listar usuarios', error: err.message });
  }
});

// Obtener usuario por ID
app.get('/api/usuarios/:id', async (req, res) => {
  try {
    const usuario = await Users.findById(req.params.id).populate('idAccount', 'nombreCuenta correo plan');
    if (!usuario) return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    res.json({ ok: true, data: usuario });
  } catch (err) {
    res.status(400).json({ ok: false, message: 'ID inválido', error: err.message });
  }
});

// Actualizar usuario
app.put('/api/usuarios/:id', async (req, res) => {
  try {
    const { first_name, last_name, height_cm, weight_kg, country } = req.body;
    const actualizado = await Users.findByIdAndUpdate(
      req.params.id,
      { first_name, last_name, height_cm, weight_kg, country },
      { new: true, runValidators: true }
    );
    if (!actualizado) return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    res.json({ ok: true, data: actualizado });
  } catch (err) {
    res.status(400).json({ ok: false, message: 'Error al actualizar usuario', error: err.message });
  }
});

// Eliminar usuario
app.delete('/api/usuarios/:id', async (req, res) => {
  try {
    const eliminado = await Users.findByIdAndDelete(req.params.id);
    if (!eliminado) return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    res.json({ ok: true, message: 'Usuario eliminado correctamente' });
  } catch (err) {
    res.status(400).json({ ok: false, message: 'Error al eliminar usuario', error: err.message });
  }
});

/* ---------------------------
   RUTAS DEVICES
   --------------------------- */

// Crear dispositivo
app.post('/api/devices', async (req, res) => {
  try {
    const { idUser, deviceName, serialNumber, firmwareVersion, batteryLevel } = req.body;

    if (!idUser || !deviceName || !serialNumber) {
      return res.status(400).json({ ok: false, message: 'Faltan campos requeridos (idUser, deviceName, serialNumber)' });
    }

    const usuario = await Users.findById(idUser);
    if (!usuario) {
      return res.status(400).json({ ok: false, message: 'idUser inválido (usuario no existe)' });
    }

    const nuevo = new Devices({
      idUser,
      deviceName,
      serialNumber,
      firmwareVersion,
      batteryLevel
    });

    const guardado = await nuevo.save();
    res.status(201).json({ ok: true, data: guardado });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        ok: false,
        message: 'El dispositivo ya existe para este usuario o el serialNumber está duplicado',
        error: err.message
      });
    }

    res.status(500).json({
      ok: false,
      message: 'Error al crear dispositivo',
      error: err.message
    });
  }
});

// Listar dispositivos
app.get('/api/devices', async (req, res) => {
  try {
    const { idUser } = req.query;
    const filter = idUser ? { idUser } : {};

    const devices = await Devices.find(filter).populate('idUser', 'first_name last_name country');
    res.json({ ok: true, data: devices });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al listar dispositivos', error: err.message });
  }
});

// Actualizar dispositivo
app.put('/api/devices/:id', async (req, res) => {
  try {
    const { deviceName, firmwareVersion, batteryLevel, isActive } = req.body;
    const actualizado = await Devices.findByIdAndUpdate(
      req.params.id,
      { deviceName, firmwareVersion, batteryLevel, isActive },
      { new: true, runValidators: true }
    );

    if (!actualizado) {
      return res.status(404).json({ ok: false, message: 'Dispositivo no encontrado' });
    }

    res.json({ ok: true, data: actualizado });
  } catch (err) {
    res.status(400).json({ ok: false, message: 'Error al actualizar dispositivo', error: err.message });
  }
});

// Eliminar dispositivo
app.delete('/api/devices/:id', async (req, res) => {
  try {
    const eliminado = await Devices.findByIdAndDelete(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ ok: false, message: 'Dispositivo no encontrado' });
    }
    res.json({ ok: true, message: 'Dispositivo eliminado correctamente' });
  } catch (err) {
    res.status(400).json({ ok: false, message: 'Error al eliminar dispositivo', error: err.message });
  }
});

/* ---------------------------
   RUTAS POSTURE READINGS
   --------------------------- */

// Crear lectura de postura
app.post('/api/readings', async (req, res) => {
  try {
    const { idDevice, tilt_deg, velocity_m_s, uploaded } = req.body;

    if (!idDevice || tilt_deg == null || velocity_m_s == null) {
      return res.status(400).json({ ok: false, message: 'Faltan campos requeridos: idDevice, tilt_deg, velocity_m_s' });
    }

    const device = await Devices.findById(idDevice);
    if (!device) {
      return res.status(400).json({ ok: false, message: 'idDevice inválido (dispositivo no existe)' });
    }

    const nuevo = new PostureReadings({
      idDevice,
      tilt_deg,
      velocity_m_s,
      uploaded: !!uploaded,
      uploaded_at: uploaded ? new Date() : null
    });

    const guardado = await nuevo.save();
    res.status(201).json({ ok: true, data: guardado });
  } catch (err) {
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      return res.status(400).json({ ok: false, message: 'Error de validación', error: err.message });
    }
    res.status(500).json({ ok: false, message: 'Error al crear lectura', error: err.message });
  }
});

// Listar lecturas
app.get('/api/readings', async (req, res) => {
  try {
    const { idDevice, from, to, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (idDevice) filter.idDevice = idDevice;
    if (from || to) filter.recorded_at = {};
    if (from) filter.recorded_at.$gte = new Date(from);
    if (to) filter.recorded_at.$lte = new Date(to);

    const skip = (Number(page) - 1) * Number(limit);

    const lecturas = await PostureReadings.find(filter)
      .populate('idDevice', 'deviceName serialNumber')
      .sort({ recorded_at: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await PostureReadings.countDocuments(filter);

    res.json({ ok: true, data: lecturas, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Error al listar lecturas', error: err.message });
  }
});

// Obtener lectura por ID
app.get('/api/readings/:id', async (req, res) => {
  try {
    const lectura = await PostureReadings.findById(req.params.id).populate('idDevice', 'deviceName serialNumber');
    if (!lectura) return res.status(404).json({ ok: false, message: 'Lectura no encontrada' });
    res.json({ ok: true, data: lectura });
  } catch (err) {
    res.status(400).json({ ok: false, message: 'ID inválido', error: err.message });
  }
});

app.post('/api/device/readings', verificarToken, async (req, res) => {
  try {
    // El token del dispositivo fue firmado en /api/device/login como:
    // jwt.sign({ deviceId: device._id, serial: device.serialNumber }, ...)
    const deviceId = req.usuario?.deviceId;
    if (!deviceId) {
      return res.status(401).json({ ok: false, message: 'Token de dispositivo inválido o no es token de dispositivo' });
    }

    const { tilt_deg, velocity_m_s } = req.body;
    if (tilt_deg == null) {
      return res.status(400).json({ ok: false, message: 'tilt_deg es requerido' });
    }

    const nuevo = new PostureReadings({
      idDevice: deviceId,
      tilt_deg: Number(tilt_deg),
      velocity_m_s: velocity_m_s != null ? Number(velocity_m_s) : 0,
      recorded_at: new Date()
    });

    const guardado = await nuevo.save();
    return res.status(201).json({ ok: true, data: guardado });
  } catch (err) {
    console.error('Error en /api/device/readings:', err);
    return res.status(500).json({ ok: false, message: 'Error al crear lectura desde dispositivo', error: err.message });
  }
});

// --- RUTA PARA OBTENER PROMEDIO DE INCLINACIÓN POR USUARIO ---
app.get('/api/users/:id/tilt-average', async (req, res) => {
  try {
    const userId = req.params.id;
    const limit = Math.min(Number(req.query.limit) || 100, 1000); // default 100, tope 1000
    const hours = req.query.hours ? Number(req.query.hours) : null;

    // Obtener dispositivos del usuario
    const devices = await Devices.find({ idUser: userId }).select('_id');
    if (!devices.length) {
      return res.json({ ok: true, data: { average_tilt: null, count: 0 } });
    }
    const deviceIds = devices.map(d => d._id);

    const filter = { idDevice: { $in: deviceIds } };
    if (hours) {
      filter.recorded_at = { $gte: new Date(Date.now() - hours * 3600 * 1000) };
    }

    // Tomamos las últimas `limit` lecturas
    const readings = await PostureReadings.find(filter).sort({ recorded_at: -1 }).limit(limit);

    const count = readings.length;
    if (!count) {
      return res.json({ ok: true, data: { average_tilt: null, count: 0 } });
    }

    const sum = readings.reduce((acc, r) => acc + Number(r.tilt_deg || 0), 0);
    const average = sum / count;

    return res.json({
      ok: true,
      data: {
        average_tilt: average,
        count,
        from: readings[count - 1]?.recorded_at || null,
        to: readings[0]?.recorded_at || null
      }
    });
  } catch (err) {
    console.error('Error en /api/users/:id/tilt-average:', err);
    return res.status(500).json({ ok: false, message: 'Error calculando promedio de inclinación', error: err.message });
  }
});

/* ---------------------------
   RUTAS ANALYSIS RESULTS
   --------------------------- */

app.post('/api/analysis', async (req, res) => {
  try {
    const {
      idDevice,
      idReading,
      analysisType,
      resultValue,
      resultUnit,
      status,
      comments,
      analyzed_at
    } = req.body;

    if (!idDevice || !idReading || !analysisType || resultValue == null || !resultUnit || !status) {
      return res.status(400).json({ ok: false, message: 'Faltan campos requeridos' });
    }

    const lectura = await PostureReadings.findById(idReading);
    if (!lectura) return res.status(400).json({ ok: false, message: 'idReading inválido (no existe la lectura)' });

    const dispositivo = await Devices.findById(idDevice);
    if (!dispositivo) return res.status(400).json({ ok: false, message: 'idDevice inválido (no existe el dispositivo)' });

    if (String(lectura.idDevice) !== String(idDevice)) {
      return res.status(400).json({ ok: false, message: 'La lectura no pertenece al dispositivo indicado' });
    }

    const nuevo = new AnalysisResults({
      idDevice,
      idReading,
      analysisType,
      result: {
        value: resultValue,
        unit: resultUnit,
        status
      },
      comments,
      analyzed_at: analyzed_at ? new Date(analyzed_at) : undefined
    });

    const guardado = await nuevo.save();

    res.status(201).json({ ok: true, data: guardado });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        ok: false,
        message: 'Ya existe un análisis del mismo tipo para esa lectura',
        error: err.message
      });
    }
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      return res.status(400).json({ ok: false, message: 'Error de validación', error: err.message });
    }
    res.status(500).json({
      ok: false,
      message: 'Error al crear análisis',
      error: err.message
    });
  }
});

app.get('/api/analysis', async (req, res) => {
  try {
    const { idReading, idDevice, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (idReading) filter.idReading = idReading;
    if (idDevice) filter.idDevice = idDevice;

    const skip = (Number(page) - 1) * Number(limit);

    const resultados = await AnalysisResults.find(filter)
      .populate({ path: 'idReading', select: 'tilt_deg velocity_m_s recorded_at' })
      .populate({ path: 'idDevice', select: 'deviceName serialNumber' })
      .sort({ analyzed_at: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await AnalysisResults.countDocuments(filter);

    res.json({ ok: true, data: resultados, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    res.status(500).json({
      ok: false,
      message: 'Error al listar análisis',
      error: err.message
    });
  }
});

/* ---------------------------
   INICIAR SERVIDOR (solo una vez, al final)
   --------------------------- */
app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
