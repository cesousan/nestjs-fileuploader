import Joi = require('@hapi/joi');

export default Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number(), // .default(3000),
});
