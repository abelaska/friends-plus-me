package main

import (
  "fmt"
  "time"
  "net/http"
  "encoding/json"
  "github.com/dghubble/sling"
)

var (
  _imageProxyBase *sling.Sling = nil
)

func imageProxyBase() (s *sling.Sling) {
  if _imageProxyBase == nil {
    _imageProxyBase = sling.New().Base(cfg.ImageProxyUrl).
    Set("user-agent", "FPMImageProxy").
    Set("X-Client-Token", cfg.ImageProxyToken).
    Client(&http.Client{
      Timeout: time.Second * 30,
    })
  }
  return _imageProxyBase
}

func ipImage(path string, fn string) (url string, rsp *Response, httpRsp *http.Response, err error) {

  req := &Request{
    Filename: fn,
  }

  rsp = new(Response)

  httpRsp, err = imageProxyBase().New().Post(path).BodyJSON(req).Receive(rsp, rsp)
  if err != nil {
    rsp = nil
    return
  }

  Debug("Image proxy %v httpRsp:%v err:%v rsp:%v", path, httpRsp, err, rsp)

  return rsp.Url, rsp, httpRsp, nil
}

func ipImageHandler(op string) func(http.ResponseWriter, *http.Request) {
  return func(w http.ResponseWriter, r *http.Request) {
    request, err := extractRequest(w, r)
    if err != nil {
      return
    }

    fn, err := extractFilename(*request, w, r)
    if err != nil {
      return
    }

    path := fmt.Sprintf("/%s", op)

    _, rsp, httpRsp, err := ipImage(path, fn)
    if err != nil {
      ServerError(w, err, "Failed to %s image(%v): %v", op, fn, err)
      return
    }

    if rsp.Success {
      sendResponse(w, rsp)
    } else {
      w.Header().Set("Content-Type", "application/json; charset=UTF-8")
      w.WriteHeader(httpRsp.StatusCode)
      _ = json.NewEncoder(w).Encode(rsp)
    }
  };
}

func registerImage(fn string) (url string, rsp *Response, httpRsp *http.Response, err error) {
  return ipImage("/register", fn)
}

func unregisterImage(fn string) (url string, rsp *Response, httpRsp *http.Response, err error) {
  return ipImage("/unregister", fn)
}

func registerHandler() func(http.ResponseWriter, *http.Request) {
  return ipImageHandler("register");
}

func unregisterHandler() func(http.ResponseWriter, *http.Request) {
  return ipImageHandler("unregister");
}
