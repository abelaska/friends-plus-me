package main

import (
	"crypto/tls"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"cloud.google.com/go/storage"
	"golang.org/x/net/context"
)

func concatCopyPreAllocate(slices [][]byte) []byte {
	var totalLen int
	for _, s := range slices {
		totalLen += len(s)
	}
	tmp := make([]byte, totalLen)
	var i int
	for _, s := range slices {
		i += copy(tmp[i:], s)
	}
	return tmp
}

func uploadFile(url, filename string) (id string, bucket string, fn string, contentType string, width int, height int, size int, isAnimatedGif bool, err error) {

	height = -1
	width = -1

	if filename != "" && strings.HasPrefix(filename, "/") {
		err = errors.New("Filename(" + filename + ") cannot be prefixed with /")
		return
	}

	if filename != "" && strings.HasSuffix(filename, "/") {
		filename = filename + RandStringBytesMaskImprSrc(64)
	}

	ctx := context.Background()

	var storageClient *storage.Client
	if storageClient, err = storage.NewClient(ctx); err != nil {
		return
	}
	defer storageClient.Close()

	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}

	hc := &http.Client{
		Transport: tr,
		Timeout:   time.Second * cfg.ImageUploadTimeout,
	}

	var req *http.Request
	if req, err = http.NewRequest("GET", url, nil); err != nil {
		return
	}
	// disguise as a firefox
	req.Header.Add("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/603.2.4 (KHTML, like Gecko)")

	var f *http.Response

	tryNo := 0
	maxTries := 8

	for {
		if f, err = hc.Do(req); err != nil {
			return
		}
		defer f.Body.Close()

		Debug("Fetch try #%v url:%v err:'%v'", tryNo+1, url, err)

		// failover only on http status 404
		if f.StatusCode != 404 {
			break
		}

		tryNo = tryNo + 1

		if tryNo < maxTries {
			time.Sleep(time.Duration(500+500*tryNo) * time.Millisecond)
		} else {
			break
		}
	}

	if f.StatusCode != 200 {
		err = errors.New(fmt.Sprintf("File not found(%v)", f.StatusCode))
		return
	}

	// get file size from header content-length
	length, _ := strconv.Atoi(f.Header.Get("Content-Length"))
	size = int(length)

	// Debug("length:%v size:%v", length, size)
	// for k, v := range f.Header {
	//   Debug("header:%v %v", k, v)
	// }

	var w *storage.Writer = nil

	readed := 0
	written := 0
	gifFrames := 0
	bufferedBytes := 0
	buffer := make([]byte, 128*1024)
	lastBuffer := false
	dimensionsBuffer := make([]byte, 0)
	ignoreDimensions := false

	for {
		bufferedBytes, err = io.ReadAtLeast(f.Body, buffer, len(buffer))

		if err == io.ErrUnexpectedEOF || err == io.EOF {
			err = nil
			lastBuffer = true
		}

		// Debug("bufferedBytes:%v lastBuffer:%v", bufferedBytes, lastBuffer)

		if lastBuffer && bufferedBytes == 0 {
			return
		}

		if err != nil {
			// Debug("err:%v bufferedBytes:%v", err, bufferedBytes)
			return
		}

		if bufferedBytes == 0 {
			continue
		}

		// first chunk
		if bufferedBytes > 0 && readed == 0 {
			contentType = http.DetectContentType(buffer)
			if contentType == "application/octet-stream" {
				ct := f.Header.Get("Content-Type")
				if ct != "" {
					contentType = ct
				}
			}

			if filename != "" {
				w = storageClient.Bucket(cfg.BucketName).Object(filename).NewWriter(ctx)
				w.ContentType = contentType
				defer w.Close()
			}
		}

		if width < 0 && height < 0 && !ignoreDimensions {
			if len(dimensionsBuffer) == 0 {
				dimensionsBuffer = buffer
			} else {
				dimensionsBuffer = concatCopyPreAllocate([][]byte{dimensionsBuffer, buffer})
			}
			width, height, err = imageDimensions(dimensionsBuffer)
			if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
				ignoreDimensions = true
				err = nil
			}
		}

		readed += bufferedBytes

		if contentType == "image/gif" {
			gifFrames += detectAnimatedGifFramesCount(buffer)
		}

		// Debug("readed:%v bufferedBytes:%v len(buffer):%v written:%v contentType:%v w:%v", readed, bufferedBytes, len(buffer), written, contentType, w)

		if w == nil {
			if contentType == "image/gif" {
				if bufferedBytes < len(buffer) || readed >= 512*1024 || gifFrames > 1 {
					break
				}
			} else {
				break
			}
		} else {
			writtenStep := 0
			if bufferedBytes == len(buffer) {
				if writtenStep, err = w.Write(buffer); err != nil {
					break
				}
			} else {
				if bufferedBytes > 0 {
					if writtenStep, err = w.Write(buffer[:bufferedBytes]); err != nil {
						break
					}
				}
			}
			written += writtenStep
		}

		if lastBuffer {
			break
		}
	}

	if gifFrames > 1 {
		isAnimatedGif = true
	}

	size = written

	if w != nil {
		fn = filename
		bucket = cfg.BucketName
		id = "/gs/" + bucket + "/" + filename
	}

	return
}
