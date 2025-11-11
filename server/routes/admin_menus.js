const express = require('express');
const router = express.Router();
const Menu = require('../models/menu');
const auth = require('../middleware/auth');
const { validate, menuSchema } = require('../middleware/validation');
const { sanitizeMiddleware } = require('../middleware/sanitize');
const { adminActionLimiter } = require('../middleware/rateLimits');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Configuration multer pour l'upload d'images
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../maisonpardailhe/img/menus');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'menu-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Utilisez JPG, PNG ou WebP.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  }
});

router.get('/', auth, wrap(async (req, res) => {
  const items = await Menu.getAll(false);
  res.json(items);
}));

router.post('/', 
  auth, 
  adminActionLimiter,
  sanitizeMiddleware(['name', 'description'], false),
  validate(menuSchema),
  wrap(async (req, res) => {
    const adminId = req.session?.admin?.id;
  const Admin = require('../models/admin');
  const current = await Admin.getById(adminId);
  if (!current || !current.can_edit_menus) return res.status(403).json({ message: 'Forbidden' });
  const { name, description, price_cents, is_quote, stock, visible_on_menu, available } = req.body;
  const id = await Menu.create({
    name,
    description: description || '',
    price_cents,
    is_quote: Boolean(is_quote),
    stock,
    visible_on_menu: visible_on_menu === undefined ? 1 : (visible_on_menu ? 1 : 0),
    available: available === undefined ? 1 : (available ? 1 : 0)
  });
  res.status(201).json({ id });
}));

router.put('/:id', 
  auth, 
  adminActionLimiter,
  sanitizeMiddleware(['name', 'description'], false),
  wrap(async (req, res) => {
    const adminId = req.session?.admin?.id;
  const Admin = require('../models/admin');
  const current = await Admin.getById(adminId);
  if (!current || !current.can_edit_menus) return res.status(403).json({ message: 'Forbidden' });
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id' });
  const affected = await Menu.update(id, req.body);
  res.json({ affected });
}));

router.delete('/:id', 
  auth, 
  adminActionLimiter,
  wrap(async (req, res) => {
    const adminId = req.session?.admin?.id;
  const Admin = require('../models/admin');
  const current = await Admin.getById(adminId);
  if (!current || !current.can_edit_menus) return res.status(403).json({ message: 'Forbidden' });
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ message: 'Invalid id' });
  const affected = await Menu.delete(id);
  res.json({ affected });
}));

// Route pour uploader une image de menu
router.post('/:id/upload-image',
  auth,
  adminActionLimiter,
  wrap(async (req, res, next) => {
    const adminId = req.session?.admin?.id;
    const Admin = require('../models/admin');
    const current = await Admin.getById(adminId);
    if (!current || !current.can_edit_menus) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  }),
  upload.single('image'),
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id' });
    
    if (!req.file) {
      return res.status(400).json({ message: 'Aucune image fournie' });
    }

    // Construire l'URL relative de l'image
    const imageUrl = `/img/menus/${req.file.filename}`;
    
    // Récupérer l'ancienne image pour la supprimer
    const menu = await Menu.getById(id);
    const oldImageUrl = menu?.image_url;
    
    // Mettre à jour le menu avec la nouvelle image
    await Menu.update(id, { image_url: imageUrl });
    
    // Supprimer l'ancienne image si elle existe
    if (oldImageUrl && oldImageUrl.startsWith('/img/menus/')) {
      try {
        const oldImagePath = path.join(__dirname, '../../maisonpardailhe', oldImageUrl);
        await fs.unlink(oldImagePath);
      } catch (err) {
        // Ignorer si le fichier n'existe pas
      }
    }
    
    res.json({ success: true, image_url: imageUrl });
  })
);

// Route pour supprimer l'image d'un menu
router.delete('/:id/image',
  auth,
  adminActionLimiter,
  wrap(async (req, res) => {
    const adminId = req.session?.admin?.id;
    const Admin = require('../models/admin');
    const current = await Admin.getById(adminId);
    if (!current || !current.can_edit_menus) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id' });
    
    const menu = await Menu.getById(id);
    if (!menu) return res.status(404).json({ message: 'Menu introuvable' });
    
    const imageUrl = menu.image_url;
    
    // Supprimer l'image du disque
    if (imageUrl && imageUrl.startsWith('/img/menus/')) {
      try {
        const imagePath = path.join(__dirname, '../../maisonpardailhe', imageUrl);
        await fs.unlink(imagePath);
      } catch (err) {
        // Ignorer si le fichier n'existe pas
      }
    }
    
    // Mettre à jour le menu pour retirer l'URL de l'image
    await Menu.update(id, { image_url: '' });
    
    res.json({ success: true });
  })
);

module.exports = router;
