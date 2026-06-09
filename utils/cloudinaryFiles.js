const fs = require('fs');
const configureCloudinary = require('../config/cloudinary');

let cloudinaryClient;

const getCloudinaryClient = () => {
  if (!cloudinaryClient) {
    cloudinaryClient = configureCloudinary();
  }

  return cloudinaryClient;
};

const removeLocalFile = (filePath) => {
  if (!filePath) return;

  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    console.log('Failed to remove temporary file:', error.message);
  }
};

const uploadToCloudinary = async (file, options = {}) => {
  if (!file) return null;

  const cloudinary = getCloudinaryClient();
  const uploadOptions = {
    folder: options.folder,
    resource_type: options.resourceType || 'image',
    type: options.type || 'upload',
  };

  try {
    return await cloudinary.uploader.upload(file.path, uploadOptions);
  } finally {
    removeLocalFile(file.path);
  }
};

const buildAuthenticatedRawUrl = (publicId, format = 'pdf') => {
  if (!publicId) return '';

  const cloudinary = getCloudinaryClient();

  return cloudinary.url(publicId, {
    resource_type: 'raw',
    type: 'authenticated',
    sign_url: true,
    secure: true,
    format,
  });
};

module.exports = {
  uploadToCloudinary,
  buildAuthenticatedRawUrl,
};
