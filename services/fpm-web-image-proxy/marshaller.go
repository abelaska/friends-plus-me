package main

import (
	"encoding/json"
	"io"
	"io/ioutil"
	"reflect"
)

func getPointer(v interface{}) interface{} {
	vv := reflect.ValueOf(v)
	if vv.Kind() == reflect.Ptr {
		return v
	}
	return reflect.New(vv.Type()).Interface()
}

func bodyToByteArray(buffer io.ReadCloser, maxBodySize int64) ([]byte, error) {
	defer buffer.Close()
	return ioutil.ReadAll(io.LimitReader(buffer, maxBodySize))
}

func bodyToObject(buffer io.ReadCloser, maxBodySize int64, response interface{}) (body []byte, err error) {
	obj := getPointer(response)

	if body, err = bodyToByteArray(buffer, maxBodySize); err != nil {
		return
	}

	if err = json.Unmarshal(body, obj); err != nil {
		return
	}

	return
}
