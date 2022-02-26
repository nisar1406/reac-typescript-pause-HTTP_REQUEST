interface UploadFileResponse {
  success: Boolean;
  message: String;
};

class FileUpload {
  private file: File;

  constructor(file: File) {
    this.file = file;
  };

  getFormData(): FormData {
    const formData = new FormData();
    formData.append('file', this.file);
    return formData;
  };

  async uploadFile(): Promise<UploadFileResponse> {
    try {
    const data = await fetch('http://localhost:9000/file/upload', {
      method: 'POST',
      body: this.getFormData()
    });
    const response = await data.json();

    return {
      success: response?.success,
      message: response?.message
    }
  } catch(error) {
    return {
      success: false,
      message: "Something went wrong please try again."
    }
  }
  };
};


export default FileUpload;
