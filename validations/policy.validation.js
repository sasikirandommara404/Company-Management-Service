import Joi from "joi";

export const policyValidation = Joi.object({
  policy_type: Joi.string().required(),
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().optional(),
  rules: Joi.object().optional(),
  is_active: Joi.boolean().default(true).optional(),
  priority: Joi.number().integer().positive().optional(),
  effective_from: Joi.date().optional(),
  effective_to: Joi.date().optional(),
  created_by: Joi.string().optional(),
  approved_by: Joi.string().optional(),
  approval_date: Joi.date().optional(),
  version: Joi.alternatives()
    .try(
      Joi.number().integer().min(1),
      Joi.string().pattern(/^\d+$/).messages({
        'string.pattern.base': 'Version must be a positive integer or a string containing only digits'
      })
    )
    .default(1)
    .optional()
    .messages({
      'alternatives.match': 'Version must be a positive integer or a string containing only digits'
    })
});

export const updatePolicySchema = Joi.object({
  policy_type: Joi.string().optional(),
  name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().optional(),
  rules: Joi.object().optional(),
  is_active: Joi.boolean().optional(),
  priority: Joi.number().integer().positive().optional(),
  effective_from: Joi.date().optional(),
  effective_to: Joi.date().optional(),
  created_by: Joi.string().optional(),
  approved_by: Joi.string().optional(),
  approval_date: Joi.date().optional(),
  version: Joi.alternatives()
    .try(
      Joi.number().integer().min(1),
      Joi.string().pattern(/^\d+$/).messages({
        'string.pattern.base': 'Version must be a positive integer or a string containing only digits'
      })
    )
    .optional()
    .messages({
      'alternatives.match': 'Version must be a positive integer or a string containing only digits'
    })
});