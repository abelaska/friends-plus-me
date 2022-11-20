package main

import (
  "time"
  "net/url"
  "net/http"
	"golang.org/x/net/context"
  "google.golang.org/appengine"
  "google.golang.org/appengine/blobstore"
	"google.golang.org/appengine/image"
)

func registerImage(ctx context.Context, fn string) (url *url.URL, err error) {
  var blobKey appengine.BlobKey
  if blobKey, err = blobstore.BlobKeyForFile(ctx, fn); err != nil {
		return
	}

  opts := image.ServingURLOptions{Secure: cfg.ServeSecuredUrls}
	url, err = image.ServingURL(ctx, blobKey, &opts)
  return
}

func registerImageCheckError(fn string, err error, ctx context.Context, w http.ResponseWriter) {
  if err != nil {
    isObjectNotFound := err.Error() == "API error 8 (images: OBJECT_NOT_FOUND)"
    if isObjectNotFound {
      Error(ctx, w, err, http.StatusNotFound, "Object %v not found. %v", fn, err)
    } else {
      ServerError(ctx, w, err, "Failed to register image(%v): %v", fn, err)
    }
  }
}

func registerHandler(w http.ResponseWriter, r *http.Request) {
  ctx, request, err0 := extractRequest(w, r)
	if err0 != nil {
		return
	}

  fn, err1 := extractFilename(*request, w, r)
  if err1 != nil {
		return
	}

  var url *url.URL
  var err error

  tryNo := 0
  maxTries := 8

  for ;; {
    url, err = registerImage(ctx, fn)

    Debug(ctx, "Register try #%v fn:%v url:%v err:'%v'", tryNo + 1, fn, url, err)

    if url != nil || err == nil || err.Error() != "API error 1 (images: UNSPECIFIED_ERROR)" {
      break
    }

    tryNo = tryNo + 1

    if tryNo < maxTries {
      time.Sleep(time.Duration(250 + 250 * tryNo) * time.Millisecond)      
    } else {
      break
    }
  }

  if err != nil {
    registerImageCheckError(fn, err, ctx, w)
    return    
  }

	sendResponse(ctx, w, Response{Success: true, Filename: fn, Url: url.String()})
	return
}