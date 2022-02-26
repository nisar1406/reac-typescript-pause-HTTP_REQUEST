class FileSizeValidator {

  private FILE_SIZE_IN_BYTES: Number;
  private MAX_FILE_SIZE: Number = 5242880; // 5MB

  constructor(fileSize: Number) {
    this.FILE_SIZE_IN_BYTES = fileSize;
  };

  validateFileSize(): Boolean {
    return this.FILE_SIZE_IN_BYTES <= this.MAX_FILE_SIZE;
  };

  getErrorMessage(): String {
    return "Maximum file size should be 5MB";
  };
};

export default FileSizeValidator;
