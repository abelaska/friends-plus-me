package main

import (
  "bytes"
  "image"
  _ "image/gif"
  _ "image/jpeg"
  _ "image/png"
)

func imageDimensions(body []byte) (width int, height int, err error) {
  var m image.Config
  height = -1
  width = -1
  m, _, err = image.DecodeConfig(bytes.NewReader(body))
  if err != nil {
    return
  }
  height = m.Height
  width = m.Width
  return
}

var GIF_ID = []byte("GIF")
var ANIMATED_GIF_FRAME_ID = []byte{0x00, 0x21, 0xf9}
var GIF_MIN_LEN = len(GIF_ID) + len(ANIMATED_GIF_FRAME_ID)

// http://www.matthewflickinger.com/lab/whatsinagif/bits_and_bytes.asp

// curl -v -X POST -H "X-Client-Token: XXX" -d '{"url":"https://www.google.cz/logos/doodles/2016/2016-doodle-fruit-games-day-10-5115052026757120-hp.gif"}' localhost:8181/fetch
// curl -v -X POST -H "X-Client-Token: XXX" -d '{"url":"https://upload.wikimedia.org/wikipedia/commons/c/ce/Transparent.gif"}' localhost:8181/fetch

func detectAnimatedGifFramesCount(body []byte) (count int) {
  count = 0

  if len(body) < GIF_MIN_LEN || !bytes.Equal(body[0:3], GIF_ID) {
    return
  }

  count = bytes.Count(body, ANIMATED_GIF_FRAME_ID)

  return
}
