package main

import ()

type Request struct {
  // format: /gs/bucket_name/object_name
	Filename  string `json:"filename,omitempty"`
	Url       string `json:"url,omitempty"`
}

type ResponseError struct {
	Message string `json:"message"`
}

type Response struct {
	Success bool `json:"success"`

  Id          string `json:"id,omitempty"`
  Bucket      string `json:"bucket,omitempty"`
	Filename    string `json:"filename,omitempty"`
  Url         string `json:"url,omitempty"`
  Proxy       string `json:"proxy,omitempty"`

  ContentType string `json:"contentType,omitempty"`
  Width       int    `json:"width,omitempty"`
  Height      int    `json:"height,omitempty"`
  Size        int    `json:"size,omitempty"`
  IsAniGif    bool   `json:"aniGif,omitempty"`

	Error *ResponseError `json:"error,omitempty"`
}