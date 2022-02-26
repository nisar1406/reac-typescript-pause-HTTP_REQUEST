interface ValidationResponse {
  isFileValid: Boolean;
  errorMessage: String;
}

const validateFileSize = async (
  fileSize: Number
): Promise<ValidationResponse> => {
  const fileSizeValidator = await (
    await import("../validators/fileSizeValidator")
  ).default;

  const validator = new fileSizeValidator(fileSize);
  const isFileValid = validator.validateFileSize();

  return {
    isFileValid,
    errorMessage: isFileValid ? "" : validator.getErrorMessage(),
  };
};

export default validateFileSize;
