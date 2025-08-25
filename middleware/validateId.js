// backend/middleware/validateId.js
const Joi = require('joi');

module.exports = (paramName = 'id') => (req, res, next) => {
  const schema = Joi.number().integer().positive().required();
  const { error } = schema.validate(req.params[paramName]);
  if (error) {
    return res.status(400).json({ error: `Paramètre ${paramName} invalide` });
  }
  next();
};