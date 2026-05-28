const express = require('express');
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ extended: false }));
app.use(express.urlencoded({ extended: true }));
app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads")
  )
);
// Serve uploaded resume files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => res.send('API Running'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/seeker', require('./routes/seeker'));
app.use('/api/employer', require('./routes/employer'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/jobs', require('./routes/jobs'));

// Multer / server error handler
app.use((err, req, res, next) => {

  if (err) {

    if (err.code === 'LIMIT_FILE_SIZE') {

      if (req.file?.fieldname === 'profileImage') {

        return res.status(400).json({
          message: 'Profile image size must be less than 5MB'
        });

      }

      if (req.file?.fieldname === 'resume') {

        return res.status(400).json({
          message: 'Resume file size must be less than 5MB'
        });

      }

      return res.status(400).json({
        message: 'File size exceeds limit'
      });

    }

    return res.status(400).json({
      message: err.message || 'Upload error'
    });

  }

  next();

});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));