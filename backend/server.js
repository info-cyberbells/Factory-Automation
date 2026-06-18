const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');

// Load env variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
// const io = new Server(server, {
//   cors: {
//     origin: true,
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     credentials: true
//   }
// });
// const io = new Server(server, {
//   cors: {
//     origin: [
//       "http://localhost:3000",
//       "http://localhost:3009",
//       "http://localhost:9898",
//       "https://trackbells.com",
//       "http://trackbells.com",
//       "https://www.trackbells.com",
//       "http://www.trackbells.com"
//     ],
//     methods: ["GET", "POST", "PUT", "DELETE"],
//     credentials: true
//   }
// });

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS 
  ? process.env.CORS_ALLOWED_ORIGINS.split(',') 
  : [
      "http://localhost:3000",
      "http://localhost:3009"
    ];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Socket client connected:', socket.id);

  socket.on('join_room', (session) => {
    socket.join(session);
    console.log(`Socket ${socket.id} joined room ${session}`);
  });

  socket.on('join_org', (orgId) => {
    socket.join(`org_${orgId}`);
    console.log(`Socket ${socket.id} joined organization room org_${orgId}`);
  });

  socket.on('scan_event', (data) => {
    // data: { session, payload }
    console.log(`Scan event in session ${data.session}:`, data.payload);
    // Emit to desktop
    socket.to(data.session).emit('scan_received', data.payload);
  });

  socket.on('disconnect', () => {
    console.log('Socket client disconnected:', socket.id);
  });
});

// Middleware
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// app.use(cors({
//   origin: true,
//   credentials: true
// }));
// app.use(cors({
//   origin: [
//     "http://localhost:3000",
//     "http://localhost:3009",
//     "http://localhost:9898",
//     "https://trackbells.com",
//     "http://trackbells.com",
//     "https://www.trackbells.com",
//     "http://www.trackbells.com"
//   ],
//   credentials: true
// }));
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/gate-entry', require('./routes/gateEntryRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/production', require('./routes/productionRoutes'));
app.use('/api/store', require('./routes/storeRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/hr', require('./routes/hrRoutes'));
app.use('/api/finance', require('./routes/financeRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/organizations', require('./routes/orgRoutes'));
app.use('/api/operations', require('./routes/operationsRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'trackbells-erp-backend', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  res.status(statusCode).json({ success: false, message });
});

// Start server
const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => {
//   console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
// });
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT} (listening on all interfaces)`);
});
