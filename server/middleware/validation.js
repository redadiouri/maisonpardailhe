const Joi = require('joi');

const commandeSchema = Joi.object({
  nom_complet: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .required()
    .messages({
      'string.empty': 'Le nom complet est requis',
      'string.min': 'Le nom doit contenir au moins 2 caractères',
      'string.max': 'Le nom ne peut pas dépasser 100 caractères',
      'string.pattern.base': 'Le nom contient des caractères invalides'
    }),

  email: Joi.string().trim().email().max(255).optional().allow('', null).messages({
    'string.email': "L'adresse email n'est pas valide",
    'string.max': "L'email ne peut pas dépasser 255 caractères"
  }),

  telephone: Joi.string()
    .trim()
    .pattern(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/)
    .required()
    .messages({
      'string.empty': 'Le téléphone est requis',
      'string.pattern.base': "Le numéro de téléphone n'est pas valide"
    }),

  date_retrait: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/)
    .required()
    .messages({
      'string.empty': 'La date de retrait est requise',
      'string.pattern.base': 'Format de date invalide (YYYY-MM-DD ou DD/MM/YYYY attendu)'
    }),

  creneau: Joi.string()
    .trim()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .required()
    .messages({
      'string.empty': 'Le créneau horaire est requis',
      'string.pattern.base': "Format d'heure invalide (HH:MM attendu)"
    }),

  location: Joi.string().trim().valid('roquettes', 'mairie', 'autre').required().messages({
    'string.empty': 'Le lieu de retrait est requis',
    'any.only': 'Lieu de retrait invalide'
  }),

  produit: Joi.string()
    .trim()
    .max(2000)
    .optional()
    .allow('', null)
    .when('items', {
      is: Joi.array().min(1),
      then: Joi.optional().allow('', null),
      otherwise: Joi.required().messages({
        'any.required': 'Le produit ou les items sont requis'
      })
    }),

  items: Joi.array()
    .items(
      Joi.object({
        menu_id: Joi.number().integer().positive().required(),
        qty: Joi.number().integer().min(1).max(100).required(),
        name: Joi.string().max(255).optional(),
        price_cents: Joi.number().integer().min(0).optional()
      })
    )
    .min(1)
    .optional()
    .messages({
      'array.min': 'Au moins un produit doit être sélectionné'
    }),

  remarques: Joi.string().trim().max(1000).optional().allow('', null),

  precisions: Joi.string().trim().max(1000).optional().allow('', null),

  total_cents: Joi.number().integer().min(0).optional().allow(null)
});

const menuSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required().messages({
    'string.empty': 'Le nom du menu est requis',
    'string.max': 'Le nom ne peut pas dépasser 255 caractères'
  }),

  description: Joi.string().trim().max(2000).optional().allow('', null),

  price_cents: Joi.number().integer().min(0).max(1000000).required().messages({
    'number.base': 'Le prix doit être un nombre',
    'number.min': 'Le prix ne peut pas être négatif',
    'number.max': 'Le prix est trop élevé'
  }),

  stock: Joi.number().integer().min(0).max(10000).optional().default(0).messages({
    'number.min': 'Le stock ne peut pas être négatif'
  }),

  is_quote: Joi.alternatives()
    .try(Joi.boolean(), Joi.number().valid(0, 1))
    .optional()
    .default(false),

  available: Joi.alternatives()
    .try(Joi.boolean(), Joi.number().valid(0, 1))
    .optional()
    .default(true),

  visible_on_menu: Joi.alternatives()
    .try(Joi.boolean(), Joi.number().valid(0, 1))
    .optional()
    .default(true)
});

const adminSchema = Joi.object({
  username: Joi.string().trim().alphanum().min(3).max(50).required().messages({
    'string.empty': "Le nom d'utilisateur est requis",
    'string.alphanum': "Le nom d'utilisateur ne peut contenir que des lettres et chiffres",
    'string.min': "Le nom d'utilisateur doit contenir au moins 3 caractères"
  }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.empty': 'Le mot de passe est requis',
      'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
      'string.pattern.base':
        'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
    }),

  email: Joi.string().trim().email().max(255).optional().allow('', null),

  role: Joi.string().valid('admin', 'super_admin', 'viewer').default('admin')
});

const loginSchema = Joi.object({
  username: Joi.string().trim().required().messages({
    'string.empty': "Le nom d'utilisateur est requis"
  }),

  password: Joi.string().required().messages({
    'string.empty': 'Le mot de passe est requis'
  })
});

const emailTemplateSchema = Joi.object({
  content: Joi.string().min(10).max(50000).required().messages({
    'string.empty': 'Le contenu du template est requis',
    'string.min': 'Le contenu est trop court',
    'string.max': 'Le contenu est trop long'
  })
});

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation échouée',
        details: errors
      });
    }

    req.body = value;
    next();
  };
};

module.exports = {
  validate,
  commandeSchema,
  menuSchema,
  adminSchema,
  loginSchema,
  emailTemplateSchema
};
