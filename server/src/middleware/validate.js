const ApiError = require("../utils/apiError");

function validate(schema, source = "body") {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      const details = error.details.map((item) => ({
        field: item.path.join("."),
        message: item.message,
      }));
      return next(new ApiError(422, "VALIDATION_ERROR", "Validation failed", details));
    }
    req[source] = value;
    next();
  };
}

module.exports = validate;
