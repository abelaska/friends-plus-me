package main

import (
	"fmt"
	"path"
	"errors"
	"strings"
	"net/http"
	"encoding/json"
)

func ServerError(w http.ResponseWriter, err error, format string, v ...interface{}) {
	HttpError(w, err, http.StatusInternalServerError, format, v...)
}

func HttpError(w http.ResponseWriter, err error, code int, format string, v ...interface{}) {
	Error(format, v...)

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

func extractRequest(w http.ResponseWriter, r *http.Request) (request *Request, err error) {
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
		HttpError(w, err, http.StatusBadRequest, "Failed to deserialize request: %#v", err)
		return
	}
  request = req

	return
}

func extractFilename(request Request, w http.ResponseWriter, r *http.Request) (fn string, err error) {
  fn = path.Clean(request.Filename)

	if fn == "" || !strings.HasPrefix(fn, "/gs/"+cfg.BucketName+"/") {
		err = errors.New("Invalid filename: " + fn)
		HttpError(w, err, http.StatusBadRequest, "Invalid filename: %v", err)
		return
	}

	return
}

func sendResponse(w http.ResponseWriter, response interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(response)
}

func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, "ok")
}