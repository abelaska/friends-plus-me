package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"path"
	"log"
	"strings"
	"golang.org/x/net/context"
	"google.golang.org/appengine"
)

func ServerError(ctx context.Context, w http.ResponseWriter, err error, format string, v ...interface{}) {
	Error(ctx, w, err, http.StatusInternalServerError, format, v...)
}

func Debug(ctx context.Context, format string, v ...interface{}) {
	log.Printf(format, v...)
}

func Error(ctx context.Context, w http.ResponseWriter, err error, code int, format string, v ...interface{}) {
	log.Printf(format, v...)

	response := Response{
		Success: false,
		Error: &ResponseError{
			Message: err.Error(),
		},
	}

	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(response)
}

func extractRequest(w http.ResponseWriter, r *http.Request) (ctx context.Context, request *Request, err error) {
	ctx = appengine.NewContext(r)

	clientToken := r.Header.Get("X-Client-Token")
	clientTokenValid := clientToken == cfg.ClientToken

	if !clientTokenValid {
		err = errors.New("Forbidden")
		http.Error(w, "", http.StatusForbidden)
		return
	}

	if r.Method != http.MethodPost {
		err = errors.New("Method not allowed")
		http.Error(w, "", http.StatusMethodNotAllowed)
		return
	}

  req := &Request{}
	if _, err = bodyToObject(r.Body, (int64)(cfg.MaxRequestSize), req); err != nil {
		Error(ctx, w, err, http.StatusBadRequest, "Failed to deserialize request: %#v", err)
		return
	}
  request = req

	return
}

func extractFilename(request Request, w http.ResponseWriter, r *http.Request) (fn string, err error) {
  ctx := appengine.NewContext(r)

  fn = path.Clean(request.Filename)

	if fn == "" || !strings.HasPrefix(fn, "/gs/"+cfg.BucketName+"/") {
		err = errors.New("Invalid filename: " + fn)
		Error(ctx, w, err, http.StatusBadRequest, "Invalid filename: %v", err)
		return
	}

	return
}

func sendResponse(ctx context.Context, w http.ResponseWriter, response interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(response)
}