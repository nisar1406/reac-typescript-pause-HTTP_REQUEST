import React, { useState } from "react";
import swal from "sweetalert";
import { useDropzone } from "react-dropzone";
import { Button, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";

import validateFileSize from "../../service/fileValidatorService";
import ProgressBar from "../progress-bar/progressBar";

const ENDPOINTS = {
  UPLOAD: "https://pause-http-request.herokuapp.com/file/upload",
  UPLOAD_STATUS: "https://pause-http-request.herokuapp.com/file/upload-status",
  UPLOAD_REQUEST: "https://pause-http-request.herokuapp.com/file/upload-request",
};

const defaultOptions = {
  url: ENDPOINTS.UPLOAD,
  startingByte: 0,
  fileId: "",
};

const FILE_STATUS = {
  PENDING: "pending",
  UPLOADING: "uploading",
  PAUSED: "paused",
  COMPLETED: "completed",
  FAILED: "failed",
};

const UploadFiles = () => {
  const [fileSelected, setFileSelected] = useState<File>();
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [fieldId, setFieldId] = useState<string>("");
  const [fileRequest, setFileRequest] = useState<any>();
  const [showButtons, setShowButtons] = useState(false);

  // validate file size and set fileSelected
  const handleFileChange = async (fileList: Array<any>) => {
    if (!fileList) return;
    const validFileSize = await validateFileSize(fileList[0]?.size);
    if (validFileSize?.isFileValid) setFileSelected(fileList[0]);
    else alert(validFileSize?.errorMessage);
  };

  const createObject = (options:object) => {
    return {
      key: fileSelected,
      value: { request: null, options },
      status: FILE_STATUS.PENDING,
    }
  }

  // upload file
  const uploadFile = async () => {
    if (fileSelected) {
      const data = await axios({
        method: "POST",
        url: ENDPOINTS.UPLOAD_REQUEST,
        data: {
          fileName: fileSelected.name,
        },
        headers: {
          "Content-Type": "application/json",
        },
      });
      const response = data?.data;
      setFieldId(response.fileId);
      setSuccess(false);
      setLoading(true);
      setShowButtons(true);
      const options = { ...defaultOptions, ...response };
      uploadFileChunks(fileSelected, options, createObject(options));
    } else {
      showPopup("warning", "", "Please select a file", resetProgressBarFields);
    }
  };

  const uploadFileChunks = async (
    file: File,
    options: any,
    uploadResponse: any
  ) => {
    const formData = new FormData();
    const chunk = file.slice(options.startingByte);
    formData.append("chunk", chunk, file.name);
    formData.append("fileId", options.fileId);

    const req = new XMLHttpRequest();

    req.open("POST", options.url, true);
    req.setRequestHeader(
      "Content-Range",
      `bytes=${options.startingByte}-${options.startingByte + chunk.size}/${
        file.size
      }`
    );
    req.setRequestHeader("X-File-Id", options.fileId);

    req.onload = (e) => {
      // it is possible for load to be called when the request status is not 200
      // this will treat 200 only as success and everything else as failure
      if (req.status === 200) {
        onComplete(uploadResponse);
      } else {
        onError({});
      }
    };

    req.upload.onprogress = (e) => {
      const loaded = options.startingByte + e.loaded;
      onProgress(
        {
          ...uploadResponse,
          ...e,
          loaded,
          total: file.size,
          percentage: (loaded * 100) / file.size,
        },
        file
      );
    };

    req.onabort = () => onAbort(uploadResponse);

    req.ontimeout = (e) => onError(uploadResponse);

    req.onerror = (e) => onError(uploadResponse);

    uploadResponse.value.request = req;
    setFileRequest(uploadResponse);

    req.send(formData);
  };

  const onComplete = (uploadResponse: any) => {
    const fileObj = { ...uploadResponse };

    fileObj.status = FILE_STATUS.COMPLETED;

    setFileRequest(fileObj);
    showPopup(
      "success",
      "Success",
      "File Uploaded Successfully",
      resetProgressBarFields
    );
  };

  const onError = (uploadResponse: any) => {
    const fileObj = { ...uploadResponse };
    fileObj.status = FILE_STATUS.FAILED;
    setFileRequest(fileObj);
    showPopup("error", "Opps", "Something went Wrong", resetProgressBarFields);
  };

  const onAbort = (uploadResponse: any) => {
    setLoading(false);
    const fileObj = { ...uploadResponse };
    fileObj.status = FILE_STATUS.PAUSED;
    setFileRequest(fileObj);
    showPopup("warning", "", "Uploading has been paused", () => {});
  };

  const onProgress = (data: any, file: File) => {
    const fileObj = {
      ...data,
      status: FILE_STATUS.UPLOADING,
      percentage: data.percentage,
      uploadedChunkSize: data.loaded,
    };
    setFileRequest(fileObj);
  };

  const resumeFileUpload = async () => {
    if (fileSelected) {
      try {
        const { data: uploadStatusResponse } = await axios({
          method: "GET",
          url: `${ENDPOINTS.UPLOAD_STATUS}?fileName=${fileSelected.name}&fileId=${fieldId}`,
        });
        showPopup(
          "success",
          "Resumed",
          "Your upload has been resumed",
          () => {}
        );
        setLoading(true);
        uploadFileChunks(
          fileSelected,
          {
            ...fileRequest?.value?.options,
            startingByte: Number(uploadStatusResponse?.totalChunkUploaded),
          },
          createObject(defaultOptions)
        );
        return;
      } catch {
        fileRequest.options.onError();
      }
    }
  };

  // show popup (success or error)
  const showPopup = (
    icon: string,
    title: string,
    message: String,
    functionCallback: Function
  ) => {
    swal({
      icon: icon,
      title: title,
      text: String(message),
    }).then(() => {
      functionCallback();
    });
  };

  // reset all state fields
  const resetProgressBarFields = () => {
    setSuccess(false);
    setLoading(false);
    setFileSelected(undefined);
    setShowButtons(false);
    setFileRequest(undefined);
  };

  const { getRootProps, getInputProps } = useDropzone({
    multiple: false,
    onDrop: (acceptedFiles) => handleFileChange(acceptedFiles),
  });

  const abortFileUpload = () => {
    if (fileRequest.value.request) {
      fileRequest.value.request.abort();
      return true;
    }
    return false;
  };

  return (
    <div className="container">
      <div className="upload-section" {...getRootProps()}>
        <p className="upload-img-text">
          {fileSelected ? fileSelected?.name : "BROWSE OR DRAG & DROP FILES"}
          {fileSelected && (
            <IconButton
              aria-label="delete"
              size="small"
              onClick={(e) => {
                abortFileUpload();
                e.stopPropagation();
                setFileSelected(undefined);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </p>
        <input type="file" {...getInputProps()} />
      </div>

      <ProgressBar
        loading={loading}
        success={success}
        handleButtonClick={uploadFile}
      />
      {showButtons && (
        <div className="play-pause-buttons">
          <Button
            size="small"
            variant="contained"
            onClick={() => abortFileUpload()}
          >
            Pause
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => resumeFileUpload()}
          >
            Resume
          </Button>
        </div>
      )}
    </div>
  );
};

export default UploadFiles;
