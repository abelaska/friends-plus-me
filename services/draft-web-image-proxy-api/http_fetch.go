package main

import (
  "errors"
  "net/http"
  "encoding/json"
)

func fetchHandler(w http.ResponseWriter, r *http.Request) {
  req, err := extractRequest(w, r)
	if err != nil {
		return
	}

	// zkontrolovat ze nejsou prazdne req.Url, req.Filename
	if req.Url == "" {
    err := errors.New("Invalid request, empty fields")
    ServerError(w, err, "Invalid request, empty fields")
		return
	}

	// fetch file and upload file to GCS
  id, bucket, filename, contentType, width, height, size, isAnimatedGif, err := uploadFile(req.Url, req.Filename)
	if err != nil {
    ServerError(w, err, "Failed to fetch(%v) and store(%v) image, error: %#v", req.Url, req.Filename, err)
		return
	}

  if contentType == "" {
    err := errors.New("Unknown content type")
    ServerError(w, err, "Unknown content type")
    return    
  }

  Debug("After upload/identify id:%v bucket:%v filename:%v contentType:%v width:%v height:%v size:%v isAnimatedGif:%v err:%v", id, bucket, filename, contentType, width, height, size, isAnimatedGif, err)

  url := ""
  proxy := ""

  if req.Filename != "" {
    // register image
    prx, rsp, httpRsp, err := registerImage(id)
    if err != nil || rsp == nil {
      ServerError(w, err, "Failed to register fetched(%v) image(%#v): %#v", req.Url, filename, err)
      return
    }
    if !rsp.Success {
      w.Header().Set("Content-Type", "application/json; charset=UTF-8")
      w.WriteHeader(httpRsp.StatusCode)
      _ = json.NewEncoder(w).Encode(rsp)
      return
    }

    proxy = prx
    url = "https://storage.googleapis.com/"+bucket+"/"+filename
  }

	rsp := Response{
		Success:     true,
    Id:          id,
    Bucket:      bucket,
		Filename:    filename,
    ContentType: contentType,
    Width:       width,
    Height:      height,
    Size:        size,
		Url:         url,
    Proxy:       proxy,
    IsAniGif:    isAnimatedGif,
	}

  if req.Filename != "" {
    Debug("Successfully fetched %v stored to %v as %v", req.Url, id, url)
  } else {
    Debug("Successfully identified %v", req.Url)
  }

  sendResponse(w, rsp)
}
